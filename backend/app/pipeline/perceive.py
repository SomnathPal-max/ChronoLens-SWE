"""Perceive stage — concept extraction and SAM tracking.

Sends each concept to SAM 3.1 one at a time (per project rule 4:
exactly one concept per request).  Results are keyed by the frame
marker in each SAM response line, never by line order (rule 6).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.types import IngestResult, PerceiveResult


async def perceive(
    ingest_result: IngestResult,
    client: MetaClient,
    config: PipelineConfig,
) -> PerceiveResult:
    """Run SAM 3.1 on the ingested video for each configured concept.

    For every concept, sends a single SAM request with the ingested
    H.264 video.  Parses results using ``meta-sam-parser`` with
    ``one_bit`` masks and ``include_confidence`` enabled.

    Args:
        ingest_result: Output from the ingest stage.
        client: The Meta API client singleton.
        config: Pipeline configuration with SAM settings.

    Returns:
        A ``PerceiveResult`` containing per-concept tracks.

    Raises:
        NotImplementedError: This is a stub for Phase 1.
    """
    raise NotImplementedError("perceive() will be implemented in Phase 2")
