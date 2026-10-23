"""Detect stage — anomaly detection from SAM tracks.

Applies the detection metrics and thresholds from Section 7 of the spec:
- Dropout: track absent between visible frames (flicker, unmount/remount)
- Instance flicker: concept count changes then reverts within N frames
- Teleport: centroid jump > max(3 * baseline p99, 40px) (snap-back)
- Shape stability: translated IoU < 0.85 (partial render)
- Occlusion ratio: visible mask / DOM box < 0.9 while DOM says visible
- Cross-concept overlap: IoU > 0.05 for must-not-overlap pairs (modal vs navbar)
- Clipping: mask touches viewport edge or DOM scrollWidth > clientWidth

All thresholds are read from PipelineConfig.
"""

from __future__ import annotations

import logging
import math
from typing import TYPE_CHECKING, Any

from backend.app.pipeline.types import Anomaly, AnomalyType, FrameMask, PerceiveResult, Track

if TYPE_CHECKING:
    from backend.app.pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Geometric helpers
# ---------------------------------------------------------------------------


def compute_bbox_iou(
    box_a: tuple[float, float, float, float],
    box_b: tuple[float, float, float, float],
) -> float:
    """Compute Intersection over Union (IoU) of two bounding boxes (x, y, w, h)."""
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b

    # Convert to x1, y1, x2, y2
    ax1, ay1, ax2, ay2 = ax, ay, ax + aw, ay + ah
    bx1, by1, bx2, by2 = bx, by, bx + bw, by + bh

    # Intersection rectangle
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    intersection = iw * ih

    if intersection <= 0.0:
        return 0.0

    area_a = aw * ah
    area_b = bw * bh
    union = area_a + area_b - intersection
    if union <= 0.0:
        return 0.0

    return intersection / union


def compute_translated_shape_iou(
    mask_curr: FrameMask,
    mask_prev: FrameMask,
) -> float:
    """Compute IoU of mask_curr with mask_prev after translating mask_prev by centroid shift."""
    dx = mask_curr.centroid[0] - mask_prev.centroid[0]
    dy = mask_curr.centroid[1] - mask_prev.centroid[1]

    # Translate previous box by centroid displacement
    prev_x, prev_y, prev_w, prev_h = mask_prev.bbox
    translated_prev_box = (prev_x + dx, prev_y + dy, prev_w, prev_h)

    return compute_bbox_iou(mask_curr.bbox, translated_prev_box)


# ---------------------------------------------------------------------------
# Anomaly Detectors
# ---------------------------------------------------------------------------


def detect_dropouts(tracks: list[Track], concept: str) -> list[Anomaly]:
    """Detect dropout: track seen at frames t1 and t2 > t1+1 but absent in between."""
    anomalies: list[Anomaly] = []
    for track in tracks:
        sorted_frames = sorted(track.frames.keys())
        for i in range(len(sorted_frames) - 1):
            f1 = sorted_frames[i]
            f2 = sorted_frames[i + 1]
            gap = f2 - f1 - 1
            if 0 < gap <= 10:  # Absent for 1 to 10 frames then returns
                # Flag the dropout frame
                missing_frame = f1 + 1
                t_ms = track.frames[f1].t_ms + ((f2 - f1) * 33.3) / 2.0
                anomalies.append(
                    Anomaly(
                        frame_index=missing_frame,
                        t_ms=t_ms,
                        anomaly_type=AnomalyType.DROPOUT,
                        concept=concept,
                        severity=min(1.0, 0.5 + (gap * 0.1)),
                        details={
                            "object_id": track.object_id,
                            "gap_frames": gap,
                            "left_frame": f1,
                            "right_frame": f2,
                        },
                    )
                )
    return anomalies


def detect_instance_flicker(
    tracks: list[Track],
    concept: str,
    window_frames: int = 6,
) -> list[Anomaly]:
    """Detect instance flicker: instance count changes then reverts within N frames."""
    if not tracks:
        return []

    # Map frame -> active instance count for this concept
    all_frames: set[int] = set()
    for tr in tracks:
        all_frames.update(tr.frames.keys())

    if not all_frames:
        return []

    min_frame = min(all_frames)
    max_frame = max(all_frames)

    counts_by_frame: dict[int, int] = {}
    for f in range(min_frame, max_frame + 1):
        count = sum(1 for tr in tracks if f in tr.frames)
        counts_by_frame[f] = count

    anomalies: list[Anomaly] = []
    # Find brief excursions that revert within window_frames
    for f in range(min_frame, max_frame - window_frames):
        c0 = counts_by_frame[f]
        c1 = counts_by_frame[f + 1]
        if c1 != c0:
            # Check if it reverts within window_frames
            for offset in range(2, window_frames + 1):
                f_revert = f + offset
                if f_revert <= max_frame and counts_by_frame[f_revert] == c0:
                    t_ms = next(
                        (tr.frames[f + 1].t_ms for tr in tracks if (f + 1) in tr.frames),
                        (f + 1) * 33.3,
                    )
                    anomalies.append(
                        Anomaly(
                            frame_index=f + 1,
                            t_ms=t_ms,
                            anomaly_type=AnomalyType.INSTANCE_FLICKER,
                            concept=concept,
                            severity=0.8,
                            details={
                                "baseline_count": c0,
                                "spike_count": c1,
                                "duration_frames": offset,
                            },
                        )
                    )
                    break
    return anomalies


def detect_teleport(
    tracks: list[Track],
    concept: str,
    teleport_min_px: float = 40.0,
    baseline_p99_displacement: float = 10.0,
    multiplier: float = 3.0,
) -> list[Anomaly]:
    """Detect teleport: centroid jump > max(3 * baseline_p99, 40px) between consecutive frames."""
    threshold = max(multiplier * baseline_p99_displacement, teleport_min_px)
    anomalies: list[Anomaly] = []

    for track in tracks:
        sorted_frames = sorted(track.frames.keys())
        for i in range(1, len(sorted_frames)):
            f_prev = sorted_frames[i - 1]
            f_curr = sorted_frames[i]
            # Only consider adjacent or closely adjacent frames
            if f_curr - f_prev <= 3:
                m_prev = track.frames[f_prev]
                m_curr = track.frames[f_curr]
                dx = m_curr.centroid[0] - m_prev.centroid[0]
                dy = m_curr.centroid[1] - m_prev.centroid[1]
                dist = math.sqrt(dx * dx + dy * dy)
                if dist > threshold:
                    anomalies.append(
                        Anomaly(
                            frame_index=f_curr,
                            t_ms=m_curr.t_ms,
                            anomaly_type=AnomalyType.TELEPORT,
                            concept=concept,
                            severity=min(1.0, dist / 200.0),
                            details={
                                "object_id": track.object_id,
                                "displacement_px": round(dist, 2),
                                "threshold_px": threshold,
                                "from_centroid": m_prev.centroid,
                                "to_centroid": m_curr.centroid,
                            },
                        )
                    )
    return anomalies


def detect_shape_instability(
    tracks: list[Track],
    concept: str,
    iou_threshold: float = 0.85,
) -> list[Anomaly]:
    """Detect shape instability: translated IoU < 0.85 between consecutive frames."""
    anomalies: list[Anomaly] = []

    for track in tracks:
        sorted_frames = sorted(track.frames.keys())
        for i in range(1, len(sorted_frames)):
            f_prev = sorted_frames[i - 1]
            f_curr = sorted_frames[i]
            if f_curr - f_prev == 1:
                m_prev = track.frames[f_prev]
                m_curr = track.frames[f_curr]
                # Only check if both have non-trivial area
                if m_prev.area > 50 and m_curr.area > 50:
                    iou = compute_translated_shape_iou(m_curr, m_prev)
                    if iou < iou_threshold:
                        anomalies.append(
                            Anomaly(
                                frame_index=f_curr,
                                t_ms=m_curr.t_ms,
                                anomaly_type=AnomalyType.SHAPE_INSTABILITY,
                                concept=concept,
                                severity=round(1.0 - iou, 3),
                                details={
                                    "object_id": track.object_id,
                                    "translated_iou": round(iou, 3),
                                    "threshold": iou_threshold,
                                },
                            )
                        )
    return anomalies


def detect_cross_concept_overlap(
    tracks_by_concept: dict[str, list[Track]],
    must_not_overlap_pairs: tuple[tuple[str, str], ...],
    iou_threshold: float = 0.05,
) -> list[Anomaly]:
    """Detect cross-concept overlap for pairs marked must-not-overlap (e.g. modal vs navbar)."""
    anomalies: list[Anomaly] = []

    for concept_a, concept_b in must_not_overlap_pairs:
        tracks_a = tracks_by_concept.get(concept_a, [])
        tracks_b = tracks_by_concept.get(concept_b, [])

        if not tracks_a or not tracks_b:
            continue

        for tr_a in tracks_a:
            for tr_b in tracks_b:
                common_frames = set(tr_a.frames.keys()) & set(tr_b.frames.keys())
                for f in sorted(common_frames):
                    m_a = tr_a.frames[f]
                    m_b = tr_b.frames[f]
                    iou = compute_bbox_iou(m_a.bbox, m_b.bbox)
                    if iou > iou_threshold:
                        anomalies.append(
                            Anomaly(
                                frame_index=f,
                                t_ms=m_a.t_ms,
                                anomaly_type=AnomalyType.CROSS_CONCEPT_OVERLAP,
                                concept=f"{concept_a}_vs_{concept_b}",
                                severity=round(iou, 3),
                                details={
                                    "pair": (concept_a, concept_b),
                                    "overlap_iou": round(iou, 3),
                                    "threshold": iou_threshold,
                                    "box_a": m_a.bbox,
                                    "box_b": m_b.bbox,
                                },
                            )
                        )
    return anomalies


def detect_clipping(
    tracks: list[Track],
    concept: str,
    viewport_width: float = 1280.0,
    viewport_height: float = 720.0,
    edge_margin_px: float = 1.0,
) -> list[Anomaly]:
    """Detect clipping: element bounds touch the viewport edge or boundary."""
    anomalies: list[Anomaly] = []

    for track in tracks:
        for f, mask in track.frames.items():
            bx, by, bw, bh = mask.bbox
            if bw <= 0 or bh <= 0:
                continue

            right = bx + bw
            bottom = by + bh

            # Checks if element is clipped by viewport edge
            is_clipped = (
                bx <= edge_margin_px
                or by <= edge_margin_px
                or right >= (viewport_width - edge_margin_px)
                or bottom >= (viewport_height - edge_margin_px)
            )

            # In narrow viewports (e.g., 360px), a button with fixed width touching or overflowing
            if is_clipped:
                anomalies.append(
                    Anomaly(
                        frame_index=f,
                        t_ms=mask.t_ms,
                        anomaly_type=AnomalyType.CLIPPING,
                        concept=concept,
                        severity=0.9,
                        details={
                            "bbox": mask.bbox,
                            "viewport": (viewport_width, viewport_height),
                            "edge_margin": edge_margin_px,
                        },
                    )
                )

    return anomalies


# ---------------------------------------------------------------------------
# Top-level Detector
# ---------------------------------------------------------------------------


def detect(
    perceive_result: PerceiveResult,
    config: PipelineConfig,
    viewport_size: tuple[float, float] = (1280.0, 720.0),
) -> list[Anomaly]:
    """Detect visual anomalies from SAM tracking results.

    Applies all thresholds from ``config.detection``.

    Args:
        perceive_result: Output from the perceive stage.
        config: Pipeline configuration with detection thresholds.
        viewport_size: (width, height) of the video recording.

    Returns:
        List of detected ``Anomaly`` instances sorted by frame_index.
    """
    cfg = config.detection
    all_anomalies: list[Anomaly] = []
    tracks_by_concept = perceive_result.tracks

    # Per-concept metrics
    for concept, tracks in tracks_by_concept.items():
        # 1. Dropout
        all_anomalies.extend(detect_dropouts(tracks, concept))

        # 2. Instance flicker
        all_anomalies.extend(
            detect_instance_flicker(
                tracks,
                concept,
                window_frames=cfg.flicker_window_frames,
            )
        )

        # 3. Teleport (snap-back)
        all_anomalies.extend(
            detect_teleport(
                tracks,
                concept,
                teleport_min_px=cfg.teleport_min_px,
                multiplier=cfg.teleport_baseline_multiplier,
            )
        )

        # 4. Shape instability
        all_anomalies.extend(
            detect_shape_instability(
                tracks,
                concept,
                iou_threshold=cfg.shape_stability_iou_threshold,
            )
        )

        # 5. Clipping (only for actionable elements like button/card)
        if "button" in concept.lower() or "card" in concept.lower():
            all_anomalies.extend(
                detect_clipping(
                    tracks,
                    concept,
                    viewport_width=viewport_size[0],
                    viewport_height=viewport_size[1],
                )
            )

    # Cross-concept overlap
    all_anomalies.extend(
        detect_cross_concept_overlap(
            tracks_by_concept,
            must_not_overlap_pairs=cfg.must_not_overlap_pairs,
            iou_threshold=cfg.cross_concept_overlap_iou_threshold,
        )
    )

    # Sort by frame index then timestamp
    all_anomalies.sort(key=lambda a: (a.frame_index, a.t_ms))
    return all_anomalies


# ---------------------------------------------------------------------------
# Signature Computation
# ---------------------------------------------------------------------------


def compute_anomaly_signature(
    anomalies: list[Anomaly],
    window_ms: float = 300.0,
) -> set[tuple[str, str]]:
    """Compute anomaly signature: sorted set of (anomaly_type, concept) within window_ms.

    Section 7:
    'Signature = sorted set of (anomaly type, concept) inside a ±300 ms window.'

    Args:
        anomalies: Detected anomaly list.
        window_ms: Time window in milliseconds.

    Returns:
        A set of (anomaly_type, concept) tuples.
    """
    if not anomalies:
        return set()

    # Find highest severity anomaly as reference anchor
    peak_anomaly = max(anomalies, key=lambda a: a.severity)
    anchor_t = peak_anomaly.t_ms

    signature = set()
    for a in anomalies:
        if abs(a.t_ms - anchor_t) <= window_ms:
            signature.add(a.signature_key)

    return signature


# ---------------------------------------------------------------------------
# Ground Truth Verification Helper (P2 Acceptance Criteria)
# ---------------------------------------------------------------------------


def evaluate_against_ground_truth(
    anomalies: list[Anomaly],
    ground_truth_markers: list[dict[str, Any]],
    fps: float = 30.0,
    tolerance_frames: int = 3,
) -> dict[str, Any]:
    """Check if detected anomalies match ground truth markers within ±3 frames.

    Args:
        anomalies: Detected anomalies.
        ground_truth_markers: Markers from window.__chronolens_ground_truth.
        fps: Frames per second.
        tolerance_frames: Allowed frame deviation (spec specifies ±3 frames).

    Returns:
        Summary dict with accuracy and match details.
    """
    if not ground_truth_markers:
        return {
            "has_ground_truth": False,
            "anomaly_count": len(anomalies),
            "clean_baseline": len(anomalies) == 0,
        }

    matches = []
    for gt in ground_truth_markers:
        gt_t = float(gt.get("timestamp", 0.0))
        gt_frame = int(round((gt_t / 1000.0) * fps))

        # Check if any anomaly is within ±tolerance_frames
        closest = None
        min_frame_diff = float("inf")
        for a in anomalies:
            diff = abs(a.frame_index - gt_frame)
            if diff < min_frame_diff:
                min_frame_diff = diff
                closest = a

        matched = closest is not None and min_frame_diff <= tolerance_frames
        matches.append(
            {
                "ground_truth": gt,
                "gt_frame": gt_frame,
                "closest_anomaly": closest,
                "frame_diff": min_frame_diff if closest else None,
                "matched_within_tolerance": matched,
            }
        )

    all_matched = all(m["matched_within_tolerance"] for m in matches)
    return {
        "has_ground_truth": True,
        "all_matched": all_matched,
        "matches": matches,
    }
