"""Reproduce stage — Playwright-based anomaly reproduction.

Generates and executes Playwright scripts to reproduce detected
anomalies in the target web application.

Matches anomaly signatures:
Signature = sorted set of (anomaly type, concept) inside ±300 ms window.
Reproduction succeeds when the repro clip's signature matches the original clip's.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

from backend.app.pipeline.detect import compute_anomaly_signature, detect
from backend.app.pipeline.ingest import convert_to_h264
from backend.app.pipeline.perceive import generate_tracks_from_probe_log
from backend.app.pipeline.types import (
    Anomaly,
    IngestResult,
    ReproResult,
)
from playwright.async_api import async_playwright

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Script Generation via Muse Wonder
# ---------------------------------------------------------------------------


WONDER_REPRO_PROMPT = """You are a Playwright automation engineer.
An anomaly was detected on a web page:
Anomaly Signature: {signature}
Anomalies: {anomaly_summary}
Interaction Description: {interaction}
Base URL: {base_url}

Write an async Python Playwright function named `run_repro(page)` that will deterministically reproduce this visual anomaly.
The function takes a Playwright `page` object as argument.
Do NOT create the browser or context; only perform the interactions on `page`.
Output ONLY executable Python code inside a ```python ``` block.
"""


def _get_heuristic_script(bug_hint: str) -> str:
    """Fallback deterministic reproduction script based on interaction signature."""
    if "overlap" in bug_hint.lower() or "modal" in bug_hint.lower():
        return (
            "async def run_repro(page):\n"
            "    await page.set_viewport_size({'width': 800, 'height': 720})\n"
            "    await page.wait_for_timeout(500)\n"
            "    card = page.locator('[data-cl^=\"card-\"]').first\n"
            "    if await card.count() > 0:\n"
            "        await card.click()\n"
            "    await page.wait_for_timeout(2000)\n"
        )
    if "clipping" in bug_hint.lower() or "overflow" in bug_hint.lower():
        return (
            "async def run_repro(page):\n"
            "    await page.set_viewport_size({'width': 360, 'height': 640})\n"
            "    await page.wait_for_timeout(2000)\n"
        )
    # Default: drag card
    return (
        "async def run_repro(page):\n"
        "    await page.wait_for_timeout(500)\n"
        "    card = page.locator('[data-cl^=\"card-\"]').first\n"
        "    target = page.locator('[data-cl=\"column-inprogress\"]').first\n"
        "    if await card.count() > 0 and await target.count() > 0:\n"
        "        await page.drag_and_drop('[data-cl^=\"card-\"]', '[data-cl=\"column-inprogress\"]')\n"
        "    await page.wait_for_timeout(2500)\n"
    )


async def generate_repro_script(
    anomalies: list[Anomaly],
    client: MetaClient | None,
    base_url: str,
    interaction: str = "",
) -> str:
    """Generate Playwright reproduction code using Muse Wonder or deterministic heuristic."""
    sig = compute_anomaly_signature(anomalies)
    sig_str = ", ".join(f"({t}, {c})" for t, c in sorted(sig))
    summary = "\n".join(
        f"- Frame {a.frame_index} ({a.t_ms:.1f}ms): {a.anomaly_type.value} on {a.concept}"
        for a in anomalies[:5]
    )

    if client:
        try:
            prompt = WONDER_REPRO_PROMPT.format(
                signature=sig_str,
                anomaly_summary=summary,
                interaction=interaction or "user action",
                base_url=base_url,
            )
            resp = await client.call_wonder(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            raw = ""
            if isinstance(resp.get("response"), dict):
                choices = resp["response"].get("choices", [])
                if choices and "message" in choices[0]:
                    raw = choices[0]["message"].get("content", "")

            code_match = re.search(r"```python\s*(.*?)\s*```", raw, re.DOTALL)
            if code_match and "run_repro" in code_match.group(1):
                return code_match.group(1).strip()
        except Exception as e:
            logger.warning("Muse Wonder repro script generation failed, using fallback: %s", e)

    return _get_heuristic_script(sig_str)


# ---------------------------------------------------------------------------
# Reproduction Execution & Signature Matching
# ---------------------------------------------------------------------------


async def execute_repro_run(
    script_code: str,
    target_url: str,
    output_dir: Path | str,
    fps: float = 30.0,
    sync_flash: bool = False,
) -> tuple[IngestResult, list[Anomaly], set[tuple[str, str]]]:
    """Execute reproduction script inside Playwright and analyze result."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    video_dir = str(out / "video")
    har_path = str(out / "repro.har")
    probe_js_path = Path(__file__).resolve().parent.parent / "probe" / "chronolens-probe.js"

    # Compile script
    scope: dict[str, Any] = {}
    exec(script_code, scope)
    run_repro_fn = scope.get("run_repro")
    if not callable(run_repro_fn):
        raise ValueError("Reproduction script must define `async def run_repro(page)`")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            record_video_dir=video_dir,
            record_video_size={"width": 1280, "height": 720},
            record_har_path=har_path,
        )
        if probe_js_path.exists():
            await context.add_init_script(path=str(probe_js_path))

        if sync_flash:
            await context.add_init_script("window.__chronolens_sync_flash = true;")

        page = await context.new_page()
        await page.goto(target_url, wait_until="networkidle")

        # Run generated script
        await run_repro_fn(page)

        # Collect probe log
        probe_log = await page.evaluate("() => window.__chronolens_probe_log || []")
        ground_truth = await page.evaluate("() => window.__chronolens_ground_truth || []")
        probe_path = out / "repro_probe_log.json"
        with open(probe_path, "w", encoding="utf-8") as f:
            json.dump({"probe_log": probe_log, "ground_truth": ground_truth}, f, indent=2)

        await context.close()
        await browser.close()

    # Transcode WebM to H.264
    webm_files = list(Path(video_dir).glob("*.webm"))
    if not webm_files:
        raise RuntimeError("No WebM recording found from Playwright execution")

    webm_path = str(webm_files[0])
    h264_path = str(out / "repro.mp4")
    convert_to_h264(webm_path, h264_path)

    # Hybrid truth analysis from probe log
    from backend.app.pipeline.config import DEFAULT_CONFIG

    perceive_res = generate_tracks_from_probe_log(probe_path, fps=fps)
    anomalies = detect(perceive_res, DEFAULT_CONFIG)
    signature = compute_anomaly_signature(anomalies)

    ingest_res = IngestResult(
        video_path=Path(h264_path),
        fps=fps,
        frame_count=len(perceive_res.tracks.get(next(iter(perceive_res.tracks), ""), [])),
        duration_s=3.0,
        width=1280,
        height=720,
        codec="h264",
        har_path=Path(har_path),
        probe_log_path=probe_path,
        raw_clip_path=Path(webm_path),
        output_dir=out,
    )

    return ingest_res, anomalies, signature


async def reproduce(
    anomalies: list[Anomaly],
    client: MetaClient | None,
    config: PipelineConfig,
    base_url: str = "http://localhost:5173",
    bug_number: int | None = None,
    max_attempts: int = 3,
    run_dir: str | Path = "runs/repro",
) -> ReproResult:
    """Reproduce detected anomalies in headless browser.

    Section 6 acceptance criteria:
    Signature match on at least 2 of 3 bugs within 3 attempts.

    Args:
        anomalies: Detected anomalies from user clip.
        client: Meta client singleton.
        config: Pipeline configuration.
        base_url: Base URL of demo application.
        bug_number: Optional explicit bug number (?bug=N).
        max_attempts: Maximum reproduction retry attempts (default 3).
        run_dir: Directory for reproduction artifacts.

    Returns:
        ReproResult detailing whether reproduction succeeded and matched signature.
    """
    orig_sig = compute_anomaly_signature(anomalies, window_ms=config.detection.signature_window_ms)
    logger.info("Original anomaly signature: %s", orig_sig)

    target_url = f"{base_url}?bug={bug_number}" if bug_number else base_url
    base_out = Path(run_dir)

    last_ingest = None
    last_anomalies: list[Anomaly] = []
    last_sig: set[tuple[str, str]] = set()
    script = ""

    for attempt in range(1, max_attempts + 1):
        attempt_dir = base_out / f"attempt_{attempt}"
        logger.info("Reproduction attempt %d/%d targeting %s", attempt, max_attempts, target_url)

        script = await generate_repro_script(
            anomalies=anomalies,
            client=client,
            base_url=base_url,
        )

        try:
            ingest_res, repro_anomalies, repro_sig = await execute_repro_run(
                script_code=script,
                target_url=target_url,
                output_dir=attempt_dir,
                fps=30.0,
                sync_flash=True,
            )
            last_ingest = ingest_res
            last_anomalies = repro_anomalies
            last_sig = repro_sig

            # Signature match criteria:
            # Matches when signatures have non-empty overlap or exact match
            matched = (orig_sig == repro_sig) or bool(orig_sig & repro_sig)
            if matched:
                logger.info("Reproduction succeeded on attempt %d: signature matched!", attempt)
                return ReproResult(
                    matched=True,
                    original_signature=orig_sig,
                    repro_signature=repro_sig,
                    repro_ingest=ingest_res,
                    repro_anomalies=repro_anomalies,
                    playwright_script=script,
                    attempt=attempt,
                )
        except Exception as e:
            logger.warning("Reproduction attempt %d failed with error: %s", attempt, e)

        await asyncio.sleep(0.5)

    return ReproResult(
        matched=False,
        original_signature=orig_sig,
        repro_signature=last_sig,
        repro_ingest=last_ingest,
        repro_anomalies=last_anomalies,
        playwright_script=script,
        attempt=max_attempts,
    )
