"""Shared data types for the ChronoLens-SWE pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any


class AnomalyType(StrEnum):
    """Types of visual anomalies the detector can flag."""

    DROPOUT = "dropout"
    INSTANCE_FLICKER = "instance_flicker"
    TELEPORT = "teleport"
    SHAPE_INSTABILITY = "shape_instability"
    OCCLUSION = "occlusion"
    CROSS_CONCEPT_OVERLAP = "cross_concept_overlap"
    CLIPPING = "clipping"


class RunStatus(StrEnum):
    """Status of a pipeline run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class FrameMask:
    """A single mask for one object in one frame."""

    frame_index: int
    t_ms: float
    object_id: int
    concept: str
    bbox: tuple[float, float, float, float]  # x, y, w, h
    confidence: float
    mask_rle: str | None = None
    mask_svg_path: str | None = None
    centroid: tuple[float, float] = (0.0, 0.0)
    area: float = 0.0


@dataclass
class Track:
    """A tracked object across frames."""

    concept: str
    object_id: int
    frames: dict[int, FrameMask] = field(default_factory=dict)  # keyed by frame_index

    @property
    def frame_range(self) -> tuple[int, int]:
        """Return (first_frame, last_frame) for this track."""
        indices = sorted(self.frames.keys())
        return (indices[0], indices[-1]) if indices else (0, 0)


@dataclass
class Anomaly:
    """A detected visual anomaly."""

    frame_index: int
    t_ms: float
    anomaly_type: AnomalyType
    concept: str
    severity: float  # 0.0 to 1.0
    details: dict = field(default_factory=dict)

    @property
    def signature_key(self) -> tuple[str, str]:
        """Key for anomaly signature matching: (type, concept)."""
        return (self.anomaly_type.value, self.concept)


@dataclass
class IngestResult:
    """Result of the ingest stage."""

    video_path: Path
    fps: float
    frame_count: int
    duration_s: float
    width: int
    height: int
    codec: str
    har_path: Path | None = None
    probe_log_path: Path | None = None
    raw_clip_path: Path | None = None
    output_dir: Path | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def h264_path(self) -> Path:
        return self.video_path

    @property
    def clip_path(self) -> Path:
        return self.raw_clip_path or self.video_path


@dataclass
class PerceiveResult:
    """Result of the perceive stage."""

    concepts: list[str]
    interaction: str
    suspect_window_ms: tuple[float, float] | None
    tracks: dict[str, list[Track]]  # keyed by concept
    transcript: str | None = None


@dataclass
class ReproResult:
    """Result of the reproduce stage."""

    matched: bool
    original_signature: set[tuple[str, str]]
    repro_signature: set[tuple[str, str]]
    repro_ingest: IngestResult | None = None
    repro_anomalies: list[Anomaly] = field(default_factory=list)
    playwright_script: str = ""
    attempt: int = 1


@dataclass
class RootCauseResult:
    """Result of the root-cause analysis."""

    hypothesis: str
    files: list[dict]  # [{path, lines, why}]
    evidence: list[dict]  # [{source, ref, t_ms}]
    falsifiable_check: str
    confidence: float


@dataclass
class PatchResult:
    """Result of the patching stage."""

    diff: str
    rationale: str
    branch_name: str
    worktree_path: Path | None = None
    tests_pass: bool = False
    lint_pass: bool = False


@dataclass
class VerifyResult:
    """Result of the verification stage."""

    passed: bool
    runs: int
    passes: int
    signature_absent_in_all: bool
    median_shape_iou: float
    new_anomaly_types: list[str] = field(default_factory=list)
    run_details: list[dict] = field(default_factory=list)


@dataclass
class ReportResult:
    """Result of the report stage."""

    report_json_path: Path
    before_after_card_path: Path | None = None
    pr_markdown: str = ""
    scrubber_session_path: Path | None = None
