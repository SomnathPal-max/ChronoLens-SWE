"""ChronoLens-SWE Unified Command-Line Interface.

Provides CLI access to all pipeline stages:
  - diagnose: End-to-end regression diagnosis, root cause, patching, and verification
  - responsive: Multi-viewport responsive layout audit and auto-patching
  - record: Record reproducible interaction clips with Playwright & H.264
  - verify: Run 5-run verification stability gate
  - serve: Start the API server and web interface
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from backend.app.pipeline.config import DEFAULT_CONFIG
from backend.app.pipeline.responsive import audit_responsive, auto_patch_responsive


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="chronolens",
        description="ChronoLens-SWE: AI-Powered Visual Regression Debugger",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: responsive
    resp_parser = subparsers.add_parser(
        "responsive", help="Run multi-viewport responsive layout audit (Phase 6)"
    )
    resp_parser.add_argument(
        "--url", default="http://localhost:5173", help="Target application base URL"
    )
    resp_parser.add_argument("--bug", type=int, default=3, help="Seeded bug number (default: 3)")
    resp_parser.add_argument(
        "--patch", action="store_true", help="Auto-synthesize and verify responsive patch"
    )

    # Command: record
    rec_parser = subparsers.add_parser("record", help="Record a bug interaction clip")
    rec_parser.add_argument("--bug", type=int, required=True, help="Bug number (1, 2, or 3)")
    rec_parser.add_argument(
        "--out-dir", default="runs/recorded", help="Directory to save MP4 and HAR"
    )
    rec_parser.add_argument("--url", default="http://localhost:5173", help="Base URL of target app")

    # Command: diagnose
    diag_parser = subparsers.add_parser(
        "diagnose", help="Run full end-to-end visual regression diagnosis"
    )
    diag_parser.add_argument("--bug", type=int, default=1, help="Bug number to diagnose")
    diag_parser.add_argument("--repo", default="demo-app", help="Path to repository under test")
    diag_parser.add_argument(
        "--out-dir", default="runs/diagnosis", help="Output directory for reports"
    )

    # Command: serve
    serve_parser = subparsers.add_parser("serve", help="Start the FastAPI backend server")
    serve_parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Host address")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "responsive":
        asyncio.run(_handle_responsive(args))
    elif args.command == "record":
        asyncio.run(_handle_record(args))
    elif args.command == "diagnose":
        asyncio.run(_handle_diagnose(args))
    elif args.command == "serve":
        _handle_serve(args)


async def _handle_responsive(args: argparse.Namespace) -> None:
    print(f"[*] Auditing responsive viewports for Bug {args.bug} at {args.url}...")
    result = await audit_responsive(base_url=args.url, bug_number=args.bug)
    print(f"[+] {result.summary}")
    for vp_name, anoms in result.anomalies_by_viewport.items():
        print(f"  • {vp_name}: {len(anoms)} anomalies")
        for a in anoms:
            print(f"      - {a.anomaly_type.value}: {a.concept} (severity: {a.severity:.2f})")

    if args.patch:
        repo_path = Path.cwd()
        print("\n[*] Synthesizing responsive patch in isolated git worktree...")
        patched_res = await auto_patch_responsive(result, repo_path=repo_path)
        if patched_res.patch_result:
            print(f"[+] Patch generated on branch: {patched_res.patch_result.branch_name}")
            print(
                f"[+] Tests pass: {patched_res.patch_result.tests_pass}, Lint: {patched_res.patch_result.lint_pass}"
            )
            print(f"[+] Multi-viewport verification: {patched_res.multi_viewport_verify}")


async def _handle_record(args: argparse.Namespace) -> None:
    from backend.app.pipeline.ingest import record_bug

    out_path = Path(args.out_dir)
    print(f"[*] Recording interaction for Bug {args.bug}...")
    res = await record_bug(
        bug_number=args.bug,
        output_dir=str(out_path),
        base_url=args.url,
    )
    print(f"[+] Ingestion complete. MP4 video saved to: {res.video_path}")


async def _handle_diagnose(args: argparse.Namespace) -> None:
    from backend.app.pipeline.report import report
    from backend.app.pipeline.reproduce import reproduce
    from backend.app.pipeline.verify import verify

    print(f"[*] Diagnosing Bug {args.bug}...")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Reproduce
    repro_res = await reproduce(
        anomalies=[],
        client=None,
        config=DEFAULT_CONFIG,
        base_url="http://localhost:5173",
        bug_number=args.bug,
        run_dir=out_dir / "repro",
    )
    print(f"[+] Reproduction matched: {repro_res.matched}")

    # 2. Patch & Verify
    verify_res = await verify(
        patch_result=None,
        client=None,
        config=DEFAULT_CONFIG,
        repo_path=Path.cwd(),
        bug_number=args.bug,
        run_dir=out_dir / "verify",
    )
    print(f"[+] Verification: {verify_res.passes}/{verify_res.runs} runs passed")

    # 3. Report
    rep_res = await report(
        verify_result=verify_res,
        run_dir=out_dir,
        bug_number=args.bug,
        target_app="demo-app",
    )
    print(f"[+] Report generated: {rep_res.report_json_path}")


def _handle_serve(args: argparse.Namespace) -> None:
    import uvicorn

    print(f"[*] Starting ChronoLens-SWE backend on http://{args.host}:{args.port}...")
    uvicorn.run("backend.app.main:app", host=args.host, port=args.port, reload=True)


if __name__ == "__main__":
    main()
