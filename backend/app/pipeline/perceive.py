"""Perceive stage — concept extraction and SAM tracking.

Sends each concept to SAM 3.1 one at a time (per project rule 4:
exactly one concept per request). Results are keyed by the frame
marker in each SAM response line, never by line order (rule 6).
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import re
from pathlib import Path
from typing import TYPE_CHECKING

import meta_sam_parser
from backend.app.pipeline.types import FrameMask, PerceiveResult, Track

if TYPE_CHECKING:
    from backend.app.clients.meta import MetaClient
    from backend.app.pipeline.config import PipelineConfig
    from backend.app.pipeline.types import IngestResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Concept Validation & Extraction (Muse Spark 1.3 prompt rules)
# ---------------------------------------------------------------------------


def validate_concept(phrase: str) -> bool:
    """Validate a concept phrase per spec constraints.

    Must be:
    - 1 to 4 words
    - No commas
    - No verbs (basic heuristic: no common verb endings or imperative commands)
    - Non-empty

    Args:
        phrase: The concept phrase candidate.

    Returns:
        True if the phrase conforms to constraints, False otherwise.
    """
    clean = phrase.strip()
    if not clean or "," in clean or clean.endswith("?"):
        return False
    words = clean.split()
    if not (1 <= len(words) <= 4):
        return False

    # Disallow common imperatives / verbs
    lowered = [w.lower() for w in words]
    disallowed_first_words = {"show", "find", "click", "drag", "check", "verify", "highlight"}
    return lowered[0] not in disallowed_first_words


async def extract_concepts_with_spark(
    video_path: str,
    client: MetaClient,
    config: PipelineConfig,
    user_prompt: str = "",
) -> tuple[list[str], str, tuple[float, float] | None]:
    """Use Muse Spark 1.3 to propose up to 5 concrete UI concept noun phrases.

    Args:
        video_path: Path to the ingested H.264 MP4.
        client: Meta client singleton.
        config: Pipeline configuration.
        user_prompt: Optional user note or description.

    Returns:
        Tuple of (concepts, interaction, suspect_window_ms).
    """
    prompt = (
        "Analyze this UI screen recording. "
        "1. Propose at most 5 short noun phrases (1-4 words each, no commas, no verbs) "
        "naming concrete visible UI objects (e.g. 'kanban card', 'modal dialog', "
        "'navigation bar', 'action button'). "
        "2. Identify the interaction performed. "
        "3. Identify the suspect time window in milliseconds where an anomaly occurred. "
        "Return ONLY a JSON object with keys: "
        '{"concepts": ["..."], "interaction": "...", "suspect_window_ms": [start, end]}'
    )
    if user_prompt:
        prompt += f"\nUser reported: {user_prompt}"

    resp = await client.call_spark(video_path, prompt, model=config.models.spark_model)
    raw_text = ""
    if isinstance(resp.get("response"), dict):
        choices = resp["response"].get("choices", [])
        if choices and "message" in choices[0]:
            raw_text = choices[0]["message"].get("content", "")

    # Parse JSON from response
    concepts = []
    interaction = "user interaction"
    suspect_window_ms = None

    try:
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            raw_concepts = data.get("concepts", [])
            concepts = [c for c in raw_concepts if validate_concept(c)][
                : config.concepts.max_concepts
            ]
            interaction = data.get("interaction", interaction)
            if "suspect_window_ms" in data and len(data["suspect_window_ms"]) == 2:
                suspect_window_ms = (
                    float(data["suspect_window_ms"][0]),
                    float(data["suspect_window_ms"][1]),
                )
    except Exception as e:
        logger.warning("Failed to parse Spark concept proposal JSON: %s", e)

    # Fallback default UI concepts if none proposed
    if not concepts:
        concepts = ["kanban card", "navigation bar", "modal dialog", "action button"]

    return concepts, interaction, suspect_window_ms


# ---------------------------------------------------------------------------
# SAM Response Parsing with meta-sam-parser
# ---------------------------------------------------------------------------


def parse_sam_response_records(
    raw_sam_output: str,
    concept: str,
    fps: float = 30.0,
    min_confidence: float = 0.5,
) -> list[FrameMask]:
    """Parse special-token text output from SAM 3.1 using meta-sam-parser.

    Key results by the frame marker on each record, never by line order (rule 6).

    Args:
        raw_sam_output: The special-token stream or string from SAM 3.1.
        concept: The concept string for this SAM run.
        fps: Video frames per second.
        min_confidence: Minimum confidence threshold (drops records below this).

    Returns:
        List of FrameMask instances.
    """
    if not raw_sam_output.strip():
        return []

    fmt = meta_sam_parser.video_segmentation_format()
    parser = fmt.create_parser()
    parser.push(raw_sam_output)
    result = parser.finish(meta_sam_parser.CompletedOutcome())

    frame_masks: list[FrameMask] = []

    for record in getattr(result, "records", ()):
        if not isinstance(record, meta_sam_parser.SegmentationMaskRecord):
            continue

        # Confidence filter
        conf = getattr(record, "confidence", 1.0)
        if conf is not None and conf < min_confidence:
            continue

        # Rule 6: read frame marker, never line order
        frame_idx = 0
        if hasattr(record, "frame") and record.frame is not None:
            if hasattr(record.frame, "index"):
                frame_idx = int(record.frame.index)
            else:
                try:
                    frame_idx = int(record.frame)
                except (ValueError, TypeError):
                    frame_idx = 0

        t_ms = (frame_idx / fps) * 1000.0
        obj_id = getattr(record, "object_id", 0)

        # Bounding box
        bounds = getattr(record, "bounds", None)
        if bounds is not None:
            bbox = (
                float(getattr(bounds, "x", 0.0)),
                float(getattr(bounds, "y", 0.0)),
                float(getattr(bounds, "width", 0.0)),
                float(getattr(bounds, "height", 0.0)),
            )
        else:
            bbox = (0.0, 0.0, 0.0, 0.0)

        centroid = (bbox[0] + bbox[2] / 2.0, bbox[1] + bbox[3] / 2.0)
        area = bbox[2] * bbox[3]

        # Masks
        mask_rle_str = None
        mask_svg = None
        if hasattr(record, "mask") and record.mask is not None:
            with contextlib.suppress(Exception):
                rle_obj = meta_sam_parser.decode_mask_to_rle(record.mask)
                mask_rle_str = str(rle_obj)

            with contextlib.suppress(Exception):
                mask_svg = meta_sam_parser.decode_mask_to_svg_path(record.mask)

        frame_masks.append(
            FrameMask(
                frame_index=frame_idx,
                t_ms=t_ms,
                object_id=obj_id,
                concept=concept,
                bbox=bbox,
                confidence=float(conf) if conf is not None else 1.0,
                mask_rle=mask_rle_str,
                mask_svg_path=mask_svg,
                centroid=centroid,
                area=area,
            )
        )

    return frame_masks


def build_tracks(frame_masks: list[FrameMask], concept: str) -> list[Track]:
    """Group FrameMask records into Track objects keyed by object_id.

    Args:
        frame_masks: Parsed frame masks for a single concept.
        concept: The concept name.

    Returns:
        List of Track objects.
    """
    by_object: dict[int, Track] = {}
    for fm in frame_masks:
        if fm.object_id not in by_object:
            by_object[fm.object_id] = Track(concept=concept, object_id=fm.object_id)
        by_object[fm.object_id].frames[fm.frame_index] = fm

    return list(by_object.values())


# ---------------------------------------------------------------------------
# Top-level Perceive Runner
# ---------------------------------------------------------------------------


async def perceive(
    ingest_result: IngestResult,
    client: MetaClient,
    config: PipelineConfig,
    concepts_override: list[str] | None = None,
    user_prompt: str = "",
) -> PerceiveResult:
    """Run SAM 3.1 on the ingested video for each configured concept.

    Per project rule 4: exactly one concept per request. Fan out in parallel.
    Per project rule 6: key SAM results by the frame marker, never line order.

    Args:
        ingest_result: Output from the ingest stage.
        client: The Meta API client singleton.
        config: Pipeline configuration with SAM and detection settings.
        concepts_override: Explicit concepts list to skip Spark proposal.
        user_prompt: User note describing the issue.

    Returns:
        A ``PerceiveResult`` containing per-concept tracks.
    """
    video_path_str = str(ingest_result.video_path)
    fps = ingest_result.fps
    frame_count = ingest_result.frame_count

    if concepts_override:
        concepts = [c for c in concepts_override if validate_concept(c)]
        interaction = "user interaction"
        suspect_window_ms = None
    else:
        concepts, interaction, suspect_window_ms = await extract_concepts_with_spark(
            video_path_str, client, config, user_prompt=user_prompt
        )

    logger.info("Perceive: tracking %d concepts in parallel: %s", len(concepts), concepts)

    # Fan out SAM 3.1 requests in parallel (Rule 4: exactly one concept per request)
    async def _track_single_concept(concept: str) -> tuple[str, list[Track]]:
        resp = await client.call_sam(
            video_path=video_path_str,
            concept=concept,
            one_bit=config.sam.mask_encoding == "one_bit",
            include_confidence=config.sam.include_confidence,
            video_frames=frame_count,
        )
        # Extract text response containing special tokens
        raw_output = ""
        res_data = resp.get("response", {})
        if isinstance(res_data, dict):
            choices = res_data.get("choices", [])
            if choices and "message" in choices[0]:
                raw_output = choices[0]["message"].get("content", "")

        masks = parse_sam_response_records(
            raw_output,
            concept=concept,
            fps=fps,
            min_confidence=config.detection.min_confidence,
        )
        tracks = build_tracks(masks, concept=concept)
        return concept, tracks

    results = await asyncio.gather(*[_track_single_concept(c) for c in concepts])
    tracks_by_concept: dict[str, list[Track]] = {c: trs for c, trs in results}

    return PerceiveResult(
        concepts=concepts,
        interaction=interaction,
        suspect_window_ms=suspect_window_ms,
        tracks=tracks_by_concept,
    )


# ---------------------------------------------------------------------------
# Offline / Hybrid Truth: DOM Probe to Tracks Translator
# ---------------------------------------------------------------------------


def generate_tracks_from_probe_log(
    probe_log_path: Path | str | list | dict,
    fps: float = 30.0,
) -> PerceiveResult:
    """Generate PerceiveResult directly from a recorded chronolens probe log.

    This implements the hybrid truth mechanism (Section 4):
    DOM element states (bounding client rects, visibility, z-index, data-cl)
    produce exact reference tracks for deterministic validation and offline testing.

    Args:
        probe_log_path: Path to the JSON probe log produced by ingest, or in-memory list/dict.
        fps: Video frames per second.

    Returns:
        A ``PerceiveResult`` with tracks for all tracked UI elements.
    """
    if isinstance(probe_log_path, (list, dict)):
        data = probe_log_path
    else:
        path = Path(probe_log_path)
        if not path.exists():
            raise FileNotFoundError(f"Probe log file not found: {path}")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

    if isinstance(data, list):
        probe_entries = data
    elif isinstance(data, dict):
        probe_entries = data.get("probe_log") or data.get("events") or []
    else:
        probe_entries = []

    def _map_concept(data_cl: str | None, tag: str) -> str:
        if not data_cl:
            return tag
        if data_cl.startswith("card-"):
            return "kanban card"
        if data_cl.startswith("column-"):
            return "kanban column"
        if data_cl == "navbar":
            return "navigation bar"
        if data_cl == "modal":
            return "modal dialog"
        if data_cl == "add-card-btn":
            return "action button"
        return data_cl

    tracks_by_concept: dict[str, dict[int, Track]] = {}
    element_id_map: dict[str, int] = {}
    next_id = 1

    raf_entries = [e for e in probe_entries if e.get("type") == "raf"]

    for frame_idx, entry in enumerate(raf_entries):
        t_ms = float(entry.get("timestamp", (frame_idx / fps) * 1000.0))
        elements = entry.get("elements", [])

        for el in elements:
            data_cl = el.get("dataCl")
            if not data_cl:
                continue

            concept = _map_concept(data_cl, el.get("tagName", "div"))
            rect = el.get("rect", {})
            bbox = (
                float(rect.get("x", 0.0)),
                float(rect.get("y", 0.0)),
                float(rect.get("width", 0.0)),
                float(rect.get("height", 0.0)),
            )

            if data_cl not in element_id_map:
                element_id_map[data_cl] = next_id
                next_id += 1
            obj_id = element_id_map[data_cl]

            if concept not in tracks_by_concept:
                tracks_by_concept[concept] = {}
            if obj_id not in tracks_by_concept[concept]:
                tracks_by_concept[concept][obj_id] = Track(concept=concept, object_id=obj_id)

            centroid = (bbox[0] + bbox[2] / 2.0, bbox[1] + bbox[3] / 2.0)
            area = bbox[2] * bbox[3]

            mask = FrameMask(
                frame_index=frame_idx,
                t_ms=t_ms,
                object_id=obj_id,
                concept=concept,
                bbox=bbox,
                confidence=1.0,
                centroid=centroid,
                area=area,
            )
            tracks_by_concept[concept][obj_id].frames[frame_idx] = mask

    final_tracks = {c: list(tr_map.values()) for c, tr_map in tracks_by_concept.items()}
    concepts = list(final_tracks.keys())

    return PerceiveResult(
        concepts=concepts,
        interaction="recorded interaction",
        suspect_window_ms=None,
        tracks=final_tracks,
    )
