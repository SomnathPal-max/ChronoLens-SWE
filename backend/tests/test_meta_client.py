"""Tests for the Meta API client and cost meter."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import openai
import pytest
from backend.app.clients.meta import CostMeter, MetaClient

# ---------------------------------------------------------------------------
# CostMeter tests
# ---------------------------------------------------------------------------


class TestCostMeter:
    """Tests for CostMeter accumulation and reporting."""

    def test_record_single_model(self) -> None:
        """Record costs for a single model."""
        meter = CostMeter()
        meter.record("sam-3.1", 0.05)
        meter.record("sam-3.1", 0.10)

        summary = meter.get_summary()
        assert summary["total_cost_usd"] == pytest.approx(0.15, abs=1e-6)
        assert summary["total_calls"] == 2
        assert summary["per_model"]["sam-3.1"]["cost_usd"] == pytest.approx(0.15, abs=1e-6)
        assert summary["per_model"]["sam-3.1"]["calls"] == 2

    def test_record_multiple_models(self) -> None:
        """Record costs across multiple models."""
        meter = CostMeter()
        meter.record("sam-3.1", 0.05)
        meter.record("muse-wonder", 0.10)
        meter.record("sam-3.1", 0.03)

        summary = meter.get_summary()
        assert summary["total_cost_usd"] == pytest.approx(0.18, abs=1e-6)
        assert summary["total_calls"] == 3
        assert len(summary["per_model"]) == 2

    def test_reset(self) -> None:
        """Reset clears all accumulated data."""
        meter = CostMeter()
        meter.record("sam-3.1", 0.05)
        meter.reset()

        summary = meter.get_summary()
        assert summary["total_cost_usd"] == 0.0
        assert summary["total_calls"] == 0
        assert len(summary["per_model"]) == 0

    def test_empty_summary(self) -> None:
        """Empty meter returns zero totals."""
        meter = CostMeter()
        summary = meter.get_summary()
        assert summary["total_cost_usd"] == 0.0
        assert summary["total_calls"] == 0


# ---------------------------------------------------------------------------
# Cost computation tests
# ---------------------------------------------------------------------------


class TestCostComputation:
    """Tests for static cost computation methods."""

    def test_wonder_cost_basic(self) -> None:
        """Compute Wonder cost for standard tokens."""
        cost = MetaClient._compute_wonder_cost(
            input_tokens=1_000_000,
            output_tokens=1_000_000,
        )
        expected = 4.00 + 20.00  # $4/M input + $20/M output
        assert cost == pytest.approx(expected, abs=1e-6)

    def test_wonder_cost_with_cached(self) -> None:
        """Compute Wonder cost including cached tokens."""
        cost = MetaClient._compute_wonder_cost(
            input_tokens=500_000,
            output_tokens=100_000,
            cached_tokens=200_000,
        )
        expected = (0.5 * 4.00) + (0.1 * 20.00) + (0.2 * 0.20)
        assert cost == pytest.approx(expected, abs=1e-6)

    def test_wonder_cost_zero_tokens(self) -> None:
        """Zero tokens means zero cost."""
        cost = MetaClient._compute_wonder_cost(0, 0, 0)
        assert cost == 0.0

    def test_sam_cost_video_frames(self) -> None:
        """Compute SAM cost for video frames."""
        cost = MetaClient._compute_sam_cost(video_frames=1000)
        expected = 0.20  # $0.20 per 1K frames
        assert cost == pytest.approx(expected, abs=1e-6)

    def test_sam_cost_images(self) -> None:
        """Compute SAM cost for images."""
        cost = MetaClient._compute_sam_cost(images=1000)
        expected = 2.50  # $2.50 per 1K images
        assert cost == pytest.approx(expected, abs=1e-6)

    def test_sam_cost_mixed(self) -> None:
        """Compute SAM cost for mixed video + images."""
        cost = MetaClient._compute_sam_cost(video_frames=500, images=200)
        expected = (500 / 1000 * 0.20) + (200 / 1000 * 2.50)
        assert cost == pytest.approx(expected, abs=1e-6)

    def test_sam_cost_zero(self) -> None:
        """Zero frames/images means zero cost."""
        cost = MetaClient._compute_sam_cost()
        assert cost == 0.0


# ---------------------------------------------------------------------------
# Retry logic tests
# ---------------------------------------------------------------------------


class TestRetryLogic:
    """Tests for exponential backoff retry logic."""

    @pytest.mark.asyncio
    async def test_succeeds_on_first_attempt(self, meta_client: MetaClient) -> None:
        """API call succeeds without retries."""
        result = await meta_client.call_wonder(messages=[{"role": "user", "content": "test"}])
        assert result["model"] == "muse-wonder"
        assert "response" in result
        assert "cost_usd" in result

    @pytest.mark.asyncio
    async def test_retries_on_429(self, meta_client: MetaClient) -> None:
        """Retries on 429 and eventually succeeds."""
        mock_response = MagicMock()
        mock_response.usage = MagicMock()
        mock_response.usage.prompt_tokens = 100
        mock_response.usage.completion_tokens = 50
        mock_response.usage.prompt_tokens_cached = 0
        mock_response.model_dump.return_value = {"id": "retry-success"}

        error_429 = openai.APIStatusError(
            message="Rate limited",
            response=MagicMock(status_code=429, headers={}),
            body=None,
        )

        meta_client._client.chat.completions.create = AsyncMock(
            side_effect=[error_429, mock_response]
        )

        result = await meta_client.call_wonder(messages=[{"role": "user", "content": "test"}])
        assert result["response"]["id"] == "retry-success"
        assert meta_client._client.chat.completions.create.call_count == 2

    @pytest.mark.asyncio
    async def test_retries_on_500(self, meta_client: MetaClient) -> None:
        """Retries on 500 and eventually succeeds."""
        mock_response = MagicMock()
        mock_response.usage = MagicMock()
        mock_response.usage.prompt_tokens = 50
        mock_response.usage.completion_tokens = 25
        mock_response.usage.prompt_tokens_cached = 0
        mock_response.model_dump.return_value = {"id": "server-error-retry"}

        error_500 = openai.APIStatusError(
            message="Server error",
            response=MagicMock(status_code=500, headers={}),
            body=None,
        )

        meta_client._client.chat.completions.create = AsyncMock(
            side_effect=[error_500, error_500, mock_response]
        )

        result = await meta_client.call_wonder(messages=[{"role": "user", "content": "test"}])
        assert result["response"]["id"] == "server-error-retry"
        assert meta_client._client.chat.completions.create.call_count == 3

    @pytest.mark.asyncio
    async def test_no_retry_on_400(self, meta_client: MetaClient) -> None:
        """Does not retry on non-retryable status codes like 400."""
        error_400 = openai.APIStatusError(
            message="Bad request",
            response=MagicMock(status_code=400, headers={}),
            body=None,
        )

        meta_client._client.chat.completions.create = AsyncMock(side_effect=error_400)

        with pytest.raises(openai.APIStatusError):
            await meta_client.call_wonder(messages=[{"role": "user", "content": "test"}])

        assert meta_client._client.chat.completions.create.call_count == 1

    @pytest.mark.asyncio
    async def test_exhausted_retries_raises(self, meta_client: MetaClient) -> None:
        """Raises after all retries are exhausted."""
        error_503 = openai.APIStatusError(
            message="Service unavailable",
            response=MagicMock(status_code=503, headers={}),
            body=None,
        )

        meta_client._client.chat.completions.create = AsyncMock(side_effect=error_503)

        with pytest.raises(openai.APIStatusError):
            await meta_client.call_wonder(messages=[{"role": "user", "content": "test"}])

        # 1 initial + 3 retries = 4 total
        assert meta_client._client.chat.completions.create.call_count == 4


# ---------------------------------------------------------------------------
# Integration-style call tests
# ---------------------------------------------------------------------------


class TestMetaClientCalls:
    """Tests for MetaClient API call methods."""

    @pytest.mark.asyncio
    async def test_call_sam_tracks_cost(self, meta_client: MetaClient) -> None:
        """SAM call records cost in the meter."""
        result = await meta_client.call_sam(
            video_path="/tmp/test.mp4",
            concept="button",
            video_frames=1000,
        )
        assert result["model"] == "sam-3.1"
        assert result["cost_usd"] == pytest.approx(0.20, abs=1e-6)

        summary = meta_client.get_cost_summary()
        assert summary["total_cost_usd"] == pytest.approx(0.20, abs=1e-6)

    @pytest.mark.asyncio
    async def test_call_wonder_tracks_cost(self, meta_client: MetaClient) -> None:
        """Wonder call records cost in the meter."""
        result = await meta_client.call_wonder(
            messages=[{"role": "user", "content": "analyze this"}]
        )
        assert result["model"] == "muse-wonder"
        assert result["input_tokens"] == 100
        assert result["output_tokens"] == 50
        assert result["cost_usd"] > 0

    @pytest.mark.asyncio
    async def test_reset_costs(self, meta_client: MetaClient) -> None:
        """Reset clears all tracked costs."""
        await meta_client.call_sam(
            video_path="/tmp/test.mp4",
            concept="button",
            video_frames=500,
        )
        assert meta_client.get_cost_summary()["total_cost_usd"] > 0

        meta_client.reset_costs()
        assert meta_client.get_cost_summary()["total_cost_usd"] == 0.0

    @pytest.mark.asyncio
    async def test_get_cost_summary_structure(self, meta_client: MetaClient) -> None:
        """Cost summary has expected structure."""
        summary = meta_client.get_cost_summary()
        assert "per_model" in summary
        assert "total_cost_usd" in summary
        assert "total_calls" in summary
