"""Verify stage — multi-run verification of applied patches.

Per Section 7 of the spec:
- Runs the reproduction script 5 times on the patched build.
- Gate criteria:
  1. Original anomaly signature absent in 5 of 5 runs.
  2. Median shape-stability IoU >= 0.95 on tracked concepts.
  3. No new anomaly types appear.
  4. Playwright functional assertion passes.
- Reports stability score ("X/5 (Y%)"), not a proof.
"""

from __future__ import annotations

import http.server
import json
import logging
import os
import re
import socket
import statistics
import subprocess
import threading
from pathlib import Path
from typing import TYPE_CHECKING, Any

from backend.app.pipeline.detect import (
    compute_anomaly_signature,
    compute_translated_shape_iou,
    detect,
)
from backend.app.pipeline.ingest import convert_to_h264
from backend.app.pipeline.perceive import generate_tracks_from_probe_log
from backend.app.pipeline.reproduce import _get_heuristic_script
from backend.app.pipeline.types import PatchResult, VerifyResult
from playwright.async_api import async_playwright

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)


class EphemeralWorktreeServer:
    """Ephemeral HTTP server serving demo-app/dist from a worktree on an unused port."""

    def __init__(self, worktree_path: Path, host: str = "127.0.0.1") -> None:
        self.worktree_path = worktree_path
        self.host = host
        self.port = 0
        self.server: http.server.ThreadingHTTPServer | None = None
        self.thread: threading.Thread | None = None

    def _find_free_port(self) -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((self.host, 0))
            return s.getsockname()[1]

    def start(self) -> str:
        demo_app = self.worktree_path / "demo-app"
        dist_dir = demo_app / "dist"

        # Always build fresh dist from worktree source
        cmd = 'cmd /c "npm run build"' if os.name == "nt" else "npm run build"
        subprocess.run(
            cmd,
            cwd=demo_app,
            shell=True,
            capture_output=True,
            check=False,
        )

        if not dist_dir.exists():
            raise RuntimeError(f"Could not find or build dist directory at {dist_dir}")

        self.port = self._find_free_port()
        handler = lambda *args: http.server.SimpleHTTPRequestHandler(  # noqa: E731
            *args, directory=str(dist_dir)
        )
        self.server = http.server.ThreadingHTTPServer((self.host, self.port), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return f"http://{self.host}:{self.port}"

    def stop(self) -> None:
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception as e:
                logger.warning("Error stopping ephemeral server: %s", e)
            self.server = None


def compute_track_shape_ious(tracks_by_concept: dict[str, list[Any]]) -> list[float]:
    """Compute pairwise translated shape IoUs for all tracked concepts."""
    ious: list[float] = []
    for _concept, tracks in tracks_by_concept.items():
        for track in tracks:
            sorted_frames = sorted(track.frames.keys())
            for i in range(1, len(sorted_frames)):
                f_prev = sorted_frames[i - 1]
                f_curr = sorted_frames[i]
                if f_curr - f_prev == 1:
                    m_prev = track.frames[f_prev]
                    m_curr = track.frames[f_curr]
                    if m_prev.area > 50 and m_curr.area > 50:
                        iou = compute_translated_shape_iou(m_curr, m_prev)
                        ious.append(iou)
    return ious


async def execute_verify_run(
    script_str: str,
    target_url: str,
    run_dir: Path,
    probe_js_path: Path,
    bug_number: int | None = None,
    fps: int = 30,
) -> tuple[Path, list[dict], bool]:
    """Execute a single verification run in headless Playwright.

    Returns:
        (h264_path, probe_log, functional_assertion_passed)
    """
    run_dir.mkdir(parents=True, exist_ok=True)
    video_dir = str(run_dir / "videos")
    har_path = str(run_dir / "trace.har")

    local_vars: dict[str, Any] = {}
    exec(script_str, {}, local_vars)
    run_repro_fn = local_vars.get("run_repro")
    if not callable(run_repro_fn):
        raise ValueError("Script must define `async def run_repro(page)`")

    # Detect initial viewport from script if specified
    initial_viewport = {"width": 1280, "height": 720}
    m = re.search(
        r"set_viewport_size\(\{['\"]width['\"]:\s*(\d+),\s*['\"]height['\"]:\s*(\d+)\}\)",
        script_str,
    )
    if m:
        initial_viewport = {"width": int(m.group(1)), "height": int(m.group(2))}

    probe_log: list[dict] = []
    ground_truth: list[dict] = []
    functional_pass = True

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport=initial_viewport,
            record_video_dir=video_dir,
            record_video_size=initial_viewport,
            record_har_path=har_path,
        )

        if probe_js_path.exists():
            await context.add_init_script(path=str(probe_js_path))

        page = await context.new_page()
        await page.goto(target_url, wait_until="networkidle")

        await run_repro_fn(page)

        probe_log = await page.evaluate("() => window.__chronolens_probe_log || []")
        ground_truth = await page.evaluate("() => window.__chronolens_ground_truth || []")

        # Playwright functional assertions
        if bug_number == 1:
            # Card should remain in inprogress column (no snapback)
            in_prog_cards = await page.locator(
                '[data-cl="column-inprogress"] [data-cl^="card-"]'
            ).count()
            functional_pass = in_prog_cards > 0
        elif bug_number == 2:
            # Modal must be open and visible
            modal = page.locator('[data-cl="modal"]')
            functional_pass = await modal.count() > 0 and await modal.is_visible()
        elif bug_number == 3:
            # Add Card button text must not clip (scrollWidth <= clientWidth)
            btn = page.locator('[data-cl="add-card-btn"]').first
            if await btn.count() > 0:
                is_clipped = await btn.evaluate("el => el.scrollWidth > el.clientWidth")
                functional_pass = not is_clipped

        probe_path = run_dir / "verify_probe_log.json"
        with open(probe_path, "w", encoding="utf-8") as f:
            json.dump({"probe_log": probe_log, "ground_truth": ground_truth}, f, indent=2)

        await context.close()
        await browser.close()

    # Transcode WebM to H.264
    webm_files = list(Path(video_dir).glob("*.webm"))
    h264_path = run_dir / "verify.mp4"
    if webm_files:
        convert_to_h264(str(webm_files[0]), str(h264_path))
    else:
        h264_path.touch()

    return h264_path, probe_log, functional_pass, initial_viewport


async def verify(
    patch_result: PatchResult,
    client: MetaClient | None,
    config: PipelineConfig,
    num_runs: int = 5,
    bug_number: int | None = None,
    original_signature: set[tuple[str, str]] | None = None,
    original_anomalies: list[Any] | None = None,
    repro_script: str | None = None,
    base_url: str | None = None,
    run_dir: str | Path = "runs/verify",
) -> VerifyResult:
    """Verify applied patch across multiple execution runs against acceptance gates.

    Args:
        patch_result: Result from patch stage with worktree path.
        client: Meta client singleton.
        config: Pipeline configuration.
        num_runs: Number of runs (default 5).
        bug_number: Seeded bug number being verified.
        original_signature: Anomaly signature that was detected in the broken clip.
        original_anomalies: List of anomalies from the original broken clip.
        repro_script: Playwright script used to reproduce anomaly.
        base_url: Optional explicit base URL. If None and worktree exists, an ephemeral server is used.
        run_dir: Directory to store verification artifacts.

    Returns:
        VerifyResult with pass status, stability score, and run metrics.
    """
    orig_sig = original_signature or set()
    orig_types = {t for t, _ in orig_sig}
    if original_anomalies:
        orig_types |= {a.anomaly_type.value for a in original_anomalies}

    # Determine script
    script = repro_script
    if not script:
        hint = ", ".join(f"{t} on {c}" for t, c in orig_sig) or f"bug-{bug_number}"
        script = _get_heuristic_script(hint)

    repo_root = Path(__file__).resolve().parents[3]
    probe_js = repo_root / "backend" / "app" / "probe" / "chronolens-probe.js"
    base_out = Path(run_dir)
    base_out.mkdir(parents=True, exist_ok=True)

    server: EphemeralWorktreeServer | None = None
    target_base = base_url

    # Start ephemeral server if worktree is available and no external base_url given
    if not target_base and patch_result.worktree_path:
        server = EphemeralWorktreeServer(patch_result.worktree_path)
        try:
            target_base = server.start()
        except Exception as e:
            logger.warning("Could not launch ephemeral worktree server: %s", e)
            target_base = "http://127.0.0.1:5173"

    if not target_base:
        target_base = "http://127.0.0.1:5173"

    target_url = f"{target_base}?bug={bug_number}" if bug_number else target_base

    run_details: list[dict[str, Any]] = []
    passes = 0
    all_median_ious: list[float] = []
    all_new_anomalies: set[str] = set()

    try:
        for idx in range(1, num_runs + 1):
            run_folder = base_out / f"run_{idx}"
            _h264_path, _probe_log, functional_pass, vp = await execute_verify_run(
                script_str=script,
                target_url=target_url,
                run_dir=run_folder,
                probe_js_path=probe_js,
                bug_number=bug_number,
                fps=30,
            )

            # Analyze run results
            probe_path = run_folder / "verify_probe_log.json"
            perceive_res = generate_tracks_from_probe_log(probe_path, fps=30)
            anomalies = detect(
                perceive_res,
                config,
                viewport_size=(float(vp["width"]), float(vp["height"])),
            )
            run_sig = compute_anomaly_signature(
                anomalies, window_ms=config.detection.signature_window_ms
            )

            # Shape stability IoU across tracks
            shape_ious = compute_track_shape_ious(perceive_res.tracks)
            median_shape_iou = float(statistics.median(shape_ious)) if shape_ious else 1.0
            all_median_ious.append(median_shape_iou)

            # Anomaly checks: signature absent in run
            if bug_number == 1:
                # For race condition (Bug 1), snapback occurs after 800ms delayed response (t > 1500ms)
                sig_reappeared = any(
                    a.signature_key in orig_sig and a.t_ms > 1500 for a in anomalies
                )
            else:
                sig_reappeared = len(run_sig.intersection(orig_sig)) > 0
            new_types = {a.anomaly_type.value for a in anomalies} - orig_types
            all_new_anomalies.update(new_types)

            # Run pass gate per Section 7:
            # 1. Signature absent
            # 2. No new anomaly types
            # 3. Shape stable (median IoU >= 0.90 individual run tolerance)
            # 4. Functional assertion passes
            run_passed = (
                (not sig_reappeared)
                and (len(new_types) == 0)
                and (median_shape_iou >= 0.90)
                and functional_pass
            )

            if run_passed:
                passes += 1

            run_details.append(
                {
                    "run_index": idx,
                    "passed": run_passed,
                    "sig_reappeared": sig_reappeared,
                    "new_anomaly_types": list(new_types),
                    "median_shape_iou": round(median_shape_iou, 3),
                    "functional_pass": functional_pass,
                    "anomalies_count": len(anomalies),
                }
            )

    finally:
        if server:
            server.stop()

    overall_median_iou = float(statistics.median(all_median_ious)) if all_median_ious else 1.0
    sig_absent_in_all = all(not r["sig_reappeared"] for r in run_details)
    passed_all = (
        (passes == num_runs)
        and sig_absent_in_all
        and (len(all_new_anomalies) == 0)
        and (overall_median_iou >= 0.95)
    )

    logger.info(
        "Verification complete: %d/%d passes. Overall median IoU: %.3f. Result: %s",
        passes,
        num_runs,
        overall_median_iou,
        "PASSED" if passed_all else "FAILED",
    )

    return VerifyResult(
        passed=passed_all,
        runs=num_runs,
        passes=passes,
        signature_absent_in_all=sig_absent_in_all,
        median_shape_iou=round(overall_median_iou, 3),
        new_anomaly_types=sorted(all_new_anomalies),
        run_details=run_details,
    )
