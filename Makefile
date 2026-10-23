.PHONY: install dev lint test record serve-demo serve-backend serve-web build-web

# ── Setup ──────────────────────────────────────────────────────────

install:
	cd backend && pip install -r requirements.txt
	cd demo-app && npm install
	playwright install chromium

dev:
	cd backend && pip install -r requirements-dev.txt
	cd demo-app && npm install
	playwright install chromium

# ── Lint & Test ────────────────────────────────────────────────────

lint:
	cd backend && ruff check .
	cd backend && ruff format --check .

test:
	cd backend && pytest -v

# ── Servers ────────────────────────────────────────────────────────

serve-demo:
	cd demo-app && npm run dev

serve-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

serve-web:
	cd web && npm run dev

build-web:
	cd web && npm run build

# ── Recording ──────────────────────────────────────────────────────
# Usage: make record BUG=1
#   Records the demo-app interaction for the given bug number
#   and converts to H.264 MP4 in runs/

BUG ?= 1
RUN_DIR = runs/bug-$(BUG)-$(shell date +%Y%m%d-%H%M%S)

record:
	@echo "Recording bug $(BUG)..."
	@mkdir -p $(RUN_DIR)
	cd backend && python -m app.pipeline.ingest --bug $(BUG) --out-dir ../$(RUN_DIR)
	@echo "Recording saved to $(RUN_DIR)"
