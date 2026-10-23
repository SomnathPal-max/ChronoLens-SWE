# ChronoLens-SWE

> **ChronoLens-SWE** watches a broken UI the way a human does, frame by frame. It measures what changed using pixel masks, reproduces the bug deterministically in a headless browser, fixes the code, and verifies the fix with the same measurement.

Built for the **Meta Global AI Developer Hackathon** · Theme 1: Build for Your World · Indie track

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
 [F] PATCH ........ Muse Wonder edits in a git worktree
        |
 [G] VERIFY ....... same script ×5; B+C again; pass/fail gate
        |           fail → back to [E] with failure evidence (max 3 loops)
 [H] REPORT ....... before/after card, PR markdown, report.json, scrubber session
```

## Which Meta Model Does What

| Model | Role |
|-------|------|
| **SAM 3.1** | Pixel-level segmentation masks on video frames. One concept per request, `one_bit` encoding, confidence scores. |
| **Muse Wonder 1.0** | Frontier coding model (1M context). Writes Playwright scripts, performs root-cause analysis, generates patches. |
| **Muse Spark 1.3** | Video understanding. Extracts ≤5 noun phrases naming visible UI objects, the interaction, and suspect time window. |
| **Muse Voice Transcribe** | Speech-to-text for user voice notes describing the bug. |

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USER/chronolens-swe.git
cd chronolens-swe

# Install
make dev

# Set your API key
cp .env.example .env
# Edit .env and add your MODEL_API_KEY

# Start the demo app (has seeded bugs)
make serve-demo

# In another terminal, start the backend
make serve-backend

# Record a bug
make record BUG=1
```

## Demo App Bugs

| Bug | Symptom | Activated by |
|-----|---------|-------------|
| 1 Race | Card snaps back after drag, column flickers | `?bug=1` |
| 2 Z-index | Modal under sticky navbar below ~900px | `?bug=2` |
| 3 Clipping | Button label cut off at 360px width | `?bug=3` |

## Project Structure

```
chronolens-swe/
  AGENTS.md                        # Project rules
  docs/SPEC.md                     # Full specification
  backend/app/main.py              # FastAPI server
  backend/app/clients/meta.py      # Meta API client (sole gateway)
  backend/app/pipeline/            # Pipeline stages A–H
  backend/app/probe/               # DOM probe JS
  backend/tests/                   # Tests
  web/                             # Time-Travel Scrubber UI
  demo-app/                        # Kanban app with seeded bugs
  bench/                           # Benchmark runner
  runs/                            # Per-run artifacts (gitignored)
```

## Limitations

- SAM 3.1 is trained for natural imagery; UI element segmentation is zero-shot and may not always produce clean masks
- Maximum 16 tracked objects per frame (SAM limit)
- Race condition reproduction depends on seeded latency; real-world nondeterminism requires 5 verification runs
- Verification results are reported as stability scores, not mathematical proofs

## License

MIT
