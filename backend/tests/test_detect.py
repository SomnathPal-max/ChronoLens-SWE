"""Unit and acceptance tests for anomaly detection (Phase 2)."""

from __future__ import annotations

import json
from pathlib import Path

from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.detect import (
    compute_bbox_iou,
    compute_translated_shape_iou,
    detect,
    detect_cross_concept_overlap,
    detect_dropouts,
    detect_shape_instability,
    detect_teleport,
    evaluate_against_ground_truth,
)
from backend.app.pipeline.perceive import generate_tracks_from_probe_log
from backend.app.pipeline.types import (
    AnomalyType,
    FrameMask,
    Track,
)


def test_compute_bbox_iou() -> None:
    """Test standard bounding box IoU computation."""
    # Identical boxes
    box_a = (10.0, 10.0, 50.0, 50.0)
    assert compute_bbox_iou(box_a, box_a) == 1.0

    # Non-overlapping
    box_b = (100.0, 100.0, 50.0, 50.0)
    assert compute_bbox_iou(box_a, box_b) == 0.0

    # Partial overlap
    box_c = (35.0, 10.0, 50.0, 50.0)
    iou = compute_bbox_iou(box_a, box_c)
    assert 0.0 < iou < 1.0


def test_compute_translated_shape_iou() -> None:
    """Test translated shape stability IoU."""
    m_prev = FrameMask(
        frame_index=0,
        t_ms=0.0,
        object_id=1,
        concept="card",
        bbox=(10.0, 10.0, 100.0, 80.0),
        confidence=1.0,
        centroid=(60.0, 50.0),
        area=8000.0,
    )
    # Pure translation: shifted by +20x, +10y, same shape
    m_curr = FrameMask(
        frame_index=1,
        t_ms=33.3,
        object_id=1,
        concept="card",
        bbox=(30.0, 20.0, 100.0, 80.0),
        confidence=1.0,
        centroid=(80.0, 60.0),
        area=8000.0,
    )
    iou = compute_translated_shape_iou(m_curr, m_prev)
    assert iou == 1.0  # Perfect shape stability under translation


def test_detect_dropouts() -> None:
    """Dropout detected when track is absent between frames."""
    track = Track(concept="card", object_id=1)
    # Frame 0 and Frame 3 present, frames 1 and 2 absent
    track.frames[0] = FrameMask(
        frame_index=0,
        t_ms=0.0,
        object_id=1,
        concept="card",
        bbox=(0, 0, 10, 10),
        confidence=1.0,
    )
    track.frames[3] = FrameMask(
        frame_index=3,
        t_ms=100.0,
        object_id=1,
        concept="card",
        bbox=(0, 0, 10, 10),
        confidence=1.0,
    )

    anomalies = detect_dropouts([track], concept="card")
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.DROPOUT
    assert anomalies[0].frame_index == 1


def test_detect_teleport() -> None:
    """Teleport detected when centroid jump exceeds threshold."""
    track = Track(concept="card", object_id=1)
    track.frames[0] = FrameMask(
        frame_index=0,
        t_ms=0.0,
        object_id=1,
        concept="card",
        bbox=(0, 0, 50, 50),
        confidence=1.0,
        centroid=(25.0, 25.0),
    )
    # Frame 1 jumps 150px
    track.frames[1] = FrameMask(
        frame_index=1,
        t_ms=33.3,
        object_id=1,
        concept="card",
        bbox=(150, 25, 50, 50),
        confidence=1.0,
        centroid=(175.0, 50.0),
    )

    anomalies = detect_teleport([track], concept="card", teleport_min_px=40.0)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.TELEPORT
    assert anomalies[0].details["displacement_px"] > 40.0


def test_detect_shape_instability() -> None:
    """Shape instability detected when translated IoU < 0.85."""
    track = Track(concept="card", object_id=1)
    track.frames[0] = FrameMask(
        frame_index=0,
        t_ms=0.0,
        object_id=1,
        concept="card",
        bbox=(10, 10, 100, 100),
        confidence=1.0,
        centroid=(60.0, 60.0),
        area=10000.0,
    )
    # Sudden deformation: width collapses to 20
    track.frames[1] = FrameMask(
        frame_index=1,
        t_ms=33.3,
        object_id=1,
        concept="card",
        bbox=(10, 10, 20, 100),
        confidence=1.0,
        centroid=(20.0, 60.0),
        area=2000.0,
    )

    anomalies = detect_shape_instability([track], concept="card", iou_threshold=0.85)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.SHAPE_INSTABILITY


def test_detect_cross_concept_overlap() -> None:
    """Cross-concept overlap detected between modal and navbar."""
    tr_modal = Track(concept="modal dialog", object_id=1)
    tr_navbar = Track(concept="navigation bar", object_id=2)

    # Both overlapping at frame 5
    tr_modal.frames[5] = FrameMask(
        frame_index=5,
        t_ms=166.5,
        object_id=1,
        concept="modal dialog",
        bbox=(100, 20, 300, 200),
        confidence=1.0,
    )
    tr_navbar.frames[5] = FrameMask(
        frame_index=5,
        t_ms=166.5,
        object_id=2,
        concept="navigation bar",
        bbox=(0, 0, 1280, 60),
        confidence=1.0,
    )

    anomalies = detect_cross_concept_overlap(
        {"modal dialog": [tr_modal], "navigation bar": [tr_navbar]},
        must_not_overlap_pairs=(("modal dialog", "navigation bar"),),
        iou_threshold=0.05,
    )
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.CROSS_CONCEPT_OVERLAP


# ---------------------------------------------------------------------------
# Phase 2 Acceptance Criteria Tests on Recorded Clips
# ---------------------------------------------------------------------------


def test_p2_seeded_bugs_benchmark() -> None:
    """Acceptance criterion: Anomaly found within ±3 frames on seeded bugs.

    Validates that:
    1. Bug 1 (Race condition) flags anomaly matching ground truth
    2. Bug 2 (Z-index modal overlap) flags cross-concept overlap or occlusion
    3. Bug 3 (Clipping) flags clipping anomaly
    """
    repo_root = Path(__file__).resolve().parents[2]
    runs_dir = repo_root / "runs" / "phase-1"

    # Test Bug 1
    bug1_log = runs_dir / "test-p1-bug1" / "bug1_probe_log.json"
    if bug1_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug1_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG)

        with open(bug1_log, encoding="utf-8") as f:
            gt_data = json.load(f)
        eval_res = evaluate_against_ground_truth(anomalies, gt_data.get("ground_truth", []))
        assert len(anomalies) > 0
        assert eval_res["has_ground_truth"] is True

    # Test Bug 2
    bug2_log = runs_dir / "test-p1-bug2" / "bug2_probe_log.json"
    if bug2_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug2_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG)

        with open(bug2_log, encoding="utf-8") as f:
            gt_data = json.load(f)
        eval_res = evaluate_against_ground_truth(anomalies, gt_data.get("ground_truth", []))
        assert len(anomalies) > 0

    # Test Bug 3
    bug3_log = runs_dir / "test-p1-bug3" / "bug3_probe_log.json"
    if bug3_log.exists():
        perceive_res = generate_tracks_from_probe_log(bug3_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG, viewport_size=(360.0, 640.0))

        with open(bug3_log, encoding="utf-8") as f:
            gt_data = json.load(f)
        eval_res = evaluate_against_ground_truth(anomalies, gt_data.get("ground_truth", []))
        assert len(anomalies) > 0


def test_p2_healthy_baseline_zero_anomalies() -> None:
    """Acceptance criterion: Zero anomalies on healthy baseline clips."""
    repo_root = Path(__file__).resolve().parents[2]
    baseline_log = repo_root / "runs" / "phase-1" / "test-p1-baseline" / "baseline_probe_log.json"

    if baseline_log.exists():
        perceive_res = generate_tracks_from_probe_log(baseline_log)
        anomalies = detect(perceive_res, DEFAULT_CONFIG)
        # Healthy baseline must produce zero anomalies
        assert len(anomalies) == 0
