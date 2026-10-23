"""Phase 6 Stretch Feature: Responsive Auto-Patcher.

Audits UI layout across standard viewports (Desktop: 1440x900, Tablet: 768x1024, Mobile: 390x844),
flags clipping (scrollWidth > clientWidth) and cross-concept overlap / stacking traps,
and synthesizes responsive CSS/Tailwind patches verified across all viewports.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from backend.app.clients.meta import MetaClient
from backend.app.pipeline.config import DEFAULT_CONFIG, PipelineConfig
from backend.app.pipeline.detect import detect
from backend.app.pipeline.patch import patch
from backend.app.pipeline.perceive import generate_tracks_from_probe_log
from backend.app.pipeline.rootcause import root_cause
from backend.app.pipeline.types import (
    Anomaly,
    AnomalyType,
    ReproResult,
    ResponsiveAuditResult,
    ResponsiveViewport,
)
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

DEFAULT_RESPONSIVE_VIEWPORTS: list[ResponsiveViewport] = [
    ResponsiveViewport(name="desktop", width=1440, height=900),
    ResponsiveViewport(name="tablet", width=768, height=1024),
    ResponsiveViewport(name="mobile", width=390, height=844, is_mobile=True),
]


async def audit_responsive(
    base_url: str = "http://localhost:5173",
    bug_number: int = 3,
    run_dir: Path | None = None,
    viewports: list[ResponsiveViewport] | None = None,
    config: PipelineConfig | None = None,
) -> ResponsiveAuditResult:
    """Run responsive layout audit across multiple screen viewports.

    Args:
        base_url: Target application base URL.
        bug_number: Seeded bug number or 0 for clean baseline.
        run_dir: Directory to save audit evidence.
        viewports: List of viewports to audit (default: desktop, tablet, mobile).
        config: Pipeline configuration.

    Returns:
        ResponsiveAuditResult detailing healthy/failing viewports and anomalies.
    """
    cfg = config or DEFAULT_CONFIG
    vps = viewports or DEFAULT_RESPONSIVE_VIEWPORTS
    anomalies_by_viewport: dict[str, list[Anomaly]] = {}
    healthy_vps: list[str] = []
    failing_vps: list[str] = []

    probe_script_path = Path(__file__).resolve().parents[1] / "probe" / "chronolens-probe.js"
    probe_code = probe_script_path.read_text(encoding="utf-8") if probe_script_path.exists() else ""

    target_url = f"{base_url}/"
    if bug_number > 0:
        target_url = f"{base_url}/?bug={bug_number}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for vp in vps:
            logger.info("Auditing viewport %s (%dx%d)...", vp.name, vp.width, vp.height)
            context = await browser.new_context(
                viewport={"width": vp.width, "height": vp.height},
                device_scale_factor=vp.device_scale_factor,
                is_mobile=vp.is_mobile,
            )
            page = await context.new_page()

            if probe_code:
                await page.add_init_script(probe_code)

            try:
                await page.goto(target_url, wait_until="networkidle", timeout=15000)

                # For bug 2 (modal z-index), trigger modal if open button exists
                if bug_number == 2:
                    card_el = page.locator("[data-cl='card-1']")
                    if await card_el.count() > 0:
                        await card_el.first.click()
                        await page.wait_for_timeout(600)

                # Wait for RAF probe sampling
                await page.wait_for_timeout(1000)

                # Extract probe log
                probe_log_raw = await page.evaluate("window.__chronolens_probe_log || []")

                # If run_dir is provided, save probe log
                if run_dir:
                    run_dir.mkdir(parents=True, exist_ok=True)
                    vp_log_file = run_dir / f"probe_{vp.name}.json"
                    vp_log_file.write_text(json.dumps(probe_log_raw, indent=2), encoding="utf-8")

                # Convert probe log to perception tracks
                perceive_res = generate_tracks_from_probe_log(probe_log_raw)

                # Run anomaly detection specifically calibrated for this viewport size
                detected_anomalies = detect(
                    perceive_res, cfg, viewport_size=(float(vp.width), float(vp.height))
                )

                # Filter for responsive layout anomalies (clipping, overlap, occlusion)
                layout_anomalies = [
                    a
                    for a in detected_anomalies
                    if a.anomaly_type
                    in (
                        AnomalyType.CLIPPING,
                        AnomalyType.CROSS_CONCEPT_OVERLAP,
                        AnomalyType.OCCLUSION,
                    )
                ]

                anomalies_by_viewport[vp.name] = layout_anomalies
                if layout_anomalies:
                    failing_vps.append(vp.name)
                else:
                    healthy_vps.append(vp.name)

            except Exception as exc:
                logger.error("Audit failed on %s: %s", vp.name, exc)
                failing_vps.append(vp.name)
                anomalies_by_viewport[vp.name] = []
            finally:
                await context.close()

        await browser.close()

    has_clipping = any(
        any(a.anomaly_type == AnomalyType.CLIPPING for a in anoms)
        for anoms in anomalies_by_viewport.values()
    )
    has_overlap = any(
        any(a.anomaly_type == AnomalyType.CROSS_CONCEPT_OVERLAP for a in anoms)
        for anoms in anomalies_by_viewport.values()
    )

    summary = (
        f"Responsive Audit: {len(healthy_vps)}/{len(vps)} viewports healthy. "
        f"Failing: {failing_vps or 'None'}. Clipping: {has_clipping}, Overlap: {has_overlap}."
    )

    return ResponsiveAuditResult(
        viewports=vps,
        anomalies_by_viewport=anomalies_by_viewport,
        has_clipping=has_clipping,
        has_overlap=has_overlap,
        healthy_viewports=healthy_vps,
        failing_viewports=failing_vps,
        summary=summary,
    )


async def auto_patch_responsive(
    audit_result: ResponsiveAuditResult,
    repo_path: Path,
    client: MetaClient | None = None,
    config: PipelineConfig | None = None,
    run_id: str = "responsive-patch",
) -> ResponsiveAuditResult:
    """Synthesize and verify responsive patch across all viewports.

    Ensures that narrow viewports are fixed while desktop viewports suffer zero regressions.
    """
    cfg = config or DEFAULT_CONFIG

    # Flatten anomalies from failing viewports
    all_anomalies: list[Anomaly] = []
    for anoms in audit_result.anomalies_by_viewport.values():
        all_anomalies.extend(anoms)

    if not all_anomalies:
        audit_result.summary += " No responsive patches needed."
        return audit_result

    # 1. Synthesize Root Cause
    repro_res = ReproResult(
        matched=True,
        original_signature={a.signature_key for a in all_anomalies},
        repro_signature={a.signature_key for a in all_anomalies},
        repro_anomalies=all_anomalies,
    )

    root_cause_res = await root_cause(
        repro_result=repro_res,
        client=client,
        repo_path=repo_path,
        config=cfg,
    )

    # 2. Synthesize Patch in isolated Git Worktree
    patch_res = await patch(
        root_cause_result=root_cause_res,
        client=client,
        repo_path=repo_path,
        config=cfg,
        run_id=run_id,
    )

    audit_result.patch_result = patch_res

    # 3. If worktree created and built, verify multi-viewport rendering
    if patch_res.worktree_path and patch_res.worktree_path.exists():
        from backend.app.pipeline.verify import EphemeralWorktreeServer

        ephemeral_server = EphemeralWorktreeServer(
            worktree_path=patch_res.worktree_path,
        )
        try:
            ephemeral_server.start()
            # Re-audit patched server across viewports
            patched_audit = await audit_responsive(
                base_url=ephemeral_server.base_url,
                bug_number=3,
                viewports=audit_result.viewports,
                config=cfg,
            )
            audit_result.multi_viewport_verify = {
                vp.name: (len(patched_audit.anomalies_by_viewport.get(vp.name, [])) == 0)
                for vp in audit_result.viewports
            }
        except Exception as exc:
            logger.warning("Ephemeral server verification encountered: %s", exc)
        finally:
            ephemeral_server.stop()

    return audit_result


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ChronoLens Responsive Auto-Patcher")
    parser.add_argument("--url", default="http://localhost:5173", help="Base URL of target app")
    parser.add_argument("--bug", type=int, default=3, help="Bug number (default: 3)")
    parser.add_argument("--patch", action="store_true", help="Auto-synthesize responsive patch")

    args = parser.parse_args()

    async def main():
        print(f"Auditing responsive viewports for Bug {args.bug} at {args.url}...")
        res = await audit_responsive(base_url=args.url, bug_number=args.bug)
        print("Summary:", res.summary)
        for vp_name, anoms in res.anomalies_by_viewport.items():
            print(f"  {vp_name}: {len(anoms)} anomalies")
            for a in anoms:
                print(f"    - {a.anomaly_type.value}: {a.concept} (severity: {a.severity})")

        if args.patch:
            repo_path = Path(__file__).resolve().parents[3]
            print(f"\nAuto-patching responsive layout in worktree for {repo_path}...")
            patched_res = await auto_patch_responsive(res, repo_path=repo_path)
            print(
                "Patch branch:",
                patched_res.patch_result.branch_name if patched_res.patch_result else "None",
            )
            print("Multi-viewport verification:", patched_res.multi_viewport_verify)

    asyncio.run(main())
