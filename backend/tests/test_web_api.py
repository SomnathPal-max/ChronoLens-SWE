"""Tests for ChronoLens Web UI API routes and session endpoints."""

from __future__ import annotations

import pytest
from backend.app.main import app
from starlette.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_check(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "version": "0.1.0"}


def test_api_presets(client: TestClient) -> None:
    res = client.get("/api/presets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    # At least p4-bug1, p4-bug2, p4-bug3 exist in runs/phase-4
    run_ids = [item.get("run_id") for item in data]
    assert "p4-bug1" in run_ids


def test_api_run_session_found(client: TestClient) -> None:
    res = client.get("/api/runs/p4-bug1/session")
    assert res.status_code == 200
    data = res.json()
    assert data["run_id"] == "p4-bug1"
    assert data["bug_number"] == 1
    assert "frames" in data
    assert "root_cause" in data
    assert "verification" in data


def test_api_run_report_found(client: TestClient) -> None:
    res = client.get("/api/runs/p4-bug1/report")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PASSED"
    assert data["bug_number"] == 1
    assert data["patch"]["branch"] == "chronolens/fix-p4-bug1"


def test_api_run_pr_found(client: TestClient) -> None:
    res = client.get("/api/runs/p4-bug1/pr")
    assert res.status_code == 200
    data = res.json()
    assert "markdown" in data
    assert "ChronoLens-SWE" in data["markdown"] or "Fix" in data["markdown"]


def test_api_run_not_found(client: TestClient) -> None:
    res = client.get("/api/runs/non-existent-run-id-9999/session")
    assert res.status_code == 404
