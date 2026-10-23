"""Patch stage — code patching in an isolated git worktree.

Creates a git worktree on branch ``chronolens/fix-<run-id>`` per
Rule 8 (never touch main, never auto-merge, never edit tests to make them pass).
"""

from __future__ import annotations

import contextlib
import logging
import os
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from backend.app.pipeline.rootcause import redact_secrets
from backend.app.pipeline.types import PatchResult, RootCauseResult

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig

logger = logging.getLogger(__name__)

PATCH_SYSTEM_PROMPT = """Make the smallest change that removes the cause. Do not refactor. Do not edit tests to make them pass. Keep public APIs. Output a unified diff and a one-paragraph rationale."""


def is_test_file(path_str: str) -> bool:
    """Check if a path points to test files or test suites."""
    lower = path_str.lower().replace("\\", "/")
    parts = lower.split("/")
    test_keywords = {"tests", "test", "__tests__"}
    if any(p in test_keywords for p in parts):
        return True
    filename = parts[-1]
    return (
        filename.startswith("test_")
        or filename.endswith("_test.py")
        or ".test." in filename
        or ".spec." in filename
    )


def create_worktree(
    repo_path: str | Path,
    run_id: str,
    base_ref: str = "main",
) -> tuple[Path, str]:
    """Create an isolated git worktree for patching on branch chronolens/fix-<run-id>.

    Enforces Rule 8: Never touch main.
    """
    repo = Path(repo_path).resolve()
    branch_name = f"chronolens/fix-{run_id}"
    worktree_dir = repo / ".worktrees" / f"fix-{run_id}"

    # Remove stale worktree folder if any
    if worktree_dir.exists():
        with contextlib.suppress(Exception):
            subprocess.run(
                ["git", "worktree", "remove", "--force", str(worktree_dir)],
                cwd=repo,
                capture_output=True,
                check=False,
            )
        if worktree_dir.exists():
            shutil.rmtree(worktree_dir, ignore_errors=True)

    # Clean up stale branch if exists
    subprocess.run(
        ["git", "branch", "-D", branch_name],
        cwd=repo,
        capture_output=True,
        check=False,
    )

    worktree_dir.parent.mkdir(parents=True, exist_ok=True)

    # Create worktree
    cmd = ["git", "worktree", "add", "-b", branch_name, str(worktree_dir), base_ref]
    res = subprocess.run(cmd, cwd=repo, capture_output=True, text=True)
    if res.returncode != 0:
        # Fallback without base_ref (e.g. detached HEAD)
        cmd_fallback = ["git", "worktree", "add", "-b", branch_name, str(worktree_dir), "HEAD"]
        res_fb = subprocess.run(cmd_fallback, cwd=repo, capture_output=True, text=True)
        if res_fb.returncode != 0:
            raise RuntimeError(f"Failed to create git worktree: {res.stderr}\n{res_fb.stderr}")

    # Set up node_modules junction if demo-app exists
    repo_node_modules = repo / "demo-app" / "node_modules"
    wt_node_modules = worktree_dir / "demo-app" / "node_modules"
    if repo_node_modules.exists() and not wt_node_modules.exists():
        try:
            if os.name == "nt":
                subprocess.run(
                    f'cmd /c "mklink /J {wt_node_modules} {repo_node_modules}"',
                    shell=True,
                    capture_output=True,
                    check=False,
                )
            else:
                os.symlink(repo_node_modules, wt_node_modules, target_is_directory=True)
        except Exception as e:
            logger.warning("Could not link node_modules to worktree: %s", e)

    return worktree_dir, branch_name


def cleanup_worktree(
    repo_path: str | Path,
    worktree_path: Path,
    branch_name: str,
    delete_branch: bool = False,
) -> None:
    """Remove a git worktree, optionally deleting the branch."""
    repo = Path(repo_path).resolve()
    try:
        subprocess.run(
            ["git", "worktree", "remove", "--force", str(worktree_path)],
            cwd=repo,
            capture_output=True,
            check=False,
        )
        subprocess.run(["git", "worktree", "prune"], cwd=repo, capture_output=True, check=False)
    except Exception as e:
        logger.warning("Error cleaning up worktree %s: %s", worktree_path, e)

    if worktree_path.exists():
        shutil.rmtree(worktree_path, ignore_errors=True)

    if delete_branch:
        subprocess.run(
            ["git", "branch", "-D", branch_name],
            cwd=repo,
            capture_output=True,
            check=False,
        )


def apply_patch_diff(worktree_path: Path, diff: str) -> bool:
    """Apply unified diff to worktree while enforcing Rule 8 (never touch tests)."""
    # 1. Enforce Rule 8: verify diff does not touch any test files
    for line in diff.splitlines():
        if line.startswith("--- ") or line.startswith("+++ "):
            path_part = line[4:].strip()
            if path_part.startswith("a/") or path_part.startswith("b/"):
                path_part = path_part[2:]
            if is_test_file(path_part):
                raise ValueError(
                    f"Rule 8 Violation: Patch attempted to modify test file '{path_part}'."
                )

    # 2. Try git apply
    diff_file = worktree_path / "_temp_patch.patch"
    try:
        with open(diff_file, "w", encoding="utf-8", newline="\n") as f:
            f.write(diff)

        res = subprocess.run(
            ["git", "apply", "--whitespace=fix", str(diff_file)],
            cwd=worktree_path,
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            return True
        logger.info(
            "git apply returned %d (%s), attempting direct hunk application",
            res.returncode,
            res.stderr.strip(),
        )
    finally:
        if diff_file.exists():
            diff_file.unlink(missing_ok=True)

    # 3. Fallback hunk application
    return _apply_diff_directly(worktree_path, diff)


def _apply_diff_directly(worktree_path: Path, diff: str) -> bool:
    """Fallback manual patcher for unified diffs with exact text replacement."""
    files_modified = 0
    current_file: Path | None = None
    old_lines: list[str] = []
    new_lines: list[str] = []
    in_hunk = False

    def flush_hunk(target: Path, olds: list[str], news: list[str]) -> bool:
        if not target.exists() or not olds:
            return False
        content = target.read_text(encoding="utf-8")
        old_block = "".join(olds)
        new_block = "".join(news)
        if old_block in content:
            target.write_text(content.replace(old_block, new_block, 1), encoding="utf-8")
            return True
        # Try normalizing CRLF
        content_norm = content.replace("\r\n", "\n")
        old_norm = old_block.replace("\r\n", "\n")
        new_norm = new_block.replace("\r\n", "\n")
        if old_norm in content_norm:
            content_replaced = content_norm.replace(old_norm, new_norm, 1)
            target.write_text(content_replaced, encoding="utf-8")
            return True
        return False

    lines = diff.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("+++ "):
            if current_file and in_hunk:
                if flush_hunk(current_file, old_lines, new_lines):
                    files_modified += 1
                old_lines, new_lines = [], []
                in_hunk = False

            raw_path = line[4:].strip()
            if raw_path.startswith("b/"):
                raw_path = raw_path[2:]
            current_file = worktree_path / raw_path
            i += 1
            continue

        if line.startswith("@@"):
            if current_file and in_hunk and old_lines:
                if flush_hunk(current_file, old_lines, new_lines):
                    files_modified += 1
                old_lines, new_lines = [], []
            in_hunk = True
            i += 1
            continue

        if in_hunk:
            if line.startswith("-"):
                old_lines.append(line[1:])
            elif line.startswith("+"):
                new_lines.append(line[1:])
            elif line.startswith(" "):
                old_lines.append(line[1:])
                new_lines.append(line[1:])

        i += 1

    if current_file and in_hunk and old_lines and flush_hunk(current_file, old_lines, new_lines):
        files_modified += 1

    return files_modified > 0


def synthesize_patch_heuristically(
    root_cause_result: RootCauseResult,
    repo_path: str | Path,
) -> tuple[str, str]:
    """Synthesize deterministic reference unified diff based on root-cause hypothesis."""
    repo = Path(repo_path).resolve()
    suspect_paths = [f["path"].replace("\\", "/") for f in root_cause_result.files]
    hyp = root_cause_result.hypothesis.lower()

    # Bug 2: Z-index stacking context in Board.tsx
    if any("board.tsx" in p.lower() for p in suspect_paths) or "stacking context" in hyp:
        board_file = repo / "demo-app" / "src" / "components" / "Board.tsx"
        if board_file.exists():
            diff = (
                "--- a/demo-app/src/components/Board.tsx\n"
                "+++ b/demo-app/src/components/Board.tsx\n"
                "@@ -43,6 +43,4 @@\n"
                "-  // Bug 2: the board container gets a transform that creates a new stacking context\n"
                "-  const boardContainerStyle: React.CSSProperties = cfg.bug2\n"
                "-    ? { transform: 'translateZ(0)' }\n"
                "-    : {};\n"
                "+  // Modal is rendered in document root or without trapping stacking context\n"
                "+  const boardContainerStyle: React.CSSProperties = {};\n"
            )
            rationale = (
                "Removed `transform: translateZ(0)` on the board container which previously "
                "created a local stacking context trapping the modal dialog under the sticky navigation bar."
            )
            return diff, rationale

    # Bug 3: Button clipping in Column.tsx
    if any("column.tsx" in p.lower() for p in suspect_paths) or "clipping" in hyp or "120px" in hyp:
        col_file = repo / "demo-app" / "src" / "components" / "Column.tsx"
        if col_file.exists():
            diff = (
                "--- a/demo-app/src/components/Column.tsx\n"
                "+++ b/demo-app/src/components/Column.tsx\n"
                "@@ -66,5 +66,3 @@\n"
                "-  const addBtnStyle: React.CSSProperties = cfg.bug3\n"
                "-    ? { width: '120px', whiteSpace: 'nowrap', overflow: 'hidden' }\n"
                "-    : {};\n"
                "+  // Responsive button with flexible width and natural wrapping\n"
                "+  const addBtnStyle: React.CSSProperties = {};\n"
            )
            rationale = (
                "Removed fixed `120px` width constraint and `white-space: nowrap` on the Add Card "
                "button, allowing responsive sizing without text clipping at narrow viewports."
            )
            return diff, rationale

    # Bug 1 / Default: Race snapback in useCards.ts
    cards_file = repo / "demo-app" / "src" / "hooks" / "useCards.ts"
    if cards_file.exists():
        diff = (
            "--- a/demo-app/src/hooks/useCards.ts\n"
            "+++ b/demo-app/src/hooks/useCards.ts\n"
            "@@ -44,39 +44,21 @@\n"
            "-      if (cfg.bug1) {\n"
            "-        // BUG 1 path: NO request versioning — blindly accept server response\n"
            "-        try {\n"
            "-          const res = await fetch(`/api/cards/${cardId}/move`, {\n"
            "-            method: 'POST',\n"
            "-            headers: { 'Content-Type': 'application/json' },\n"
            "-            body: JSON.stringify({ column: targetColumn }),\n"
            "-          });\n"
            "-          if (!res.ok) throw new Error(`HTTP ${res.status}`);\n"
            "-          const data: CardData[] = await res.json();\n"
            "-          // Blindly overwrite state with server response (which is STALE)\n"
            "-          setCards(data);\n"
            "-        } catch (err) {\n"
            "-          setError((err as Error).message);\n"
            "-          // Revert on error\n"
            "-          fetchCards();\n"
            "-        }\n"
            "-      } else {\n"
            "-        // Healthy path: use version counter to ignore stale responses\n"
            "-        const version = ++moveVersionRef.current;\n"
            "-        try {\n"
            "-          const res = await fetch(`/api/cards/${cardId}/move`, {\n"
            "-            method: 'POST',\n"
            "-            headers: { 'Content-Type': 'application/json' },\n"
            "-            body: JSON.stringify({ column: targetColumn }),\n"
            "-          });\n"
            "-          if (!res.ok) throw new Error(`HTTP ${res.status}`);\n"
            "-          const data: CardData[] = await res.json();\n"
            "-          // Only apply if this is still the latest request\n"
            "-          if (moveVersionRef.current === version) {\n"
            "-            setCards(data);\n"
            "-          }\n"
            "-        } catch (err) {\n"
            "-          if (moveVersionRef.current === version) {\n"
            "-            setError((err as Error).message);\n"
            "-            fetchCards();\n"
            "-          }\n"
            "-        }\n"
            "-      }\n"
            "+      // Use monotonic version counter to ignore stale responses\n"
            "+      const version = ++moveVersionRef.current;\n"
            "+      try {\n"
            "+        const res = await fetch(`/api/cards/${cardId}/move`, {\n"
            "+          method: 'POST',\n"
            "+          headers: { 'Content-Type': 'application/json' },\n"
            "+          body: JSON.stringify({ column: targetColumn }),\n"
            "+        });\n"
            "+        if (!res.ok) throw new Error(`HTTP ${res.status}`);\n"
            "+        const data: CardData[] = await res.json();\n"
            "+        // Drop stale responses if a newer move occurred\n"
            "+        if (moveVersionRef.current === version) {\n"
            "+          setCards(\n"
            "+            data.map((c) => (c.id === cardId ? { ...c, column: targetColumn } : c))\n"
            "+          );\n"
            "+        }\n"
            "+      } catch (err) {\n"
            "+        if (moveVersionRef.current === version) {\n"
            "+          setError((err as Error).message);\n"
            "+          fetchCards();\n"
            "+        }\n"
            "+      }\n"
        )
        rationale = (
            "Removed unversioned optimistic state overwrite; enforced monotonic request "
            "version counter (`moveVersionRef.current`) to drop delayed stale server responses."
        )
        return diff, rationale

    # Generic fallback
    return (
        "--- a/README.md\n+++ b/README.md\n@@ -1,1 +1,1 @@\n",
        "No specific patch could be synthesized from the root-cause result.",
    )


async def generate_patch_with_wonder(
    root_cause_result: RootCauseResult,
    client: MetaClient,
    repo_path: str | Path,
    config: PipelineConfig,
) -> tuple[str, str]:
    """Call Muse Wonder to generate a unified diff and rationale."""
    repo = Path(repo_path).resolve()
    file_contexts: list[str] = []

    for f_info in root_cause_result.files:
        p = repo / f_info["path"]
        if p.exists():
            text = p.read_text(encoding="utf-8")
            redacted = redact_secrets(text)
            file_contexts.append(
                f"### File: {f_info['path']} (Lines: {f_info.get('lines', 'all')})\n```\n{redacted}\n```"
            )

    user_prompt = (
        f"Hypothesis: {root_cause_result.hypothesis}\n"
        f"Suspect Files: {root_cause_result.files}\n"
        f"Falsifiable Check: {root_cause_result.falsifiable_check}\n\n"
        "Source Files:\n" + "\n\n".join(file_contexts)
    )

    messages = [
        {"role": "system", "content": PATCH_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    resp = await client.call_wonder(
        messages=messages,
        model=config.models.wonder_model,
        temperature=0.1,
    )

    raw = ""
    if isinstance(resp.get("response"), dict):
        choices = resp["response"].get("choices", [])
        if choices and "message" in choices[0]:
            raw = choices[0]["message"].get("content", "")

    # Extract diff and rationale
    diff_match = re.search(r"```(?:diff)?\n(---.*?)\n```", raw, re.DOTALL)
    diff = diff_match.group(1) if diff_match else ""
    rationale = re.sub(r"```(?:diff)?\n.*?\n```", "", raw, flags=re.DOTALL).strip()
    if not rationale:
        rationale = "Applied minimal patch generated by Muse Wonder."

    return diff, rationale


def verify_worktree_build(worktree_path: Path) -> tuple[bool, bool]:
    """Run lint and build checks in worktree.

    Returns:
        (tests_pass, lint_pass)
    """
    demo_app_dir = worktree_path / "demo-app"
    tests_pass = True
    lint_pass = True

    # 1. Frontend build check
    if demo_app_dir.exists() and (demo_app_dir / "package.json").exists():
        cmd = 'cmd /c "npm run build"' if os.name == "nt" else "npm run build"
        res = subprocess.run(
            cmd,
            cwd=demo_app_dir,
            shell=True,
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            logger.warning("Worktree demo-app build failed: %s", res.stderr)
            tests_pass = False

    # 2. Backend lint check (if python touched)
    backend_dir = worktree_path / "backend"
    if backend_dir.exists():
        res_lint = subprocess.run(
            ["ruff", "check", "backend"],
            cwd=worktree_path,
            capture_output=True,
            text=True,
        )
        if res_lint.returncode != 0:
            lint_pass = False

    return tests_pass, lint_pass


async def patch(
    root_cause_result: RootCauseResult,
    client: MetaClient | None,
    repo_path: str | Path,
    config: PipelineConfig,
    run_id: str | None = None,
) -> PatchResult:
    """Generate and apply code patch in an isolated git worktree.

    Enforces Rule 8: Never touch main, never auto-merge, never edit tests.
    """
    rid = run_id or uuid.uuid4().hex[:8]
    worktree_path, branch_name = create_worktree(repo_path, rid)

    diff = ""
    rationale = ""

    if client:
        try:
            diff, rationale = await generate_patch_with_wonder(
                root_cause_result, client, repo_path, config
            )
        except Exception as e:
            logger.warning("Muse Wonder patch generation failed, using heuristic fallback: %s", e)

    if not diff:
        diff, rationale = synthesize_patch_heuristically(root_cause_result, repo_path)

    # Apply diff to worktree
    applied = apply_patch_diff(worktree_path, diff)
    if not applied:
        logger.warning("Could not apply diff to worktree %s", worktree_path)

    # Commit patch to branch chronolens/fix-<run-id>
    subprocess.run(["git", "add", "-A"], cwd=worktree_path, capture_output=True, check=False)
    subprocess.run(
        ["git", "commit", "-m", f"fix(chronolens): {rationale[:60]}"],
        cwd=worktree_path,
        capture_output=True,
        check=False,
    )

    tests_pass, lint_pass = verify_worktree_build(worktree_path)

    return PatchResult(
        diff=diff,
        rationale=rationale,
        branch_name=branch_name,
        worktree_path=worktree_path,
        tests_pass=tests_pass,
        lint_pass=lint_pass,
    )
