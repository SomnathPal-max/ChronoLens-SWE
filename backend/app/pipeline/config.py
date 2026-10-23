"""Pipeline configuration — all detection thresholds live here.

Centralizes every tunable parameter so that nothing is scattered
across individual stage modules.  Import ``PipelineConfig`` and
override via constructor kwargs or environment variables.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SAMConfig:
    """Configuration for SAM 3.1 API calls.

    Attributes:
        one_bit: Request 1-bit masks from SAM.
        include_confidence: Include confidence scores in SAM responses.
        confidence_threshold: Minimum confidence to accept a mask.
    """

    one_bit: bool = True
    include_confidence: bool = True
    confidence_threshold: float = 0.5


@dataclass(frozen=True)
class DetectionConfig:
    """Detection thresholds for anomaly identification.

    All spatial thresholds are in pixels unless otherwise noted.

    Attributes:
        dropout_enabled: Enable dropout detection.
        flicker_window: Number of frames for instance flicker detection.
        teleport_threshold_px: Pixel distance to flag as teleport.
        teleport_multiplier_p99: Multiplier of p99 displacement to flag teleport.
        shape_stability_iou: Minimum IoU for shape stability.
        occlusion_ratio: Maximum overlap ratio before flagging occlusion.
        cross_concept_overlap_iou: Maximum IoU between different concepts.
        clipping_enabled: Enable viewport clipping detection.
    """

    dropout_enabled: bool = True
    flicker_window: int = 6
    teleport_threshold_px: float = 40.0
    teleport_multiplier_p99: float = 3.0
    shape_stability_iou: float = 0.85
    occlusion_ratio: float = 0.9
    cross_concept_overlap_iou: float = 0.05
    clipping_enabled: bool = True


@dataclass(frozen=True)
class VerifyConfig:
    """Configuration for the verification stage.

    Attributes:
        num_runs: Number of verification runs to perform.
    """

    num_runs: int = 5


@dataclass(frozen=True)
class PipelineConfig:
    """Top-level pipeline configuration aggregating all sub-configs.

    Attributes:
        sam: SAM 3.1 configuration.
        detection: Detection threshold configuration.
        verify: Verification stage configuration.
        run_dir: Base directory for storing run outputs.
    """

    sam: SAMConfig = field(default_factory=SAMConfig)
    detection: DetectionConfig = field(default_factory=DetectionConfig)
    verify: VerifyConfig = field(default_factory=VerifyConfig)
    run_dir: str = "runs"
