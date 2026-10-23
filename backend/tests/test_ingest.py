"""Tests for the ingest pipeline stage."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from backend.app.pipeline.ingest import convert_to_h264, validate_video

# ---------------------------------------------------------------------------
# validate_video tests
# ---------------------------------------------------------------------------


class TestValidateVideo:
    """Tests for ffprobe-based video validation."""

    def test_file_not_found(self) -> None:
        """Raises FileNotFoundError for missing files."""
        with pytest.raises(FileNotFoundError, match="not found"):
            validate_video("/nonexistent/video.mp4")

    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_ffprobe_failure(self, mock_run: MagicMock, tmp_path: Path) -> None:
        """Raises RuntimeError when ffprobe exits non-zero."""
        video = tmp_path / "test.mp4"
        video.write_bytes(b"\x00" * 100)

        mock_run.return_value = MagicMock(
            returncode=1,
            stderr="Invalid data found",
            stdout="",
        )

        with pytest.raises(RuntimeError, match="ffprobe failed"):
            validate_video(str(video))

    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_no_video_stream(self, mock_run: MagicMock, tmp_path: Path) -> None:
        """Raises RuntimeError when no video stream is found."""
        video = tmp_path / "test.mp4"
        video.write_bytes(b"\x00" * 100)

        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=json.dumps({"streams": [{"codec_type": "audio"}], "format": {}}),
            stderr="",
        )

        with pytest.raises(RuntimeError, match="No video stream"):
            validate_video(str(video))

    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_valid_h264(self, mock_run: MagicMock, tmp_path: Path) -> None:
        """Successfully validates an H.264 video."""
        video = tmp_path / "test.mp4"
        video.write_bytes(b"\x00" * 100)

        mock_run.return_value = MagicMock(
            returncode=0,
            stdout=json.dumps(
                {
                    "streams": [
                        {
                            "codec_type": "video",
                            "codec_name": "h264",
                            "pix_fmt": "yuv420p",
                            "width": 1280,
                            "height": 720,
                            "r_frame_rate": "30/1",
                            "duration": "10.0",
                            "nb_read_frames": "300",
                        }
                    ],
                    "format": {
                        "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
                        "duration": "10.0",
                    },
                }
            ),
            stderr="",
        )

        metadata = validate_video(str(video))

        assert metadata["codec"] == "h264"
        assert metadata["width"] == 1280
        assert metadata["height"] == 720
        assert metadata["fps"] == 30.0
        assert metadata["duration"] == 10.0
        assert metadata["nb_frames"] == 300


# ---------------------------------------------------------------------------
# convert_to_h264 tests
# ---------------------------------------------------------------------------


class TestConvertToH264:
    """Tests for H.264 video conversion."""

    def test_input_not_found(self) -> None:
        """Raises FileNotFoundError for missing input."""
        with pytest.raises(FileNotFoundError, match="not found"):
            convert_to_h264("/nonexistent/input.webm", "/tmp/output.mp4")

    @patch("backend.app.pipeline.ingest.validate_video")
    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_ffmpeg_failure(
        self,
        mock_run: MagicMock,
        mock_validate: MagicMock,
        tmp_path: Path,
    ) -> None:
        """Raises RuntimeError when ffmpeg fails."""
        src = tmp_path / "input.webm"
        src.write_bytes(b"\x00" * 100)
        dst = tmp_path / "output.mp4"

        mock_run.return_value = MagicMock(
            returncode=1,
            stderr="Conversion error",
            stdout="",
        )

        with pytest.raises(RuntimeError, match="ffmpeg conversion failed"):
            convert_to_h264(str(src), str(dst))

    @patch("backend.app.pipeline.ingest.validate_video")
    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_output_not_h264(
        self,
        mock_run: MagicMock,
        mock_validate: MagicMock,
        tmp_path: Path,
    ) -> None:
        """Raises RuntimeError when output is not H.264."""
        src = tmp_path / "input.webm"
        src.write_bytes(b"\x00" * 100)
        dst = tmp_path / "output.mp4"

        mock_run.return_value = MagicMock(returncode=0, stderr="", stdout="")
        mock_validate.return_value = {"codec": "vp9", "nb_frames": 100, "duration": 3.0}

        with pytest.raises(RuntimeError, match="expected 'h264'"):
            convert_to_h264(str(src), str(dst))

    @patch("backend.app.pipeline.ingest.validate_video")
    @patch("backend.app.pipeline.ingest.subprocess.run")
    def test_successful_conversion(
        self,
        mock_run: MagicMock,
        mock_validate: MagicMock,
        tmp_path: Path,
    ) -> None:
        """Successfully converts to H.264."""
        src = tmp_path / "input.webm"
        src.write_bytes(b"\x00" * 100)
        dst = tmp_path / "output.mp4"

        mock_run.return_value = MagicMock(returncode=0, stderr="", stdout="")
        mock_validate.return_value = {"codec": "h264", "nb_frames": 300, "duration": 10.0}

        result = convert_to_h264(str(src), str(dst))
        assert result == str(dst)
