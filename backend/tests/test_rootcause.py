"""Tests for root-cause analysis stage (Phase 3)."""

from __future__ import annotations

from pathlib import Path

import pytest
from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.rootcause import (
    deduce_root_cause_heuristically,
    redact_secrets,
    root_cause,
)
from backend.app.pipeline.types import Anomaly, AnomalyType, ReproResult


def test_redact_secrets() -> None:
    """Project Rule 9: Redact .env and secret-like strings before sending context."""
    raw = (
        "MODEL_API_KEY=sk-abcdef1234567890abcdef1234567890\n"
        "GITHUB_TOKEN=ghp_123456789012345678901234567890123456\n"
        "DATABASE_URL=postgres://user:password123@localhost:5432/db\n"
    )
    redacted = redact_secrets(raw)
    assert "sk-abcdef1234567890abcdef1234567890" not in redacted
    assert "ghp_123456789012345678901234567890123456" not in redacted
    assert "[REDACTED]" in redacted


def test_deduce_root_cause_heuristically_bug1() -> None:
    """Bug 1: Race condition names useCards.ts."""
    repro = ReproResult(
        matched=True,
        original_signature={("teleport", "kanban card")},
        repro_signature={("teleport", "kanban card")},
    )
    sources = {"demo-app/src/hooks/useCards.ts": "..."}
    res = deduce_root_cause_heuristically(repro, sources)
    assert any("useCards.ts" in f["path"] for f in res.files)
    assert len(res.evidence) >= 2


def test_deduce_root_cause_heuristically_bug2() -> None:
    """Bug 2: Z-index modal overlap names Board.tsx."""
    repro = ReproResult(
        matched=True,
        original_signature={("cross_concept_overlap", "modal dialog_vs_navigation bar")},
        repro_signature={("cross_concept_overlap", "modal dialog_vs_navigation bar")},
    )
    sources = {"demo-app/src/components/Board.tsx": "..."}
    res = deduce_root_cause_heuristically(repro, sources)
    assert any("Board.tsx" in f["path"] for f in res.files)
    assert len(res.evidence) >= 2


def test_deduce_root_cause_heuristically_bug3() -> None:
    """Bug 3: Clipping names Column.tsx."""
    repro = ReproResult(
        matched=True,
        original_signature={("clipping", "action button")},
        repro_signature={("clipping", "action button")},
    )
    sources = {"demo-app/src/components/Column.tsx": "..."}
    res = deduce_root_cause_heuristically(repro, sources)
    assert any("Column.tsx" in f["path"] for f in res.files)
    assert len(res.evidence) >= 2


@pytest.mark.asyncio
async def test_p3_root_cause_names_correct_file_benchmark() -> None:
    """Acceptance criterion: Root cause names correct file for at least 2 of 3 bugs."""
    repo_root = Path(__file__).resolve().parents[2]

    correct_files_count = 0

    # 1. Bug 1: Expected demo-app/src/hooks/useCards.ts
    repro1 = ReproResult(
        matched=True,
        original_signature={("teleport", "kanban card")},
        repro_signature={("teleport", "kanban card")},
        repro_anomalies=[
            Anomaly(
                frame_index=62,
                t_ms=2085.0,
                anomaly_type=AnomalyType.TELEPORT,
                concept="kanban card",
                severity=1.0,
            )
        ],
    )
    rc1 = await root_cause(repro1, client=None, repo_path=str(repo_root), config=DEFAULT_CONFIG)
    if any("useCards.ts" in f["path"] for f in rc1.files):
        correct_files_count += 1

    # 2. Bug 2: Expected demo-app/src/components/Board.tsx
    repro2 = ReproResult(
        matched=True,
        original_signature={("cross_concept_overlap", "modal dialog_vs_navigation bar")},
        repro_signature={("cross_concept_overlap", "modal dialog_vs_navigation bar")},
        repro_anomalies=[
            Anomaly(
                frame_index=36,
                t_ms=1217.0,
                anomaly_type=AnomalyType.CROSS_CONCEPT_OVERLAP,
                concept="modal dialog_vs_navigation bar",
                severity=0.9,
            )
        ],
    )
    rc2 = await root_cause(repro2, client=None, repo_path=str(repo_root), config=DEFAULT_CONFIG)
    if any("Board.tsx" in f["path"] for f in rc2.files):
        correct_files_count += 1

    # 3. Bug 3: Expected demo-app/src/components/Column.tsx
    repro3 = ReproResult(
        matched=True,
        original_signature={("clipping", "action button")},
        repro_signature={("clipping", "action button")},
        repro_anomalies=[
            Anomaly(
                frame_index=6,
                t_ms=208.0,
                anomaly_type=AnomalyType.CLIPPING,
                concept="action button",
                severity=0.9,
            )
        ],
    )
    rc3 = await root_cause(repro3, client=None, repo_path=str(repo_root), config=DEFAULT_CONFIG)
    if any("Column.tsx" in f["path"] for f in rc3.files):
        correct_files_count += 1

    # Acceptance criteria: Root cause names correct file for at least 2 of 3
    assert correct_files_count >= 2
    assert correct_files_count == 3  # All 3 identified correctly
