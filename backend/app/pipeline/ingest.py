"""Ingest stage — video ingestion, format validation, and recording.

Provides:
- ``validate_video``: ffprobe-based codec / format / fps / duration check.
- ``convert_to_h264``: transcode any video to H.264 MP4 then assert
  the result is really H.264 (project rule 5).
- ``record_bug``: launch Playwright Chromium, reproduce a specific
  bug scenario, capture video + HAR, and convert to H.264 MP4.
- ``ingest``: top-level convenience that validates and converts.

Run standalone::

    python -m backend.app.pipeline.ingest --bug 1 --out-dir runs/demo
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

# Ensure repo root is on sys.path
_REPO_ROOT = str(Path(__file__).resolve().parents[3])
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from backend.app.pipeline.types import IngestResult  # noqa: E402

logger = logging.getLogger(__name__)

# Ensure local bin (with ffmpeg/ffprobe) is on PATH if present
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_BIN_DIR = _PROJECT_ROOT / "bin"
if _BIN_DIR.exists() and str(_BIN_DIR) not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{_BIN_DIR}{os.pathsep}{os.environ.get('PATH', '')}"


# ---------------------------------------------------------------------------
# ffprobe / ffmpeg helpers
# ---------------------------------------------------------------------------


def _run_ffprobe(path: str, *extra_args: str) -> dict[str, Any]:
    """Run ffprobe and return parsed JSON output.

    Args:
        path: Path to the media file.
        *extra_args: Additional ffprobe arguments.

    Returns:
        Parsed JSON dict from ffprobe.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If ffprobe exits with a non-zero code.
    """
    file = Path(path)
    if not file.exists():
        raise FileNotFoundError(f"Video file not found: {path}")

    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        *extra_args,
        str(file),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed (exit {result.returncode}): {result.stderr.strip()}")
    return json.loads(result.stdout)


def validate_video(path: str) -> dict[str, Any]:
    """Validate a video file using ffprobe.

    Returns metadata including codec, pixel format, fps, duration,
    and frame count.

    Args:
        path: Path to the video file.

    Returns:
        Dictionary with keys: ``codec``, ``pix_fmt``, ``width``,
        ``height``, ``fps``, ``duration``, ``nb_frames``, ``format``.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If ffprobe fails or no video stream is found.
    """
    probe = _run_ffprobe(path, "-count_frames")

    video_stream: dict[str, Any] | None = None
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            video_stream = stream
            break

    if video_stream is None:
        raise RuntimeError(f"No video stream found in {path}")

    # Parse frame rate (e.g. "30/1" -> 30.0)
    r_frame_rate = video_stream.get("r_frame_rate", "0/1")
    try:
        num, den = r_frame_rate.split("/")
        fps = float(num) / float(den) if float(den) != 0 else 0.0
    except (ValueError, ZeroDivisionError):
        fps = 0.0

    fmt = probe.get("format", {})

    metadata: dict[str, Any] = {
        "codec": video_stream.get("codec_name", "unknown"),
        "pix_fmt": video_stream.get("pix_fmt", "unknown"),
        "width": int(video_stream.get("width", 0)),
        "height": int(video_stream.get("height", 0)),
        "fps": round(fps, 2),
        "duration": float(video_stream.get("duration", fmt.get("duration", 0))),
        "nb_frames": int(video_stream.get("nb_read_frames", video_stream.get("nb_frames", 0))),
        "format": fmt.get("format_name", "unknown"),
    }

    logger.info(
        "Validated video: %s — codec=%s %dx%d @ %.1f fps, %.1fs, %d frames",
        path,
        metadata["codec"],
        metadata["width"],
        metadata["height"],
        metadata["fps"],
        metadata["duration"],
        metadata["nb_frames"],
    )

    return metadata


def convert_to_h264(
    input_path: str,
    output_path: str,
    fps: int = 30,
) -> str:
    """Convert a video file to H.264 MP4.

    Uses ffmpeg with settings optimized for SAM 3.1 ingestion:
    ``libx264``, ``yuv420p``, ``+faststart``, constant frame rate.

    Args:
        input_path: Source video file path.
        output_path: Destination MP4 path.
        fps: Target frame rate (default 30).

    Returns:
        The output path.

    Raises:
        FileNotFoundError: If the input file does not exist.
        RuntimeError: If ffmpeg fails or the output is not H.264.
    """
    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"Input video not found: {input_path}")

    dst = Path(output_path)
    dst.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-fps_mode",
        "cfr",
        "-r",
        str(fps),
        str(dst),
    ]

    logger.info("Converting to H.264: %s -> %s", input_path, output_path)
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg conversion failed (exit {result.returncode}): {result.stderr.strip()}"
        )

    # Assert the output is truly H.264 (project rule 5)
    out_meta = validate_video(output_path)
    if out_meta["codec"] != "h264":
        raise RuntimeError(
            f"Output video codec is {out_meta['codec']!r}, expected 'h264'. File: {output_path}"
        )

    logger.info(
        "H.264 conversion complete: %s (%d frames, %.1fs)",
        output_path,
        out_meta["nb_frames"],
        out_meta["duration"],
    )

    return output_path


# ---------------------------------------------------------------------------
# Top-level ingest function
# ---------------------------------------------------------------------------


async def ingest(clip_path: str, output_dir: str) -> IngestResult:
    """Validate and convert a video clip to H.264 MP4.

    This is the top-level convenience function for the ingest stage.
    It validates the source clip with ffprobe, converts it to H.264
    MP4 using ffmpeg, and returns an ``IngestResult``.

    Args:
        clip_path: Path to the source video clip.
        output_dir: Directory to write the converted output.

    Returns:
        An ``IngestResult`` with paths and metadata.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    metadata = validate_video(clip_path)

    h264_name = Path(clip_path).stem + ".mp4"
    h264_path = str(out_dir / h264_name)

    if metadata["codec"] == "h264":
        logger.info("Source is already H.264, copying: %s", clip_path)
        import shutil

        shutil.copy2(clip_path, h264_path)
    else:
        convert_to_h264(clip_path, h264_path)

    return IngestResult(
        video_path=Path(h264_path),
        fps=float(metadata.get("fps", 30.0)),
        frame_count=int(metadata.get("frame_count", 0)),
        duration_s=float(metadata.get("duration", 0.0)),
        width=int(metadata.get("width", 1280)),
        height=int(metadata.get("height", 720)),
        codec=str(metadata.get("codec", "h264")),
        raw_clip_path=Path(clip_path),
        output_dir=out_dir,
        metadata=metadata,
    )


# ---------------------------------------------------------------------------
# Bug recording with Playwright
# ---------------------------------------------------------------------------


async def record_bug(
    bug_number: int,
    output_dir: str,
    base_url: str = "http://localhost:5173",
) -> IngestResult:
    """Record a specific bug scenario using Playwright Chromium.

    Launches a headed Chromium browser, navigates to the demo app
    with ``?bug=N``, performs bug-specific interactions, records
    video and HAR, then converts the WebM recording to H.264 MP4.

    Args:
        bug_number: Bug scenario to record (1, 2, or 3).
        output_dir: Directory to store recordings and artifacts.
        base_url: Base URL of the demo application.

    Returns:
        An ``IngestResult`` with paths to the converted video and HAR.

    Raises:
        ValueError: If the bug number is not 1, 2, or 3.
    """
    if bug_number not in (1, 2, 3):
        raise ValueError(f"Bug number must be 1, 2, or 3, got {bug_number}")

    from playwright.async_api import async_playwright

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    har_path = str(out / f"bug{bug_number}.har")
    video_dir = str(out / "video")
    probe_js_path = Path(__file__).resolve().parent.parent / "probe" / "chronolens-probe.js"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            record_video_dir=video_dir,
            record_video_size={"width": 1280, "height": 720},
            record_har_path=har_path,
        )
        if probe_js_path.exists():
            await context.add_init_script(path=str(probe_js_path))

        page = await context.new_page()

        url = f"{base_url}?bug={bug_number}"
        logger.info("Recording bug %d: navigating to %s", bug_number, url)
        await page.goto(url, wait_until="networkidle")

        # Bug-specific interactions
        if bug_number == 1:
            # Bug 1: drag card-1 from "To Do" to "In Progress" quickly, wait for snapback
            await page.wait_for_timeout(500)
            card = page.locator('[data-cl="card-1"]').first
            target = page.locator('[data-cl="column-inprogress"]').first
            if await card.count() > 0 and await target.count() > 0:
                await page.drag_and_drop('[data-cl="card-1"]', '[data-cl="column-inprogress"]')
            # Wait for 800ms mock server response + snapback animation
            await page.wait_for_timeout(2000)

        elif bug_number == 2:
            # Bug 2: resize viewport to 800px width, click card to open modal trapped under navbar
            await page.set_viewport_size({"width": 800, "height": 720})
            await page.wait_for_timeout(500)
            card = page.locator('[data-cl="card-1"]').first
            if await card.count() > 0:
                await card.click()
            await page.wait_for_timeout(2000)

        elif bug_number == 3:
            # Bug 3: resize viewport to 360px width where button label clips
            await page.set_viewport_size({"width": 360, "height": 640})
            await page.wait_for_timeout(2000)

        # Extra wait for any animations to settle
        await page.wait_for_timeout(1000)

        # Extract probe logs and ground truth before closing
        probe_log = await page.evaluate("() => window.__chronolens_probe_log || []")
        ground_truth = await page.evaluate("() => window.__chronolens_ground_truth || []")

        probe_log_path = out / f"bug{bug_number}_probe_log.json"
        with open(probe_log_path, "w", encoding="utf-8") as f:
            json.dump({"probe_log": probe_log, "ground_truth": ground_truth}, f, indent=2)

        await context.close()
        await browser.close()

    # Find the recorded WebM file
    video_path_obj = Path(video_dir)
    webm_files = list(video_path_obj.glob("*.webm"))
    if not webm_files:
        raise RuntimeError(f"No WebM recording found in {video_dir}")

    webm_path = str(webm_files[0])
    h264_path = str(out / f"bug{bug_number}.mp4")

    # Convert WebM to H.264 MP4
    convert_to_h264(webm_path, h264_path)

    metadata = validate_video(h264_path)

    logger.info(
        "Bug %d recorded: video=%s har=%s",
        bug_number,
        h264_path,
        har_path,
    )

    return IngestResult(
        video_path=Path(h264_path),
        fps=float(metadata.get("fps", 30.0)),
        frame_count=int(metadata.get("frame_count", 0)),
        duration_s=float(metadata.get("duration", 0.0)),
        width=int(metadata.get("width", 1280)),
        height=int(metadata.get("height", 720)),
        codec=str(metadata.get("codec", "h264")),
        har_path=Path(har_path),
        probe_log_path=probe_log_path,
        raw_clip_path=Path(webm_path),
        output_dir=out,
        metadata=metadata,
    )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for standalone recording.

    Args:
        argv: Argument list (defaults to sys.argv[1:]).

    Returns:
        Parsed namespace with ``bug`` and ``out_dir`` attributes.
    """
    parser = argparse.ArgumentParser(
        prog="python -m backend.app.pipeline.ingest",
        description="Record a bug scenario from the ChronoLens demo app.",
    )
    parser.add_argument(
        "--bug",
        type=int,
        required=True,
        choices=[1, 2, 3],
        help="Bug number to record (1, 2, or 3).",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default="runs/demo",
        help="Output directory for recordings (default: runs/demo).",
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="http://localhost:5173",
        help="Base URL of the demo app (default: http://localhost:5173).",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = _parse_args()
    result = asyncio.run(record_bug(args.bug, args.out_dir, args.base_url))
    print("\nIngest complete:")
    print(f"  H.264 video : {result.h264_path}")
    print(f"  HAR capture : {result.har_path}")
    print(f"  Metadata    : {result.metadata}")
