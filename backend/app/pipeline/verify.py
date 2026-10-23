"""Verify stage — multi-run verification of applied patches.

Runs the patched application multiple times (default 5) to confirm
the fix is stable and does not introduce regressions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.types import PatchResult, VerifyResult


async def verify(
    patch_result: PatchResult,
    client: MetaClient,
    config: PipelineConfig,
    num_runs: int = 5,
) -> VerifyResult:
    """Run the patched application multiple times to verify the fix.

    Launches the app from the worktree, records each run, and
    re-runs the detection pipeline to confirm the anomaly is gone.

    Args:
        patch_result: Output from the patch stage.
        client: The Meta API client singleton.
        config: Pipeline configuration.
        num_runs: Number of verification runs (default 5).

    Returns:
        A ``VerifyResult`` with pass/fail counts and run details.

    Raises:
        NotImplementedError: This is a stub for Phase 1.
    """
    raise NotImplementedError("verify() will be implemented in Phase 7")
