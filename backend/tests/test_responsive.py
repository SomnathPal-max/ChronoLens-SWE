"""Tests for Phase 6 Stretch Feature: Responsive Auto-Patcher."""

from __future__ import annotations

from pathlib import Path

import pytest
from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.responsive import (
    DEFAULT_RESPONSIVE_VIEWPORTS,
    audit_responsive,
    auto_patch_responsive,
)
from backend.app.pipeline.types import (
    AnomalyType,
    ResponsiveAuditResult,
    ResponsiveViewport,
)


def test_responsive_viewports_defaults() -> None:
    """Verify standard viewports are defined according to specification."""
    names = [vp.name for vp in DEFAULT_RESPONSIVE_VIEWPORTS]
    assert "desktop" in names
    assert "tablet" in names
    assert "mobile" in names

    desktop = next(vp for vp in DEFAULT_RESPONSIVE_VIEWPORTS if vp.name == "desktop")
    assert desktop.width == 1440
    assert desktop.height == 900

    mobile = next(vp for vp in DEFAULT_RESPONSIVE_VIEWPORTS if vp.name == "mobile")
    assert mobile.width == 390
    assert mobile.height == 844
    assert mobile.is_mobile is True


@pytest.mark.asyncio
async def test_responsive_audit_bug3() -> None:
    """Acceptance test: Bug 3 button clipping triggers on narrow viewports but not on desktop."""
    repo_root = Path(__file__).resolve().parents[2]
    run_dir = repo_root / "runs" / "test-responsive-audit"

    # Define test viewports: Desktop (1440) vs Mobile (360)
    viewports = [
        ResponsiveViewport(name="desktop", width=1440, height=900),
        ResponsiveViewport(name="mobile_narrow", width=360, height=640, is_mobile=True),
    ]

    result = await audit_responsive(
        base_url="http://localhost:5173",
        bug_number=3,
        run_dir=run_dir,
        viewports=viewports,
        config=DEFAULT_CONFIG,
    )

    assert isinstance(result, ResponsiveAuditResult)
    # Mobile should flag clipping anomaly
    assert "mobile_narrow" in result.anomalies_by_viewport
    mobile_anoms = result.anomalies_by_viewport["mobile_narrow"]
    has_clipping = any(a.anomaly_type == AnomalyType.CLIPPING for a in mobile_anoms)
    assert has_clipping is True

    # Desktop should be healthy
    desktop_anoms = result.anomalies_by_viewport["desktop"]
    assert len(desktop_anoms) == 0

    assert "mobile_narrow" in result.failing_viewports
    assert "desktop" in result.healthy_viewports
    assert result.has_clipping is True


@pytest.mark.asyncio
async def test_responsive_auto_patch_synthesis() -> None:
    """Verify that auto_patch_responsive synthesizes a valid worktree patch."""
    repo_root = Path(__file__).resolve().parents[2]

    viewports = [
        ResponsiveViewport(name="desktop", width=1440, height=900),
        ResponsiveViewport(name="mobile_narrow", width=360, height=640, is_mobile=True),
    ]

    # Pre-construct audit with a clipping anomaly
    audit = await audit_responsive(
        base_url="http://localhost:5173",
        bug_number=3,
        viewports=viewports,
        config=DEFAULT_CONFIG,
    )

    patched_audit = await auto_patch_responsive(
        audit_result=audit,
        repo_path=repo_root,
        client=None,
        config=DEFAULT_CONFIG,
        run_id="test-p6-resp",
    )

    assert patched_audit.patch_result is not None
    assert "chronolens/fix-" in patched_audit.patch_result.branch_name
    assert "Column.tsx" in patched_audit.patch_result.diff
    assert patched_audit.patch_result.tests_pass is True
    assert patched_audit.patch_result.lint_pass is True
