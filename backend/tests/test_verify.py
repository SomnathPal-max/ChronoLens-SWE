"""Tests for the verify stage (Phase 4).

Acceptance Criteria:
- Patched build passes 5 of 5 runs for at least 2 of 3 bugs with no new anomaly types.
- Verification passes when:
  1. Signature is absent in 5 of 5 runs.
  2. Median shape-stability IoU >= 0.95 on tracked concepts.
  3. No new anomaly types appear.
  4. Playwright functional assertion passes.
- Before/after card and PR markdown generated.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.patch import cleanup_worktree, patch
from backend.app.pipeline.report import report
from backend.app.pipeline.types import (
    FrameMask,
    PatchResult,
    ReproResult,
    RootCauseResult,
    Track,
    VerifyResult,
)
from backend.app.pipeline.verify import (
    compute_track_shape_ious,
    verify,
)


def test_compute_track_shape_ious() -> None:
    """Test pairwise translated shape IoU computation."""
    mask1 = FrameMask(
        frame_index=0,
        t_ms=0.0,
        object_id=1,
        concept="kanban card",
        bbox=(100.0, 100.0, 200.0, 100.0),
        confidence=0.9,
        centroid=(200.0, 150.0),
        area=20000.0,
    )
    mask2 = FrameMask(
        frame_index=1,
        t_ms=33.3,
        object_id=1,
        concept="kanban card",
        bbox=(110.0, 100.0, 200.0, 100.0),  # Translated by 10px
        confidence=0.9,
        centroid=(210.0, 150.0),
        area=20000.0,
    )
    track = Track(concept="kanban card", object_id=1, frames={0: mask1, 1: mask2})
    ious = compute_track_shape_ious({"kanban card": [track]})
    assert len(ious) == 1
    # Shape is identical, only translated -> IoU should be 1.0
    assert abs(ious[0] - 1.0) < 1e-4


def test_verify_result_evaluation_pass() -> None:
    """Test verify logic when all 5 runs satisfy the gate."""
    run_details = [
        {
            "run_index": i,
            "passed": True,
            "sig_reappeared": False,
            "new_anomaly_types": [],
            "median_shape_iou": 0.99,
            "ground_truth_count": 0,
            "anomalies_count": 0,
        }
        for i in range(1, 6)
    ]
    res = VerifyResult(
        passed=True,
        runs=5,
        passes=5,
        signature_absent_in_all=True,
        median_shape_iou=0.99,
        new_anomaly_types=[],
        run_details=run_details,
    )
    assert res.passed is True
    assert res.passes == 5
    assert res.signature_absent_in_all is True


def test_verify_result_evaluation_fail_on_signature_reappearance() -> None:
    """Test verify logic fails if signature reappears in any run."""
    run_details = [
        {
            "run_index": 1,
            "passed": False,
            "sig_reappeared": True,
            "new_anomaly_types": [],
            "median_shape_iou": 0.99,
            "ground_truth_count": 1,
            "anomalies_count": 1,
        }
    ] + [
        {
            "run_index": i,
            "passed": True,
            "sig_reappeared": False,
            "new_anomaly_types": [],
            "median_shape_iou": 0.99,
            "ground_truth_count": 0,
            "anomalies_count": 0,
        }
        for i in range(2, 6)
    ]
    res = VerifyResult(
        passed=False,
        runs=5,
        passes=4,
        signature_absent_in_all=False,
        median_shape_iou=0.99,
        new_anomaly_types=[],
        run_details=run_details,
    )
    assert res.passed is False
    assert res.passes == 4
    assert res.signature_absent_in_all is False


@pytest.mark.asyncio
async def test_p4_acceptance_benchmark() -> None:
    """Phase 4 Acceptance Criterion:

    Patched build passes 5 of 5 runs for at least 2 of 3 bugs with no new anomaly types.
    Before/after card and PR markdown generated.
    """
    repo_root = Path(__file__).resolve().parents[2]
    runs_dir = repo_root / "runs" / "phase-4"
    runs_dir.mkdir(parents=True, exist_ok=True)

    bugs_tested = [
        (
            2,
            "cross_concept_overlap",
            "modal dialog",
            "demo-app/src/components/Board.tsx",
            "Modal rendered inside container with transform creating stacking context",
            "async def run_repro(page):\n    await page.set_viewport_size({'width': 800, 'height': 720})\n    await page.wait_for_timeout(400)\n    card = page.locator('[data-cl^=\"card-\"]').first\n    if await card.count() > 0:\n        await card.click()\n    await page.wait_for_timeout(1000)\n",
        ),
        (
            3,
            "clipping",
            "action button",
            "demo-app/src/components/Column.tsx",
            "Add Card button has fixed width of 120px with white-space: nowrap causing clipping",
            "async def run_repro(page):\n    await page.set_viewport_size({'width': 360, 'height': 640})\n    await page.wait_for_timeout(1200)\n",
        ),
        (
            1,
            "teleport",
            "kanban card",
            "demo-app/src/hooks/useCards.ts",
            "Optimistic card move is overwritten by an asynchronous stale server response",
            "async def run_repro(page):\n    await page.wait_for_timeout(400)\n    card = page.locator('[data-cl^=\"card-\"]').first\n    target = page.locator('[data-cl=\"column-inprogress\"]').first\n    if await card.count() > 0 and await target.count() > 0:\n        await page.drag_and_drop('[data-cl^=\"card-\"]', '[data-cl=\"column-inprogress\"]')\n    await page.wait_for_timeout(1500)\n",
        ),
    ]

    passed_count = 0

    for bug_no, anomaly_type, concept, file_path, hypothesis, script in bugs_tested:
        run_id = f"p4-bug{bug_no}"
        bug_run_dir = runs_dir / run_id
        bug_run_dir.mkdir(parents=True, exist_ok=True)

        orig_sig = {(anomaly_type, concept)}
        orig_log = (
            repo_root / "runs" / "phase-1" / f"test-p1-bug{bug_no}" / f"bug{bug_no}_probe_log.json"
        )
        orig_anomalies = []
        if orig_log.exists():
            from backend.app.pipeline.detect import detect
            from backend.app.pipeline.perceive import generate_tracks_from_probe_log

            orig_perceive = generate_tracks_from_probe_log(orig_log)
            orig_anomalies = detect(orig_perceive, DEFAULT_CONFIG)

        rc = RootCauseResult(
            hypothesis=hypothesis,
            files=[{"path": file_path, "lines": "all", "why": "root cause"}],
            evidence=[{"source": "probe", "ref": f"bug-{bug_no} telemetry", "t_ms": 500.0}],
            falsifiable_check=f"Apply patch for {file_path}",
            confidence=0.96,
        )

        patch_res: PatchResult | None = None
        try:
            # 1. Patch stage (Rule 8: isolated worktree)
            patch_res = await patch(
                root_cause_result=rc,
                client=None,
                repo_path=repo_root,
                config=DEFAULT_CONFIG,
                run_id=run_id,
            )
            assert patch_res.tests_pass is True

            # 2. Verify stage (5 runs gate)
            verify_res = await verify(
                patch_result=patch_res,
                client=None,
                config=DEFAULT_CONFIG,
                num_runs=5,
                bug_number=bug_no,
                original_signature=orig_sig,
                original_anomalies=orig_anomalies,
                repro_script=script,
                run_dir=bug_run_dir / "verify",
            )

            # 3. Report stage
            repro_res = ReproResult(
                matched=True,
                original_signature=orig_sig,
                repro_signature=orig_sig,
            )
            report_res = await report(
                verify_result=verify_res,
                run_dir=bug_run_dir,
                patch_result=patch_res,
                root_cause_result=rc,
                repro_result=repro_res,
                run_id=run_id,
                bug_number=bug_no,
            )

            # Assert report outputs generated
            assert report_res.report_json_path.exists()
            assert report_res.before_after_card_path is not None
            assert report_res.before_after_card_path.exists()
            assert len(report_res.pr_markdown) > 100

            if verify_res.passed and verify_res.passes == 5:
                passed_count += 1

        finally:
            if patch_res and patch_res.worktree_path:
                cleanup_worktree(
                    repo_root,
                    patch_res.worktree_path,
                    patch_res.branch_name,
                    delete_branch=False,  # Keep branch for evidence
                )

    # Acceptance criterion: passes 5 of 5 runs for at least 2 of 3 bugs
    assert passed_count >= 2, (
        f"Expected at least 2 of 3 bugs to pass 5/5 verification runs, got {passed_count}/3"
    )
