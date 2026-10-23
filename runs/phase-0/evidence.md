# Phase 0 Evidence: Project Scaffold & SAM 3.1 Noun Phrases

- **Milestone**: P0 (Oct 23 to 25)
- **Status**: Completed

## Deliverables & Acceptance Criteria
1. **Repository Scaffold**:
   - `AGENTS.md` with project rules
   - `docs/SPEC.pdf` and `docs/SPEC.md`
   - `backend/pyproject.toml`, `requirements.txt`, `requirements-dev.txt`
   - Clean package layouts for `backend/app` (`clients`, `pipeline`, `probe`)
   - `demo-app/` React + Vite + TypeScript application
   - `bench/` benchmark directory with `results.md` and reference fixes
   - `runs/` directory for run artifacts
   - Makefile with all commands

2. **Evaluated Noun Phrases for SAM 3.1**:
   - Documented in `docs/NOUN_PHRASES.md`
   - Validated against Meta API constraints: exactly one short noun phrase (1-4 words) per request, `one_bit` encoding, `include_confidence=True`.

3. **Backend Foundation**:
   - `MetaClient` sole gateway implemented with exponential backoff retries and `CostMeter`
   - All 35 unit tests passing 100% green
