"""ChronoLens DOM probe injection scripts."""

from pathlib import Path

#: Absolute path to the probe JavaScript file.
PROBE_JS_PATH: str = str(Path(__file__).parent / "chronolens-probe.js")


def get_probe_script() -> str:
    """Read and return the probe JavaScript source.

    Returns:
        The full JavaScript source code of the DOM probe.
    """
    return Path(PROBE_JS_PATH).read_text(encoding="utf-8")
