"""Tests for the reproduce stage (Phase 3)."""

from __future__ import annotations

from pathlib import Path

import pytest
from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.detect import detect
from backend.app.pipeline.perceive import generate_tracks_from_probe_log
from backend.app.pipeline.reproduce import (
    _get_heuristic_script,
    reproduce,
)


def test_get_heuristic_script() -> None:
    """Test fallback script generation based on signature keywords."""
    script_modal = _get_heuristic_script("cross_concept_overlap, modal dialog")
    assert "set_viewport_size({'width': 800, 'height': 720})" in script_modal
    assert "card.click()" in script_modal

    script_clip = _get_heuristic_script("clipping, action button")
    assert "set_viewport_size({'width': 360, 'height': 640})" in script_clip

    script_drag = _get_heuristic_script("teleport, kanban card")
    assert "drag_and_drop" in script_drag


@pytest.mark.asyncio
async def test_p3_reproduction_benchmark() -> None:
    """Acceptance criterion: Signature match on at least 2 of 3 bugs within 3 attempts.

    Tests reproduction against the local preview server for all 3 seeded bugs.
    """
    repo_root = Path(__file__).resolve().parents[2]
    runs_dir = repo_root / "runs" / "phase-1"

    matched_bugs = 0

    # 1. Test Bug 1 (Race snapback)
    bug1_log = runs_dir / "test-p1-bug1" / "bug1_probe_log.json"
    if bug1_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug1_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG)
        repro_res = await reproduce(
            anomalies=anomalies,
            client=None,
            config=DEFAULT_CONFIG,
            base_url="http://localhost:5173",
            bug_number=1,
            max_attempts=3,
            run_dir=repo_root / "runs" / "test-repro-bug1",
        )
        if repro_res.matched:
            matched_bugs += 1

    # 2. Test Bug 2 (Z-index modal overlap)
    bug2_log = runs_dir / "test-p1-bug2" / "bug2_probe_log.json"
    if bug2_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug2_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG)
        repro_res = await reproduce(
            anomalies=anomalies,
            client=None,
            config=DEFAULT_CONFIG,
            base_url="http://localhost:5173",
            bug_number=2,
            max_attempts=3,
            run_dir=repo_root / "runs" / "test-repro-bug2",
        )
        if repro_res.matched:
            matched_bugs += 1

    # 3. Test Bug 3 (Button clipping)
    bug3_log = runs_dir / "test-p1-bug3" / "bug3_probe_log.json"
    if bug3_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug3_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG, viewport_size=(360.0, 640.0))
        repro_res = await reproduce(
            anomalies=anomalies,
            client=None,
            config=DEFAULT_CONFIG,
            base_url="http://localhost:5173",
            bug_number=3,
            max_attempts=3,
            run_dir=repo_root / "runs" / "test-repro-bug3",
        )
        if repro_res.matched:
            matched_bugs += 1

    # Phase 3 acceptance criteria: Signature match on at least 2 of 3 bugs
    assert matched_bugs >= 2
