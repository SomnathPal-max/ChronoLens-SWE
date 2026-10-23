# Phase 3 Evidence: DOM Probe, Reproduce Loop & Root Cause

- **Milestone**: P3 (Days 4-5)
- **Status**: Completed

## Deliverables & Acceptance Criteria
1. **Playwright Reproduce Loop (`backend/app/pipeline/reproduce.py`)**:
   - Generates Playwright interaction automation using Muse Wonder or heuristic synthesis.
   - Executes headlessly with DOM probe injection (`chronolens-probe.js`), HAR recording, video recording, and sync flash.
   - Converts WebM to H.264 MP4 and computes anomaly signatures on the repro clip.
   - Matches anomaly signatures: `Signature = sorted set of (anomaly type, concept) inside ±300 ms window`.
   - **Acceptance Criterion Verified**: Signature match on 3 of 3 bugs (exceeds requirement of $\ge 2/3$) on attempt 1.

2. **Root-Cause Analysis Engine (`backend/app/pipeline/rootcause.py`)**:
   - Strictly enforces the Section 9 system prompt and JSON schema.
   - Redacts `.env` and secret-like strings (tokens, API keys, passwords) before sending to any model context (Rule 9).
   - Ingests telemetry slices ($\pm 300\text{ms}$ around anomaly peak) from probe log, HAR capture, and console.
   - Identifies hypothesis, exact file paths, line ranges, and falsifiable checks.
   - **Acceptance Criterion Verified**: Root cause correctly identified the exact target file for 3 of 3 bugs:
     - Bug 1: `demo-app/src/hooks/useCards.ts` (race condition / missing request versioning)
     - Bug 2: `demo-app/src/components/Board.tsx` (CSS transform stacking context trap)
     - Bug 3: `demo-app/src/components/Column.tsx` (fixed width button clipping)

3. **Test Suite**:
   - 53 tests passing 100% green with pytest.
   - Ruff lint & format 100% clean.
