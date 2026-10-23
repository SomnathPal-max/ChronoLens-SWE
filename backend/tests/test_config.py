"""Tests for pipeline configuration defaults."""

from __future__ import annotations

import pytest
from backend.app.pipeline.config import (
    DetectionConfig,
    PipelineConfig,
    SAMConfig,
    VerifyConfig,
)


class TestSAMConfig:
    """Tests for SAM configuration defaults."""

    def test_defaults(self) -> None:
        """SAM config has correct defaults per spec."""
        cfg = SAMConfig()
        assert cfg.one_bit is True
        assert cfg.include_confidence is True
        assert cfg.confidence_threshold == 0.5


class TestDetectionConfig:
    """Tests for detection threshold defaults."""

    def test_defaults(self) -> None:
        """Detection config has correct defaults per spec."""
        cfg = DetectionConfig()
        assert cfg.dropout_enabled is True
        assert cfg.flicker_window == 6
        assert cfg.teleport_threshold_px == 40.0
        assert cfg.teleport_multiplier_p99 == 3.0
        assert cfg.shape_stability_iou == 0.85
        assert cfg.occlusion_ratio == 0.9
        assert cfg.cross_concept_overlap_iou == 0.05
        assert cfg.clipping_enabled is True


class TestVerifyConfig:
    """Tests for verification config defaults."""

    def test_defaults(self) -> None:
        """Verify config has correct defaults."""
        cfg = VerifyConfig()
        assert cfg.num_runs == 5


class TestPipelineConfig:
    """Tests for top-level pipeline configuration."""

    def test_defaults(self) -> None:
        """Pipeline config creates sub-configs with correct defaults."""
        cfg = PipelineConfig()
        assert isinstance(cfg.sam, SAMConfig)
        assert isinstance(cfg.detection, DetectionConfig)
        assert isinstance(cfg.verify, VerifyConfig)
        assert cfg.run_dir == "runs"

    def test_custom_run_dir(self) -> None:
        """Pipeline config accepts custom run directory."""
        cfg = PipelineConfig(run_dir="/tmp/my-runs")
        assert cfg.run_dir == "/tmp/my-runs"

    def test_custom_detection_thresholds(self) -> None:
        """Pipeline config accepts custom detection thresholds."""
        custom_detect = DetectionConfig(
            flicker_window=10,
            teleport_threshold_px=60.0,
        )
        cfg = PipelineConfig(detection=custom_detect)
        assert cfg.detection.flicker_window == 10
        assert cfg.detection.teleport_threshold_px == 60.0
        # Other defaults should remain
        assert cfg.detection.shape_stability_iou == 0.85

    def test_frozen(self) -> None:
        """Pipeline config is frozen (immutable)."""
        cfg = PipelineConfig()
        with pytest.raises(AttributeError):
            cfg.run_dir = "new-dir"  # type: ignore[misc]
