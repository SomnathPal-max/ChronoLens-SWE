"""Detect stage — anomaly detection from SAM tracks.

Applies the detection thresholds from ``PipelineConfig.detection``
to the tracks produced by the perceive stage.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.types import Anomaly, PerceiveResult


def detect(
    perceive_result: PerceiveResult,
    config: PipelineConfig,
) -> list[Anomaly]:
    """Detect visual anomalies from SAM tracking results.

    Checks for: dropout, instance flicker, teleportation,
    shape instability, occlusion, cross-concept overlap, and
    viewport clipping.

    Args:
        perceive_result: Output from the perceive stage.
        config: Pipeline configuration with detection thresholds.

    Returns:
        A list of detected ``Anomaly`` instances.

    Raises:
        NotImplementedError: This is a stub for Phase 1.
    """
    raise NotImplementedError("detect() will be implemented in Phase 3")
