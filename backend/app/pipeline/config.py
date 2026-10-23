"""Pipeline configuration — all detection thresholds live here.

Centralizes every tunable parameter so that nothing is scattered
across individual stage modules. Import ``PipelineConfig`` and
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
        mask_encoding: String representation ("one_bit").
    """

    one_bit: bool = True
    include_confidence: bool = True
    confidence_threshold: float = 0.5
    mask_encoding: str = "one_bit"


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
        must_not_overlap_pairs: Pairs of concepts that must not visually overlap.
    """

    dropout_enabled: bool = True
    flicker_window: int = 6
    teleport_threshold_px: float = 40.0
    teleport_multiplier_p99: float = 3.0
    shape_stability_iou: float = 0.85
    occlusion_ratio: float = 0.9
    cross_concept_overlap_iou: float = 0.05
    clipping_enabled: bool = True
    must_not_overlap_pairs: tuple[tuple[str, str], ...] = (("modal dialog", "navigation bar"),)

    # Convenience aliases matching Section 7 spec terminology
    @property
    def min_confidence(self) -> float:
        return 0.5

    @property
    def flicker_window_frames(self) -> int:
        return self.flicker_window

    @property
    def teleport_min_px(self) -> float:
        return self.teleport_threshold_px

    @property
    def teleport_baseline_multiplier(self) -> float:
        return self.teleport_multiplier_p99

    @property
    def shape_stability_iou_threshold(self) -> float:
        return self.shape_stability_iou

    @property
    def cross_concept_overlap_iou_threshold(self) -> float:
        return self.cross_concept_overlap_iou


@dataclass(frozen=True)
class VerifyConfig:
    """Configuration for the verification stage.

    Attributes:
        num_runs: Number of verification runs to perform.
    """

    num_runs: int = 5


@dataclass(frozen=True)
class ModelConfig:
    """Model identifiers."""

    wonder_model: str = "muse-wonder"
    spark_model: str = "muse-spark-1.3"
    sam_model: str = "sam-3.1"


@dataclass(frozen=True)
class ConceptConfig:
    """Concept proposal configuration."""

    max_concepts: int = 5
    min_words: int = 1
    max_words: int = 4


@dataclass(frozen=True)
class PipelineConfig:
    """Top-level pipeline configuration aggregating all sub-configs.

    Attributes:
        sam: SAM 3.1 configuration.
        detection: Detection threshold configuration.
        verify: Verification stage configuration.
        models: Model configuration.
        concepts: Concept proposal configuration.
        run_dir: Base directory for storing run outputs.
    """

    sam: SAMConfig = field(default_factory=SAMConfig)
    detection: DetectionConfig = field(default_factory=DetectionConfig)
    verify: VerifyConfig = field(default_factory=VerifyConfig)
    models: ModelConfig = field(default_factory=ModelConfig)
    concepts: ConceptConfig = field(default_factory=ConceptConfig)
    run_dir: str = "runs"


DEFAULT_CONFIG = PipelineConfig()
