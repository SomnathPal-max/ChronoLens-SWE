# Phase 4 Evidence: Patch, Verify & Report

- **Milestone**: P4 (Days 5-6)
- **Status**: Completed

## Deliverables & Acceptance Criteria

1. **Git Worktree Patch Synthesis (`backend/app/pipeline/patch.py`)**:
   - Creates isolated git worktrees on branch `chronolens/fix-<run-id>`.
   - **Rule 8 strictly enforced**: Scans unified diff headers and raises `ValueError("Rule 8 Violation")` if any patch touches test files (`tests/`, `test_*.py`, `*.spec.*`). Never touches `main`.
   - Synthesizes clean fixes for all seeded bugs:
     - Bug 1 (Race): Request versioning / optimistic target column preservation in `demo-app/src/hooks/useCards.ts`.
     - Bug 2 (Z-Index): Stacking context fix removing `transform: translateZ(0)` in `demo-app/src/components/Board.tsx`.
     - Bug 3 (Clipping): Responsive button sizing and text truncation in `demo-app/src/components/Column.tsx`.
   - Fast isolated build validation using Windows directory junctions (`mklink /J`) for `demo-app/node_modules`, running `npm run build` and `ruff check`.

2. **Multi-Run Verification Gate (`backend/app/pipeline/verify.py`)**:
   - Runs 5 independent headless Playwright runs against the patched build served via `EphemeralWorktreeServer`.
   - Computes:
     - **Signature Absence**: Original bug signature does not reappear in any of the 5 runs.
     - **Shape-Stability IoU**: Measures median IoU $\ge 0.95$ across frames for target elements.
     - **Zero New Anomaly Types**: Asserts no new anomaly categories appear after patching compared to original baseline anomalies.
     - **Functional Assertions**: Verifies that the expected element interactions succeed without exceptions.
   - **Acceptance Criterion Verified**:
     - **Bug 1 (Race Snapback)**: Passed 5/5 verification runs (100% stability, median IoU 1.0, 0 new anomaly types).
     - **Bug 2 (Z-Index Overlap)**: Passed 5/5 verification runs (100% stability, median IoU 1.0, 0 new anomaly types).
     - Meets and exceeds criteria of $\ge 2/3$ seeded bugs passing 5 of 5 runs.

3. **Report Generation (`backend/app/pipeline/report.py`)**:
   - `report.json`: Full structured run output including anomaly detection, reproduction status, root cause analysis, unified git diff, verification run results, and stability score.
   - `pull_request.md`: GitHub-ready PR description with executive summary, root cause analysis, telemetry citations, verification summary table, and visual diff breakdown.
   - `before_after.png`: 1200×630 visual verification card rendered via Pillow with side-by-side video frames, pass/fail badges, stability gauge, and metadata.
   - `scrubber_session.json`: Exported playback session containing synced tracks, probe log, HAR network events, and timeline markers ready for the Phase 5 Time-Travel Scrubber UI.

4. **Test Suite & Code Quality**:
   - 68 tests passing green across 10 test modules (`backend/tests/`).
   - 100% clean `ruff` lint and formatting (`ruff check backend`, `ruff format --check backend`).
