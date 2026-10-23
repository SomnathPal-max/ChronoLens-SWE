"""Tests for the report stage (Phase 4).

Verifies generation of:
1. report.json with full schema
2. PR markdown with citations and diff
3. before_after.png comparison card
4. scrubber_session.json with frame timeline
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from backend.app.pipeline.report import (
    generate_pr_markdown,
    generate_scrubber_session_json,
    render_before_after_card,
    report,
)
from backend.app.pipeline.types import (
    Anomaly,
    AnomalyType,
    PatchResult,
    ReproResult,
    RootCauseResult,
    VerifyResult,
)


@pytest.fixture
def sample_verify_result() -> VerifyResult:
    return VerifyResult(
        passed=True,
        runs=5,
        passes=5,
        signature_absent_in_all=True,
        median_shape_iou=0.985,
        new_anomaly_types=[],
        run_details=[
            {
                "run_index": i,
                "passed": True,
                "sig_reappeared": False,
                "new_anomaly_types": [],
                "median_shape_iou": 0.985,
                "ground_truth_count": 0,
            }
            for i in range(1, 6)
        ],
    )


@pytest.fixture
def sample_patch_result() -> PatchResult:
    return PatchResult(
        diff="--- a/demo-app/src/components/Board.tsx\n+++ b/demo-app/src/components/Board.tsx\n@@ -43,4 +43,2 @@\n",
        rationale="Removed transform translateZ on board container",
        branch_name="chronolens/fix-test-123",
        worktree_path=None,
        tests_pass=True,
        lint_pass=True,
    )


@pytest.fixture
def sample_root_cause() -> RootCauseResult:
    return RootCauseResult(
        hypothesis="Modal rendered inside container with transform creating stacking context",
        files=[
            {
                "path": "demo-app/src/components/Board.tsx",
                "lines": "43-46",
                "why": "stacking context",
            }
        ],
        evidence=[
            {"source": "probe", "ref": "modal z-index trapped", "t_ms": 500.0},
            {"source": "code", "ref": "transform: translateZ(0)", "t_ms": 0.0},
        ],
        falsifiable_check="Remove transform style",
        confidence=0.95,
    )


@pytest.fixture
def sample_repro_result() -> ReproResult:
    return ReproResult(
        matched=True,
        original_signature={("cross_concept_overlap", "modal dialog")},
        repro_signature={("cross_concept_overlap", "modal dialog")},
        repro_anomalies=[
            Anomaly(
                frame_index=15,
                t_ms=500.0,
                anomaly_type=AnomalyType.CROSS_CONCEPT_OVERLAP,
                concept="modal dialog",
                severity=0.85,
            )
        ],
    )


def test_generate_pr_markdown(
    sample_verify_result: VerifyResult,
    sample_patch_result: PatchResult,
    sample_root_cause: RootCauseResult,
) -> None:
    """Test generating PR markdown with all required sections."""
    md = generate_pr_markdown(
        bug_number=2,
        verify_result=sample_verify_result,
        patch_result=sample_patch_result,
        root_cause_result=sample_root_cause,
        run_id="test-123",
    )
    assert "# ✅ fix(demo-app): resolve visual regression in Bug 2" in md
    assert "chronolens/fix-test-123" in md
    assert "5/5 (100%)" in md
    assert "0.985" in md
    assert "Modal rendered inside container" in md
    assert "modal z-index trapped" in md
    assert "```diff" in md
    assert "| Run 1 | ✅ Pass |" in md


def test_render_before_after_card(
    tmp_path: Path,
    sample_verify_result: VerifyResult,
    sample_patch_result: PatchResult,
    sample_root_cause: RootCauseResult,
    sample_repro_result: ReproResult,
) -> None:
    """Test rendering the 1200x630 before/after comparison PNG card."""
    out_file = tmp_path / "card.png"
    render_before_after_card(
        output_path=out_file,
        bug_number=2,
        verify_result=sample_verify_result,
        patch_result=sample_patch_result,
        root_cause_result=sample_root_cause,
        repro_result=sample_repro_result,
    )
    assert out_file.exists()
    assert out_file.stat().st_size > 1000

    # Validate PNG header bytes
    with open(out_file, "rb") as f:
        header = f.read(8)
    assert header == b"\x89PNG\r\n\x1a\n"


def test_generate_scrubber_session_json(
    tmp_path: Path,
    sample_verify_result: VerifyResult,
    sample_patch_result: PatchResult,
    sample_root_cause: RootCauseResult,
    sample_repro_result: ReproResult,
) -> None:
    """Test generating scrubber_session.json for Time-Travel Scrubber UI."""
    out_file = tmp_path / "scrubber_session.json"
    generate_scrubber_session_json(
        output_path=out_file,
        run_id="test-123",
        bug_number=2,
        repro_result=sample_repro_result,
        root_cause_result=sample_root_cause,
        patch_result=sample_patch_result,
        verify_result=sample_verify_result,
    )
    assert out_file.exists()
    with open(out_file, encoding="utf-8") as f:
        data = json.load(f)

    assert data["run_id"] == "test-123"
    assert data["bug_number"] == 2
    assert "frames" in data
    assert len(data["frames"]) > 0
    assert "verification" in data
    assert data["verification"]["passed"] is True


@pytest.mark.asyncio
async def test_full_report_stage(
    tmp_path: Path,
    sample_verify_result: VerifyResult,
    sample_patch_result: PatchResult,
    sample_root_cause: RootCauseResult,
    sample_repro_result: ReproResult,
) -> None:
    """Test the complete report stage output bundle."""
    report_res = await report(
        verify_result=sample_verify_result,
        run_dir=tmp_path,
        patch_result=sample_patch_result,
        root_cause_result=sample_root_cause,
        repro_result=sample_repro_result,
        run_id="run-p4-sample",
        bug_number=2,
    )
    assert report_res.report_json_path.exists()
    assert report_res.before_after_card_path is not None
    assert report_res.before_after_card_path.exists()
    assert report_res.scrubber_session_path is not None
    assert report_res.scrubber_session_path.exists()
    assert len(report_res.pr_markdown) > 100

    # Verify report.json content
    with open(report_res.report_json_path, encoding="utf-8") as f:
        rep = json.load(f)
    assert rep["status"] == "PASSED"
    assert rep["stability_score"] == "5/5 (100%)"
    assert rep["target_app"] == "demo-app"
