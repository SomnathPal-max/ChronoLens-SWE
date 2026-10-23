"""Tests for the patch stage (Phase 4).

Enforces Rule 8:
- Never touch main
- Never auto-merge
- Never edit tests to make them pass
- Isolated git worktree on chronolens/fix-<run-id>
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.patch import (
    apply_patch_diff,
    cleanup_worktree,
    create_worktree,
    is_test_file,
    patch,
    synthesize_patch_heuristically,
)
from backend.app.pipeline.types import RootCauseResult


def test_is_test_file_enforcement() -> None:
    """Rule 8: Ensure test files are detected and rejected from patches."""
    assert is_test_file("backend/tests/test_patch.py")
    assert is_test_file("tests/test_ingest.py")
    assert is_test_file("demo-app/src/__tests__/app.test.tsx")
    assert is_test_file("demo-app/src/components/Board.spec.ts")
    assert not is_test_file("demo-app/src/components/Board.tsx")
    assert not is_test_file("demo-app/src/hooks/useCards.ts")
    assert not is_test_file("demo-app/src/components/Column.tsx")


def test_apply_patch_diff_rejects_test_modification(tmp_path: Path) -> None:
    """Rule 8: apply_patch_diff must raise ValueError if diff touches test files."""
    test_diff = (
        "--- a/backend/tests/test_fake.py\n"
        "+++ b/backend/tests/test_fake.py\n"
        "@@ -1,1 +1,1 @@\n"
        "-assert False\n"
        "+assert True\n"
    )
    with pytest.raises(ValueError, match="Rule 8 Violation"):
        apply_patch_diff(tmp_path, test_diff)


def test_synthesize_patch_bug1() -> None:
    """Test patch synthesis for Bug 1 (Race snapback)."""
    repo_root = Path(__file__).resolve().parents[2]
    rc = RootCauseResult(
        hypothesis="Optimistic card move is overwritten by an asynchronous stale server response",
        files=[
            {"path": "demo-app/src/hooks/useCards.ts", "lines": "44-57", "why": "stale overwrite"}
        ],
        evidence=[],
        falsifiable_check="check version",
        confidence=0.95,
    )
    diff, rationale = synthesize_patch_heuristically(rc, repo_root)
    assert "useCards.ts" in diff
    assert "moveVersionRef" in diff or "version" in diff
    assert len(rationale) > 10


def test_synthesize_patch_bug2() -> None:
    """Test patch synthesis for Bug 2 (Z-index stacking context)."""
    repo_root = Path(__file__).resolve().parents[2]
    rc = RootCauseResult(
        hypothesis="Modal rendered inside container with transform creating stacking context",
        files=[
            {
                "path": "demo-app/src/components/Board.tsx",
                "lines": "43-46",
                "why": "transform translateZ",
            }
        ],
        evidence=[],
        falsifiable_check="remove transform",
        confidence=0.95,
    )
    diff, rationale = synthesize_patch_heuristically(rc, repo_root)
    assert "Board.tsx" in diff
    assert "boardContainerStyle" in diff
    assert len(rationale) > 10


def test_synthesize_patch_bug3() -> None:
    """Test patch synthesis for Bug 3 (Button clipping)."""
    repo_root = Path(__file__).resolve().parents[2]
    rc = RootCauseResult(
        hypothesis="Add Card button has fixed width of 120px with white-space: nowrap causing clipping",
        files=[
            {"path": "demo-app/src/components/Column.tsx", "lines": "66-68", "why": "fixed 120px"}
        ],
        evidence=[],
        falsifiable_check="remove fixed width",
        confidence=0.95,
    )
    diff, rationale = synthesize_patch_heuristically(rc, repo_root)
    assert "Column.tsx" in diff
    assert "addBtnStyle" in diff
    assert len(rationale) > 10


def test_worktree_creation_and_cleanup() -> None:
    """Test creating an isolated git worktree on chronolens/fix-<run-id> and cleaning up."""
    repo_root = Path(__file__).resolve().parents[2]
    run_id = "test-wt-01"

    worktree_path, branch_name = create_worktree(repo_root, run_id)
    try:
        assert worktree_path.exists()
        assert branch_name == f"chronolens/fix-{run_id}"

        # Verify branch in worktree
        res = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=worktree_path,
            capture_output=True,
            text=True,
        )
        assert res.stdout.strip() == branch_name
    finally:
        cleanup_worktree(repo_root, worktree_path, branch_name, delete_branch=True)
        assert not worktree_path.exists()


@pytest.mark.asyncio
async def test_full_patch_stage_on_bug2() -> None:
    """Test full patch stage execution in isolated worktree for Bug 2."""
    repo_root = Path(__file__).resolve().parents[2]
    run_id = "test-patch-b2"

    rc = RootCauseResult(
        hypothesis="Modal rendered inside transformed container creating stacking context",
        files=[
            {
                "path": "demo-app/src/components/Board.tsx",
                "lines": "43-46",
                "why": "transform translateZ",
            }
        ],
        evidence=[],
        falsifiable_check="remove transform",
        confidence=0.95,
    )

    patch_res = await patch(
        root_cause_result=rc,
        client=None,
        repo_path=repo_root,
        config=DEFAULT_CONFIG,
        run_id=run_id,
    )

    try:
        assert patch_res.branch_name == f"chronolens/fix-{run_id}"
        assert patch_res.worktree_path is not None
        assert patch_res.worktree_path.exists()
        assert "Board.tsx" in patch_res.diff
        assert patch_res.tests_pass is True

        # Verify Board.tsx in worktree was actually modified
        board_in_wt = patch_res.worktree_path / "demo-app" / "src" / "components" / "Board.tsx"
        content = board_in_wt.read_text(encoding="utf-8")
        assert "translateZ(0)" not in content
    finally:
        if patch_res.worktree_path:
            cleanup_worktree(
                repo_root, patch_res.worktree_path, patch_res.branch_name, delete_branch=True
            )
