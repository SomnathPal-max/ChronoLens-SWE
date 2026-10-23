# ChronoLens-SWE

> **ChronoLens-SWE** watches a broken UI the way a human does, frame by frame. It measures visual changes using Meta SAM 3.1 pixel masks, reproduces bugs deterministically in a headless browser, synthesizes fixes with Muse Wonder 1.0 in isolated git worktrees, and verifies the fix with multi-run stability gates.

Built for the **Meta Global AI Developer Hackathon** · Theme 1: Build for Your World · Indie track

---

## Architecture

```
 clip.mp4 + voice note or typed text
        |
 [A] INGEST ....... ffprobe + ffmpeg → H.264 MP4
        |
 [B] PERCEIVE ..... Voice Transcribe → transcript
        |           Muse Spark 1.3   → concepts, interaction, suspect window
        |           SAM 3.1 × N      → tracks.json (one concept per request)
        |
 [C] DETECT ....... per-track, per-frame metrics → anomalies[]
        |
 [D] REPRODUCE .... Muse Wonder → Playwright script; re-run B+C on repro clip
        |
 [E] ROOT CAUSE ... Muse Wonder (1M ctx): repo + probe + HAR + anomaly signature
        |
 [F] PATCH ........ Muse Wonder edits in an isolated git worktree (Rule 8 guarded)
        |
 [G] VERIFY ....... same script ×5; B+C again; 5/5 pass/fail gate
        |           fail → back to [E] with failure evidence (max 3 loops)
 [H] REPORT ....... before/after card, PR markdown, report.json, scrubber session
```

---

## Which Meta Model Does What

| Model | Role | Key Constraints |
|-------|------|-----------------|
| **SAM 3.1** | Pixel-level segmentation masks on video frames. | Exactly one concept per request (`one_bit` encoding, `include_confidence`, frame-marker keyed). |
| **Muse Wonder 1.0** | Frontier coding model (1M context). | Writes Playwright repro scripts, analyzes repo telemetry slices, generates unified diffs. |
| **Muse Spark 1.3** | Video understanding. | Extracts ≤5 noun phrases naming visible UI elements, interaction verb, suspect time window. |
| **Muse Voice Transcribe** | Speech-to-text. | Transcribes spoken voice notes describing bug symptoms into reproduction prompts. |

---

## Benchmark Results

Evaluated against the deterministic test subject Kanban app:

| Bug | Anomaly Detected | Frame Accuracy | Reproduced | Correct File | Patch 5/5 |
|-----|-----------------|----------------|------------|--------------|-----------|
| **1 Race** | ✅ Yes (`teleport` / `dropout`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/hooks/useCards.ts` | ✅ **5/5 Pass (100% stability)** |
| **2 Z-index** | ✅ Yes (`cross_concept_overlap`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/components/Board.tsx` | ✅ **5/5 Pass (100% stability)** |
| **3 Clipping** | ✅ Yes (`clipping`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/components/Column.tsx` | ✅ **Verified in Multi-Viewport Suite** |

- **Healthy Baseline**: 0 false positive anomalies detected on clean baseline runs.
- **Median Shape-Stability IoU**: **1.00** across verified runs (threshold $\ge 0.95$).
- **Regressions**: **0 new anomaly types** introduced by patches.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Chromium (installed via `playwright install chromium`)

```bash
# 1. Clone & Setup
git clone https://github.com/YOUR_USER/chronolens-swe.git
cd chronolens-swe

# 2. Install dependencies
make dev

# 3. Configure API key
cp .env.example .env
# Edit .env and set MODEL_API_KEY=your_key_here

# 4. Start the Demo Application
make serve-demo
# Open http://localhost:5173

# 5. Start the Time-Travel Scrubber UI
make serve-web
# Open http://localhost:3000
```

---

## Unified Command-Line Interface (CLI)

ChronoLens-SWE provides a single unified entry point (`backend/app/cli.py`):

```bash
# Multi-viewport responsive layout audit & auto-patching (Phase 6 Stretch Feature)
python -m backend.app.cli responsive --bug 3 --patch

# Record reproducible bug interaction to H.264 MP4
python -m backend.app.cli record --bug 1 --out-dir runs/recorded

# End-to-end diagnosis & root-cause pipeline
python -m backend.app.cli diagnose --bug 1

# Start FastAPI backend server
python -m backend.app.cli serve --port 8000
```

---

## Time-Travel Scrubber UI (`web/`)

The React + TypeScript + Vite + Tailwind interface at `web/` provides:
1. **Synchronized Video Player & Canvas Overlay**:
   - Frame-accurate playback (±1 frame / 33.3ms, ±1s, Play/Pause, 0.25x–2x speed).
   - Real-time canvas overlay projecting SAM 3.1 pixel masks, DOM probe bounding boxes, and pulsed red anomaly markers.
2. **Multi-Track Scrubber**:
   - Master time ruler with millisecond-precision playhead cursor.
   - Anomaly Track with click-to-seek jump buttons.
   - DOM Probe mutation indicators.
   - HAR Network waterfall with latency bars (highlighting the 800ms delayed stale move response).
3. **Telemetry & Root-Cause Inspector**:
   - Wonder 1.0 Root Cause hypothesis & confidence meter (96%–98%).
   - Interactive Git Diff viewer with additions/deletions syntax highlighting.
   - 5-Run Verification Card detailing IoU scores and stability metrics.
   - Live DOM element properties table with stacking context trap warnings.
   - GitHub Pull Request markdown generator with one-click copy.
   - Pipeline execution tracker with live SSE stage streaming.

---

## Stretch Feature: Responsive Auto-Patcher (`backend/app/pipeline/responsive.py`)

Audits applications across three standard viewports:
- **Desktop**: 1440×900
- **Tablet**: 768×1024
- **Mobile**: 390×844

Detects viewport-dependent regressions (`scrollWidth > clientWidth` text truncation and modal stacking context traps), synthesizes responsive fixes in isolated git worktrees, and verifies that narrow viewports are repaired with **zero regressions** on desktop displays.

---

## 2-Minute Demo Video Script

| Time | Scene | Narration / Action |
|------|-------|-------------------|
| **0:00–0:15** | Real UI Flicker & Snapback | *"Transient UI regressions—race condition snapbacks, z-index stacking traps, and mobile clipping—are notoriously hard to catch and reproduce. ChronoLens-SWE solves this by watching your UI frame-by-frame, exactly like a human engineer."* |
| **0:15–0:45** | Perception & SAM 3.1 Overlay | Upload bug clip and voice note. Muse Spark 1.3 extracts UI concepts. SAM 3.1 tracks each concept frame-by-frame. The timeline lights up with pixel masks, and the anomaly detector flags the exact snapback frame at $t=2085$ms. |
| **0:45–1:15** | Playwright Repro & Wonder 1.0 Root Cause | Headless browser reproduces the bug deterministically. Muse Wonder 1.0 ingests telemetry slices from the DOM probe and HAR network capture, diagnosing the race condition in `useCards.ts` with 96% confidence. |
| **1:15–1:40** | Worktree Patch & 5/5 Verification | Wonder 1.0 synthesizes a request versioning fix in an isolated git worktree (never touching main). Multi-run verification runs 5 tests: 5 of 5 pass with median shape IoU 1.00 and zero regressions. Visual before/after card and PR markdown generated. |
| **1:40–2:00** | Time-Travel Scrubber & Benchmark | Interactive scrubbing across video masks, DOM mutations, HAR network latency, and the final benchmark table (Bug 1, Bug 2, Bug 3 verified). |

---

## Seeded Bug Details (Ground Truth)

| Bug | Symptom | Seeded Cause | Target File |
|-----|---------|--------------|-------------|
| **1 Race** | Card snaps back and column flickers after drag | Optimistic update overwritten by 800ms delayed stale server response | `demo-app/src/hooks/useCards.ts` |
| **2 Z-index** | Modal sits under sticky navbar below ~900px | Parent container has `transform: translateZ(0)` creating an isolated stacking context | `demo-app/src/components/Board.tsx` |
| **3 Clipping** | "Add New Card" button label cut off at 360px | Fixed-width container (120px) with `white-space: nowrap` and `overflow: hidden` | `demo-app/src/components/Column.tsx` |

---

## Limitations

- SAM 3.1 is trained on natural images; UI element segmentation is zero-shot and calibrated with DOM bounding boxes.
- Maximum 16 tracked objects per frame (SAM API constraint).
- Race condition reproduction depends on network conditions; deterministic verification requires 5 test runs.
- Verification results are reported as empirical stability scores (5/5 runs pass), not formal mathematical proofs.

---

## Project Rules (Strictly Followed)

1. Python 3.11 with type hints; Ruff for lint and format; Pytest for metrics and pipeline tests (**79 tests green**).
2. Never hard-code keys. `MODEL_API_KEY` read strictly from environment. `.env` in `.gitignore`.
3. All Meta API calls go through `backend/app/clients/meta.py` (retries, cost meter, logging).
4. SAM: exactly one concept per request. Never combine concepts in one prompt.
5. Videos sent to SAM must be H.264 MP4. Asserted with ffprobe before upload.
6. Key SAM results by frame marker in each line, never by line order.
7. Use `meta-sam-parser` with `one_bit` masks and `include_confidence`.
8. Patching happens in a git worktree on branch `chronolens/fix-<run-id>`. Never touch main. Never edit tests to make them pass.
9. Redact `.env` and secret-like strings before sending repo context to any model.
10. Each phase ends with: tests green, evidence saved under `runs/`, commit tagged `phase-N`.

---

## License

MIT
