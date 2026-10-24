"""ChronoLens-SWE API server.

Routes:
    POST /runs              — start a new pipeline run
    GET  /runs/{id}         — get run status and results
    GET  /runs/{id}/events  — SSE stream of live run events
    GET  /health            — health check
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ChronoLens-SWE",
    description="AI-powered visual regression debugger using Meta SAM 3.1",
    version="0.1.0",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for runs and web frontend
_repo_root = Path(__file__).resolve().parents[2]
_runs_dir = _repo_root / "runs"
if _runs_dir.exists():
    app.mount("/runs", StaticFiles(directory=str(_runs_dir)), name="runs")

_web_dist = _repo_root / "web" / "dist"
if _web_dist.exists():
    _assets_dir = _web_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="web_assets")
    app.mount("/app", StaticFiles(directory=str(_web_dist), html=True), name="web_app")

_demo_dist = _repo_root / "demo-app" / "dist"
if _demo_dist.exists():
    app.mount("/demo", StaticFiles(directory=str(_demo_dist), html=True), name="demo_app")


# ---------------------------------------------------------------------------
# In-memory run storage & Demo Kanban state
# ---------------------------------------------------------------------------

_runs: dict[str, dict[str, Any]] = {}
_run_events: dict[str, list[dict[str, Any]]] = {}

_INITIAL_CARDS: list[dict[str, Any]] = [
    {
        "id": "card-1",
        "title": "Design login page",
        "description": "Create wireframes and mockups for the login page.",
        "column": "todo",
        "priority": "high",
        "assignee": "Alice",
    },
    {
        "id": "card-2",
        "title": "Setup CI/CD pipeline",
        "description": "Configure GitHub Actions for build and deploy.",
        "column": "todo",
        "priority": "medium",
        "assignee": "Bob",
    },
    {
        "id": "card-3",
        "title": "Write unit tests",
        "description": "Add Jest tests for the auth module.",
        "column": "todo",
        "priority": "low",
        "assignee": "Carol",
    },
    {
        "id": "card-4",
        "title": "API rate limiting",
        "description": "Implement rate limiting middleware.",
        "column": "inprogress",
        "priority": "high",
        "assignee": "Dave",
    },
    {
        "id": "card-5",
        "title": "Database migration",
        "description": "Migrate user table to new schema.",
        "column": "inprogress",
        "priority": "medium",
        "assignee": "Eve",
    },
    {
        "id": "card-6",
        "title": "Deploy staging",
        "description": "Push latest build to staging environment.",
        "column": "done",
        "priority": "low",
        "assignee": "Frank",
    },
    {
        "id": "card-7",
        "title": "Code review PR #42",
        "description": "Review and approve the feature branch.",
        "column": "done",
        "priority": "medium",
        "assignee": "Grace",
    },
]
_server_cards: list[dict[str, Any]] = [dict(c) for c in _INITIAL_CARDS]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.api_route("/", methods=["GET", "HEAD"])
async def root() -> Any:
    """Root route: serves the web scrubber UI or redirects to /docs."""
    index_file = _web_dist / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return RedirectResponse(url="/docs")


@app.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Status and version information.
    """
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/cards")
async def get_cards() -> list[dict[str, Any]]:
    """Return Kanban board cards."""
    return [dict(c) for c in _server_cards]


@app.post("/api/cards/{card_id}/move")
async def move_card(
    card_id: str,
    payload: dict[str, Any],
    bug: int | None = None,
) -> list[dict[str, Any]]:
    """Move a Kanban card. Injects 800ms delay and stale state if bug=1."""
    target_column = payload.get("column", "todo")
    stale_snapshot = [dict(c) for c in _server_cards]

    found = False
    for card in _server_cards:
        if card["id"] == card_id:
            card["column"] = target_column
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")

    if bug == 1:
        await asyncio.sleep(0.8)
        return stale_snapshot

    return [dict(c) for c in _server_cards]


@app.get("/api/presets")
async def get_presets() -> list[dict[str, Any]]:
    """Return available verified presets from Phase 4."""
    presets: list[dict[str, Any]] = []
    p4_dir = _repo_root / "runs" / "phase-4"
    if p4_dir.exists():
        for bug_dir in sorted(p4_dir.iterdir()):
            report_file = bug_dir / "report.json"
            if report_file.exists():
                try:
                    data = json.loads(report_file.read_text(encoding="utf-8"))
                    presets.append(
                        {
                            "run_id": data.get("run_id", bug_dir.name),
                            "bug_number": data.get("bug_number"),
                            "status": data.get("status"),
                            "stability_score": data.get("stability_score"),
                        }
                    )
                except Exception:
                    pass
    return presets


@app.get("/api/runs/{run_id}/session")
async def get_run_session(run_id: str) -> dict[str, Any]:
    """Get the scrubber session JSON for a given run."""
    candidate_paths = [
        _repo_root / "runs" / "phase-4" / run_id / "scrubber_session.json",
        _repo_root / "runs" / run_id / "scrubber_session.json",
    ]
    for path in candidate_paths:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    raise HTTPException(status_code=404, detail=f"Scrubber session for {run_id} not found")


@app.get("/api/runs/{run_id}/report")
async def get_run_report(run_id: str) -> dict[str, Any]:
    """Get the report JSON for a given run."""
    candidate_paths = [
        _repo_root / "runs" / "phase-4" / run_id / "report.json",
        _repo_root / "runs" / run_id / "report.json",
    ]
    for path in candidate_paths:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    raise HTTPException(status_code=404, detail=f"Report for {run_id} not found")


@app.get("/api/runs/{run_id}/pr")
async def get_run_pr(run_id: str) -> dict[str, str]:
    """Get the pull request markdown for a given run."""
    candidate_paths = [
        _repo_root / "runs" / "phase-4" / run_id / "pull_request.md",
        _repo_root / "runs" / run_id / "pull_request.md",
    ]
    for path in candidate_paths:
        if path.exists():
            return {"markdown": path.read_text(encoding="utf-8")}
    raise HTTPException(status_code=404, detail=f"PR for {run_id} not found")


@app.post("/runs", status_code=201)
async def create_run(
    clip: UploadFile = File(...),
    description: str = Form(""),
    repo_path: str = Form(""),
    app_start_command: str = Form(""),
    base_url: str = Form("http://localhost:5173"),
) -> dict[str, Any]:
    """Start a new pipeline run.

    Accepts a video clip (multipart upload), along with metadata
    describing the bug and the target repository.

    Args:
        clip: Uploaded video clip file.
        description: Human-readable description of the bug.
        repo_path: Path to the repository under test.
        app_start_command: Command to start the target application.
        base_url: Base URL where the app will be available.

    Returns:
        Dictionary with the ``run_id`` and initial status.
    """
    run_id = str(uuid.uuid4())
    run_dir = Path("runs") / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save uploaded clip
    clip_path = run_dir / (clip.filename or "clip.webm")
    content = await clip.read()
    clip_path.write_bytes(content)

    run_data: dict[str, Any] = {
        "run_id": run_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "description": description,
        "repo_path": repo_path,
        "app_start_command": app_start_command,
        "base_url": base_url,
        "clip_path": str(clip_path),
        "result": None,
        "error": None,
    }

    _runs[run_id] = run_data
    _run_events[run_id] = []

    # Start pipeline in background
    asyncio.create_task(_run_pipeline(run_id))

    logger.info("Created run %s for clip %s", run_id, clip.filename)

    return {"run_id": run_id, "status": "pending"}


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict[str, Any]:
    """Get run status and results.

    Args:
        run_id: The unique run identifier.

    Returns:
        Full run data including status, results, and errors.

    Raises:
        HTTPException: 404 if the run is not found.
    """
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return _runs[run_id]


@app.get("/runs/{run_id}/events")
async def get_run_events(run_id: str) -> StreamingResponse:
    """SSE stream of live run events.

    Yields Server-Sent Events (SSE) as the pipeline progresses
    through its stages.

    Args:
        run_id: The unique run identifier.

    Returns:
        A streaming SSE response.

    Raises:
        HTTPException: 404 if the run is not found.
    """
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    async def event_generator():
        """Yield SSE events for the given run."""
        import json

        last_index = 0
        while True:
            events = _run_events.get(run_id, [])
            for event in events[last_index:]:
                yield f"data: {json.dumps(event)}\n\n"
                last_index += 1

            # Check if run is complete
            run = _runs.get(run_id)
            if run and run["status"] in ("completed", "failed"):
                yield f"data: {json.dumps({'type': 'done', 'status': run['status']})}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Background pipeline execution
# ---------------------------------------------------------------------------


def _emit_event(run_id: str, event_type: str, data: dict[str, Any] | None = None) -> None:
    """Emit a pipeline event for SSE streaming.

    Args:
        run_id: The run to emit the event for.
        event_type: Type of event (e.g. ``"stage_start"``, ``"stage_complete"``).
        data: Additional event data.
    """
    event: dict[str, Any] = {
        "type": event_type,
        "timestamp": datetime.now().isoformat(),
        **(data or {}),
    }
    _run_events.setdefault(run_id, []).append(event)


async def _run_pipeline(run_id: str) -> None:
    """Execute the full pipeline for a run.

    Runs each stage sequentially, updating status and emitting
    events along the way.

    Args:
        run_id: The run to execute.
    """
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.ingest import ingest

    run = _runs[run_id]
    run["status"] = "running"
    _emit_event(run_id, "pipeline_start")

    config = PipelineConfig(run_dir=str(Path("runs") / run_id))

    try:
        # Stage 1: Ingest
        _emit_event(run_id, "stage_start", {"stage": "ingest"})
        ingest_result = await ingest(run["clip_path"], config.run_dir)
        _emit_event(run_id, "stage_complete", {"stage": "ingest"})

        # Stage 2–8: stubs — will be wired in later phases
        # Each stage would follow the same pattern:
        #   _emit_event(run_id, "stage_start", {"stage": "<name>"})
        #   result = await stage_func(...)
        #   _emit_event(run_id, "stage_complete", {"stage": "<name>"})

        run["status"] = "completed"
        run["result"] = {
            "ingest": {
                "h264_path": ingest_result.h264_path,
                "metadata": ingest_result.metadata,
            },
        }
        _emit_event(run_id, "pipeline_complete")

    except Exception as exc:
        logger.exception("Pipeline failed for run %s", run_id)
        run["status"] = "failed"
        run["error"] = str(exc)
        _emit_event(run_id, "pipeline_error", {"error": str(exc)})
