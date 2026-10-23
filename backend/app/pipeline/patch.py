"""Patch stage — code patching in a git worktree.

Creates a git worktree on branch ``chronolens/fix-<run-id>`` (per
rule 8: never touch main, never auto-merge, never edit tests to
make them pass).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.types import PatchResult, RootCauseResult


async def patch(
    root_cause_result: RootCauseResult,
    client: MetaClient,
    repo_path: str,
    config: PipelineConfig,
) -> PatchResult:
    """Generate and apply a code patch in a git worktree.

    Creates a worktree on ``chronolens/fix-<run-id>``, generates a
    patch using Muse Wonder, and applies it.  Never touches main,
    never auto-merges, and never edits tests (rules 8).

    Args:
        root_cause_result: Output from the root-cause analysis.
        client: The Meta API client singleton.
        repo_path: Path to the target repository.
        config: Pipeline configuration.

    Returns:
        A ``PatchResult`` with the worktree path and applied diff.

    Raises:
        NotImplementedError: This is a stub for Phase 1.
    """
    raise NotImplementedError("patch() will be implemented in Phase 6")
