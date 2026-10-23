PROJECT RULES: ChronoLens-SWE
1. Python 3.11 with type hints; ruff for lint; pytest for metrics and pipeline tests.
2. Never hard-code keys. Read MODEL_API_KEY from the environment. .env stays in .gitignore.
3. All Meta API calls go through backend/app/clients/meta.py (retries, cost meter, logging).
4. SAM: exactly one concept per request. Never combine concepts in one prompt.
5. Videos sent to SAM must be H.264 MP4. Assert with ffprobe before upload.
6. Key SAM results by the frame marker in each line, never by line order.
7. Use meta-sam-parser for parsing. Request one_bit masks and include_confidence.
8. Patching happens in a git worktree on branch chronolens/fix-<run-id>. Never touch main.
   Never auto-merge. Never edit tests to make them pass.
9. Redact .env and secret-like strings before sending repo context to any model.
10. Each phase ends with: tests green, evidence saved under runs/, commit tagged phase-N.
11. Do not claim capabilities the Meta docs do not support (see Section 3 callout).
12. Prefer the simplest implementation that meets the acceptance criteria. Ask before adding scope.
