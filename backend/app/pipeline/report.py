"""Report stage — final report generation.

Produces a structured report summarizing the full pipeline run:
anomalies found, reproduction evidence, root cause, patch applied,
and verification results.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.pipeline.types import ReportResult, VerifyResult


async def report(
    verify_result: VerifyResult,
    run_dir: str,
) -> ReportResult:
    """Generate the final pipeline report.

    Collects all evidence from previous stages and writes a
    structured report to ``run_dir``.

    Args:
        verify_result: Output from the verify stage.
        run_dir: Directory to write the report into.

    Returns:
        A ``ReportResult`` with the report path and summary.

    Raises:
        NotImplementedError: This is a stub for Phase 1.
    """
    raise NotImplementedError("report() will be implemented in Phase 8")
