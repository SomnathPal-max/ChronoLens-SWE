"""Shared test fixtures for ChronoLens-SWE test suite."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def mock_env_key(monkeypatch: pytest.MonkeyPatch) -> str:
    """Set a fake MODEL_API_KEY in the environment.

    Returns:
        The fake API key string.
    """
    key = "test-api-key-do-not-use"
    monkeypatch.setenv("MODEL_API_KEY", key)
    return key


@pytest.fixture
def mock_openai_client() -> MagicMock:
    """Create a mocked AsyncOpenAI client.

    Returns:
        A MagicMock configured to behave like AsyncOpenAI.
    """
    client = MagicMock()

    # Mock chat.completions.create
    mock_response = MagicMock()
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 100
    mock_response.usage.completion_tokens = 50
    mock_response.usage.prompt_tokens_cached = 0
    mock_response.model_dump.return_value = {
        "id": "test-id",
        "choices": [{"message": {"content": "test response"}}],
    }

    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    client.chat.completions.create = AsyncMock(return_value=mock_response)

    # Mock audio.transcriptions.create
    mock_transcription = MagicMock()
    mock_transcription.model_dump.return_value = {"text": "transcribed text"}
    client.audio = MagicMock()
    client.audio.transcriptions = MagicMock()
    client.audio.transcriptions.create = AsyncMock(return_value=mock_transcription)

    return client


@pytest.fixture
def meta_client(mock_env_key: str, mock_openai_client: MagicMock):
    """Create a MetaClient with a mocked OpenAI backend.

    Args:
        mock_env_key: Fixture that sets the API key env var.
        mock_openai_client: Fixture providing a mock OpenAI client.

    Returns:
        A MetaClient instance with the internal client replaced by a mock.
    """
    from backend.app.clients.meta import MetaClient

    client = MetaClient(api_key=mock_env_key)
    client._client = mock_openai_client
    return client


@pytest.fixture
def test_api_client() -> TestClient:
    """Create a FastAPI TestClient.

    Returns:
        A synchronous test client for the ChronoLens API.
    """
    from backend.app.main import app

    return TestClient(app)
