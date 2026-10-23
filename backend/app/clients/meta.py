"""Meta API client — the sole gateway for all Meta model calls.

Uses the OpenAI SDK with ``base_url=https://api.meta.ai/v1``.
Key from ``MODEL_API_KEY`` environment variable.
Includes: retries with exponential backoff, cost meter, structured logging.

All Meta API calls in the project MUST go through this module.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cost tables (per the Meta pricing sheet)
# ---------------------------------------------------------------------------

# SAM 3.1 pricing
_SAM_COST_PER_1K_VIDEO_FRAMES: float = 0.20
_SAM_COST_PER_1K_IMAGES: float = 2.50

# Muse Wonder pricing (per million tokens)
_WONDER_INPUT_PER_M: float = 4.00
_WONDER_OUTPUT_PER_M: float = 20.00
_WONDER_CACHED_PER_M: float = 0.20

# Retry configuration
_MAX_RETRIES: int = 3
_RETRY_BASE_DELAY: float = 1.0
_RETRYABLE_STATUS_CODES: frozenset[int] = frozenset({429, 500, 502, 503})


# ---------------------------------------------------------------------------
# Cost Meter
# ---------------------------------------------------------------------------


@dataclass
class CostMeter:
    """Accumulates cost per model across all API calls.

    Thread-safe for single-event-loop async usage.

    Attributes:
        costs: Mapping of model name → accumulated cost in USD.
        call_counts: Mapping of model name → number of calls.
    """

    costs: dict[str, float] = field(default_factory=dict)
    call_counts: dict[str, int] = field(default_factory=dict)

    def record(self, model: str, cost: float) -> None:
        """Record a single call's cost.

        Args:
            model: The model identifier (e.g. ``"sam-3.1"``).
            cost: Cost in USD for this call.
        """
        self.costs[model] = self.costs.get(model, 0.0) + cost
        self.call_counts[model] = self.call_counts.get(model, 0) + 1

    def get_summary(self) -> dict[str, Any]:
        """Return a summary of all accumulated costs.

        Returns:
            Dictionary with per-model costs, call counts, and total cost.
        """
        return {
            "per_model": {
                model: {
                    "cost_usd": round(self.costs[model], 6),
                    "calls": self.call_counts[model],
                }
                for model in self.costs
            },
            "total_cost_usd": round(sum(self.costs.values()), 6),
            "total_calls": sum(self.call_counts.values()),
        }

    def reset(self) -> None:
        """Reset all accumulated costs and call counts."""
        self.costs.clear()
        self.call_counts.clear()


# ---------------------------------------------------------------------------
# Meta Client
# ---------------------------------------------------------------------------


class MetaClient:
    """Async client wrapping the Meta AI platform via OpenAI-compatible SDK.

    All Meta model calls (SAM, Muse Wonder, Muse Spark, Voice Transcribe)
    go through this single gateway.  Retry logic, cost tracking, and
    structured logging are handled internally.

    Args:
        api_key: Meta API key.  Defaults to ``os.environ["MODEL_API_KEY"]``.
        base_url: API base URL.  Defaults to ``https://api.meta.ai/v1``.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.meta.ai/v1",
    ) -> None:
        resolved_key = api_key or os.environ["MODEL_API_KEY"]
        self._client = AsyncOpenAI(
            api_key=resolved_key,
            base_url=base_url,
        )
        self.cost_meter = CostMeter()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _request_with_retry(
        self,
        coro_factory: Any,
        *,
        model: str,
        description: str,
    ) -> Any:
        """Execute an async API call with exponential-backoff retries.

        Retries on HTTP 429 / 500 / 502 / 503 up to ``_MAX_RETRIES`` times.

        Args:
            coro_factory: A zero-arg callable that returns an awaitable.
            model: Model name for logging.
            description: Human-readable description of the call.

        Returns:
            The API response object.

        Raises:
            openai.APIStatusError: If all retries are exhausted.
        """
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES + 1):
            t0 = time.monotonic()
            try:
                result = await coro_factory()
                latency = time.monotonic() - t0
                logger.info(
                    "Meta API call succeeded: model=%s desc=%s attempt=%d latency=%.3fs",
                    model,
                    description,
                    attempt + 1,
                    latency,
                )
                return result
            except openai.APIStatusError as exc:
                latency = time.monotonic() - t0
                last_exc = exc
                if exc.status_code not in _RETRYABLE_STATUS_CODES:
                    logger.error(
                        "Meta API non-retryable error: model=%s status=%d latency=%.3fs",
                        model,
                        exc.status_code,
                        latency,
                    )
                    raise
                delay = _RETRY_BASE_DELAY * (2**attempt)
                logger.warning(
                    "Meta API retryable error: model=%s status=%d attempt=%d/%d "
                    "latency=%.3fs retry_delay=%.1fs",
                    model,
                    exc.status_code,
                    attempt + 1,
                    _MAX_RETRIES + 1,
                    latency,
                    delay,
                )
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(delay)

        assert last_exc is not None
        raise last_exc

    @staticmethod
    def _compute_wonder_cost(
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
    ) -> float:
        """Compute USD cost for a Muse Wonder call.

        Args:
            input_tokens: Number of input tokens.
            output_tokens: Number of output tokens.
            cached_tokens: Number of cached input tokens.

        Returns:
            Total cost in USD.
        """
        input_cost = (input_tokens / 1_000_000) * _WONDER_INPUT_PER_M
        output_cost = (output_tokens / 1_000_000) * _WONDER_OUTPUT_PER_M
        cached_cost = (cached_tokens / 1_000_000) * _WONDER_CACHED_PER_M
        return input_cost + output_cost + cached_cost

    @staticmethod
    def _compute_sam_cost(video_frames: int = 0, images: int = 0) -> float:
        """Compute USD cost for a SAM 3.1 call.

        Args:
            video_frames: Number of video frames processed.
            images: Number of images processed.

        Returns:
            Total cost in USD.
        """
        frame_cost = (video_frames / 1_000) * _SAM_COST_PER_1K_VIDEO_FRAMES
        image_cost = (images / 1_000) * _SAM_COST_PER_1K_IMAGES
        return frame_cost + image_cost

    # ------------------------------------------------------------------
    # Public API methods
    # ------------------------------------------------------------------

    async def call_sam(
        self,
        video_path: str,
        concept: str,
        *,
        one_bit: bool = True,
        include_confidence: bool = True,
        video_frames: int = 0,
    ) -> dict[str, Any]:
        """Send ONE concept to SAM 3.1 on a video.

        Per project rules, exactly one concept per request.

        Args:
            video_path: Path to the H.264 MP4 video file.
            concept: The single concept to track (e.g. ``"submit button"``).
            one_bit: Request 1-bit masks.
            include_confidence: Include confidence scores in output.
            video_frames: Number of frames for cost calculation.

        Returns:
            Raw API response as a dictionary.
        """
        model = "sam-3.1"

        def _build_request() -> Any:
            return self._client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "video_url",
                                "video_url": {"url": f"file://{video_path}"},
                            },
                            {
                                "type": "text",
                                "text": concept,
                            },
                        ],
                    },
                ],
                extra_body={
                    "one_bit": one_bit,
                    "include_confidence": include_confidence,
                },
            )

        t0 = time.monotonic()
        response = await self._request_with_retry(
            _build_request,
            model=model,
            description=f"SAM track concept={concept!r}",
        )
        latency = time.monotonic() - t0

        cost = self._compute_sam_cost(video_frames=video_frames)
        self.cost_meter.record(model, cost)

        logger.info(
            "SAM call: concept=%r frames=%d cost=$%.6f latency=%.3fs",
            concept,
            video_frames,
            cost,
            latency,
        )

        return {
            "model": model,
            "concept": concept,
            "response": response.model_dump() if hasattr(response, "model_dump") else response,
            "cost_usd": cost,
            "latency_s": round(latency, 3),
        }

    async def call_wonder(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str = "muse-wonder",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Call Muse Wonder for text generation.

        Args:
            messages: Chat messages in OpenAI format.
            model: Model identifier.
            temperature: Sampling temperature.
            max_tokens: Maximum output tokens.

        Returns:
            Raw API response as a dictionary with cost metadata.
        """

        def _build_request() -> Any:
            return self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        t0 = time.monotonic()
        response = await self._request_with_retry(
            _build_request,
            model=model,
            description="Wonder text generation",
        )
        latency = time.monotonic() - t0

        usage = response.usage
        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0
        cached_tokens = getattr(usage, "prompt_tokens_cached", 0) if usage else 0

        cost = self._compute_wonder_cost(input_tokens, output_tokens, cached_tokens)
        self.cost_meter.record(model, cost)

        logger.info(
            "Wonder call: in_tokens=%d out_tokens=%d cached=%d cost=$%.6f latency=%.3fs",
            input_tokens,
            output_tokens,
            cached_tokens,
            cost,
            latency,
        )

        return {
            "model": model,
            "response": response.model_dump() if hasattr(response, "model_dump") else response,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "cost_usd": cost,
            "latency_s": round(latency, 3),
        }

    async def call_spark(
        self,
        video_path: str,
        prompt: str,
        *,
        model: str = "muse-spark-1.3",
    ) -> dict[str, Any]:
        """Call Muse Spark 1.3 for video understanding.

        Args:
            video_path: Path to the video file.
            prompt: The prompt describing what to analyze.
            model: Model identifier.

        Returns:
            Raw API response as a dictionary.
        """

        def _build_request() -> Any:
            return self._client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "video_url",
                                "video_url": {"url": f"file://{video_path}"},
                            },
                            {
                                "type": "text",
                                "text": prompt,
                            },
                        ],
                    },
                ],
            )

        t0 = time.monotonic()
        response = await self._request_with_retry(
            _build_request,
            model=model,
            description="Spark video analysis",
        )
        latency = time.monotonic() - t0

        logger.info(
            "Spark call: model=%s latency=%.3fs",
            model,
            latency,
        )

        return {
            "model": model,
            "response": response.model_dump() if hasattr(response, "model_dump") else response,
            "latency_s": round(latency, 3),
        }

    async def call_transcribe(
        self,
        audio_path: str,
        *,
        model: str = "voice-transcribe",
    ) -> dict[str, Any]:
        """Call Voice Transcribe for audio-to-text.

        Args:
            audio_path: Path to the audio file.
            model: Model identifier.

        Returns:
            Raw API response as a dictionary.
        """

        def _build_request() -> Any:
            return self._client.audio.transcriptions.create(
                model=model,
                file=open(audio_path, "rb"),  # noqa: SIM115
            )

        t0 = time.monotonic()
        response = await self._request_with_retry(
            _build_request,
            model=model,
            description="Voice transcribe",
        )
        latency = time.monotonic() - t0

        logger.info(
            "Transcribe call: model=%s latency=%.3fs",
            model,
            latency,
        )

        return {
            "model": model,
            "response": response.model_dump() if hasattr(response, "model_dump") else response,
            "latency_s": round(latency, 3),
        }

    def get_cost_summary(self) -> dict[str, Any]:
        """Return accumulated costs across all models.

        Returns:
            Dictionary with per-model costs, call counts, and total cost.
        """
        return self.cost_meter.get_summary()

    def reset_costs(self) -> None:
        """Reset all accumulated cost data."""
        self.cost_meter.reset()
