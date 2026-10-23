# Phase 5 Evidence: Time-Travel Scrubber UI (`web/`)

- **Milestone**: P5 (Days 7-8)
- **Status**: Completed

## Deliverables & Acceptance Criteria

1. **Synchronized Video Player & Canvas Overlay Engine (`web/src/components/VideoPlayer.tsx`, `CanvasOverlay.tsx`)**:
   - High-fidelity video playback synchronized with frame-level stepping (±1 frame / 33.3ms, ±1s, Play/Pause, 0.25x–2x speed controls).
   - High-precision canvas overlay rendering:
     - **SAM 3.1 Segmentation Masks**: Semi-transparent colored fills, boundary outlines, confidence badges, and concept tags (`kanban card`, `navbar`, `modal`, `add card button`).
     - **DOM Probe Bounding Boxes**: Dashed cyan projections matching live browser geometry.
     - **Visual Anomaly Indicators**: Pulsed danger halos highlighting detected regression windows ($t \pm 300\text{ms}$).
   - Layer toggles allowing independent activation of SAM masks, DOM boxes, and anomaly overlays.

2. **Multi-Track Synchronized Timeline Scrubber (`web/src/components/TimelineScrubber.tsx`)**:
   - Master time ruler with interactive scrub head cursor and millisecond-accurate seek.
   - **Track 1: Frame & Time Markers**: Time labels from 0.0s to 3.0s with frame index indicator.
   - **Track 2: Anomaly Track**: Color-coded anomaly markers (`teleport`, `cross_concept_overlap`, `clipping`). One-click jump instantly positions the player and telemetry at the defect.
   - **Track 3: DOM Probe Mutations Track**: Discrete indicators logging element position and attribute mutations.
   - **Track 4: HAR Network Calls Track**: Visual request duration spans (e.g., 795ms delayed `/api/cards/:id/move` request with stale response).

3. **Multi-Tab Root Cause & Telemetry Inspector (`web/src/components/Inspector/`)**:
   - **Root Cause & Patch Tab**:
     - Muse Wonder 1.0 hypothesis and confidence score meter (96%–98%).
     - Falsifiable check description and target file/line citations.
     - Interactive Git Diff Viewer with unified diff formatting, line numbers, and additions/deletions highlighting.
     - 5-Run Verification Card detailing pass/fail status, median shape-stability IoU (1.00), signature absence, and 100% stability score.
   - **DOM Probe Tab**:
     - Live DOM element properties at current scrubber position: `(x, y, w, h)`, `z-index`, `opacity`, `visibility`, `display`.
     - Stacking context warning detection (flagging `transform: translateZ(0)` traps).
   - **HAR Network Tab**:
     - Complete HTTP waterfall capture with method badges, status codes, and latency gauges.
     - Request / response payload inspection highlighting the stale snapshot causing the race condition.
   - **Anomalies Tab**:
     - Filterable anomaly registry with category tags, severity ratings, and direct time seek buttons.
   - **Pull Request Tab**:
     - Formatted GitHub PR markdown ready to copy to clipboard with summary, root cause, and verification table.
     - 1200×630 visual verification card preview (`before_after.png`).

4. **FastAPI Backend Integration & Live Streaming**:
   - Added REST endpoints in `backend/app/main.py`:
     - `GET /api/presets`: Discovers verified runs across Phase 4.
     - `GET /api/runs/{run_id}/session`: Delivers scrubber session JSON.
     - `GET /api/runs/{run_id}/report`: Returns full verification report.
     - `GET /api/runs/{run_id}/pr`: Returns generated pull request markdown.
     - Static file mounting for `/runs` and `/app` (`web/dist`).
   - New Run Modal providing live simulated / SSE progression through stages A–H: Ingest $\to$ Perceive $\to$ Detect $\to$ Reproduce $\to$ Root Cause $\to$ Patch $\to$ Verify $\to$ Report.

5. **Test Suite & Code Quality**:
   - **74 tests passing 100% green** in `backend/tests/` (including 6 new web API integration tests).
   - **100% clean Ruff lint & formatting** (`ruff check backend`, `ruff format --check backend`).
   - Frontend TypeScript compile clean with zero errors (`tsc && vite build`).
