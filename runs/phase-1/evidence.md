# Phase 1 Evidence: Demo App with Seeded Bugs & Recording Pipeline

- **Milestone**: P1 (Days 1-2)
- **Status**: Completed

## Deliverables & Acceptance Criteria
1. **Three Seeded Deterministic Bugs in Demo Kanban App**:
   - **Bug 1 (Race Condition)**: Fast drag triggers optimistic move, followed by an 800ms delayed stale server response that overwrites state without request versioning (`?bug=1`).
     - Ground truth marker logged: `{'bug': 1, 'type': 'race-snapback', 'element': 'card-1', 'description': 'Stale response overwrote optimistic move'}`
   - **Bug 2 (Z-Index / Stacking Context)**: Card click opens modal under sticky navbar below 900px width due to `transform: translateZ(0)` on board container (`?bug=2`).
     - Ground truth marker logged: `{'bug': 2, 'type': 'z-index-trap', 'element': 'modal', 'description': 'Modal trapped under navbar due to stacking context from transform'}`
   - **Bug 3 (Clipping / Overflow)**: Fixed-width button container with `white-space: nowrap` and `overflow: hidden` at 360px viewport width (`?bug=3`).
     - Ground truth marker logged: `{'bug': 3, 'type': 'clipping', 'element': 'add-card-btn', 'description': 'Add New Card button label is cut off at narrow viewport'}`
   - **Healthy Baseline**: Tested with 0 ground truth markers and 0 anomalies.

2. **DOM Probe & Ingest Recording Pipeline**:
   - `chronolens-probe.js` automatically injected via Playwright `page.add_init_script`.
   - Records requestAnimationFrame element states for `[data-cl]` selectors + MutationObserver stream.
   - Saves HAR network capture and probe logs with ground truth timestamps.
   - Automatically converts Playwright WebM to H.264 MP4 using FFmpeg and asserts valid H.264 stream with FFprobe before saving.

3. **Recordings Verified**:
   - `runs/phase-1/test-p1-bug1/bug1.mp4`: H.264, 1280x720 @ 30fps, 158 frames, 5.3s
   - `runs/phase-1/test-p1-bug2/bug2.mp4`: H.264, 1280x720 @ 30fps, 168 frames, 5.6s
   - `runs/phase-1/test-p1-bug3/bug3.mp4`: H.264, 1280x720 @ 30fps, 134 frames, 4.5s
   - `runs/phase-1/test-p1-baseline/baseline.mp4`: H.264, 1280x720 @ 30fps, 102 frames, 3.4s
