"""Unit tests for the perceive stage."""

from __future__ import annotations

from backend.app.pipeline.perceive import (
    build_tracks,
    parse_sam_response_records,
    validate_concept,
)
from backend.app.pipeline.types import FrameMask


def test_validate_concept() -> None:
    """Validate 1-4 word noun phrases per spec constraints."""
    assert validate_concept("kanban card") is True
    assert validate_concept("modal dialog") is True
    assert validate_concept("navigation bar") is True
    assert validate_concept("button") is True

    # Too many words
    assert validate_concept("the very large red card in the left column") is False
    # Empty
    assert validate_concept("") is False
    assert validate_concept("   ") is False
    # Commas
    assert validate_concept("card, button") is False
    # Questions
    assert validate_concept("is card moving?") is False
    # Disallowed imperative / verb
    assert validate_concept("drag the card") is False
    assert validate_concept("click button") is False


def test_build_tracks() -> None:
    """Test grouping FrameMask objects into Track instances."""
    masks = [
        FrameMask(
            frame_index=0,
            t_ms=0.0,
            object_id=1,
            concept="card",
            bbox=(10, 10, 50, 50),
            confidence=0.9,
            centroid=(35.0, 35.0),
            area=2500.0,
        ),
        FrameMask(
            frame_index=1,
            t_ms=33.3,
            object_id=1,
            concept="card",
            bbox=(12, 10, 50, 50),
            confidence=0.92,
            centroid=(37.0, 35.0),
            area=2500.0,
        ),
        FrameMask(
            frame_index=0,
            t_ms=0.0,
            object_id=2,
            concept="card",
            bbox=(100, 100, 50, 50),
            confidence=0.85,
            centroid=(125.0, 125.0),
            area=2500.0,
        ),
    ]

    tracks = build_tracks(masks, concept="card")
    assert len(tracks) == 2

    t1 = next(t for t in tracks if t.object_id == 1)
    assert len(t1.frames) == 2
    assert t1.frame_range == (0, 1)

    t2 = next(t for t in tracks if t.object_id == 2)
    assert len(t2.frames) == 1
    assert t2.frame_range == (0, 0)


def test_parse_sam_empty_output() -> None:
    """Empty or whitespace SAM output returns empty mask list."""
    assert parse_sam_response_records("", concept="card") == []
    assert parse_sam_response_records("   \n  ", concept="card") == []
