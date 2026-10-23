"""Tests for ChronoLens unified command-line interface (CLI)."""

from __future__ import annotations

import subprocess
import sys


def test_cli_help() -> None:
    """Verify that python -m backend.app.cli --help prints usage."""
    res = subprocess.run(
        [sys.executable, "-m", "backend.app.cli", "--help"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "ChronoLens-SWE" in res.stdout
    assert "responsive" in res.stdout
    assert "record" in res.stdout
    assert "diagnose" in res.stdout
    assert "serve" in res.stdout


def test_cli_subcommand_help() -> None:
    """Verify subcommand help flags work properly."""
    for subcmd in ["responsive", "record", "diagnose", "serve"]:
        res = subprocess.run(
            [sys.executable, "-m", "backend.app.cli", subcmd, "--help"],
            capture_output=True,
            text=True,
            check=True,
        )
        assert f"usage: chronolens {subcmd}" in res.stdout
