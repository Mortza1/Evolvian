"""
CLI entry point for the enterprise Research-to-Report benchmark.

Commands:
    run     — execute a config on briefs
    score   — run LLM judge on saved results
    summary — print comparison table

Usage:
    # Run Config A on all 10 briefs
    python -m dissertation.scripts.run_enterprise run --config A

    # Run Config C on briefs 1, 2, 3 only (smoke test)
    python -m dissertation.scripts.run_enterprise run --config C --brief-ids 1 2 3

    # Run all configs sequentially
    python -m dissertation.scripts.run_enterprise run --config all

    # Score all saved results with LLM judge
    python -m dissertation.scripts.run_enterprise score

    # Print summary comparison table
    python -m dissertation.scripts.run_enterprise summary

    # Full pipeline: run then score
    python -m dissertation.scripts.run_enterprise run --config A && \\
    python -m dissertation.scripts.run_enterprise score && \\
    python -m dissertation.scripts.run_enterprise summary
"""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.evaluation.enterprise_benchmark import run_config_on_briefs, ENTERPRISE_RESULTS_DIR
from dissertation.evaluation.enterprise_judge import score_all, print_summary


def cmd_run(args):
    configs = ["A", "B", "C"] if args.config == "all" else [args.config]
    for cfg in configs:
        print(f"\n{'#'*60}")
        print(f"# Running Config {cfg} on Enterprise Benchmark")
        print(f"{'#'*60}")
        results = run_config_on_briefs(
            config=cfg,
            brief_ids=args.brief_ids,
            run_idx=args.run_idx,
        )
        print(f"\nConfig {cfg}: {len(results)} briefs completed.")
        successes = sum(1 for r in results if not r.get("error"))
        print(f"  Successful: {successes}/{len(results)}")


def cmd_score(args):
    print(f"\nScoring results in {ENTERPRISE_RESULTS_DIR}...")
    score_all(ENTERPRISE_RESULTS_DIR)
    print("\nScoring complete.")


def cmd_summary(args):
    print_summary(ENTERPRISE_RESULTS_DIR)


def main():
    parser = argparse.ArgumentParser(
        description="Enterprise Research-to-Report benchmark CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # run
    run_parser = sub.add_parser("run", help="Execute a config on briefs")
    run_parser.add_argument(
        "--config", required=True, choices=["A", "B", "C", "all"],
        help="Config to run (A=single agent, B=flat pipeline, C=hierarchical, all=A+B+C)",
    )
    run_parser.add_argument(
        "--brief-ids", nargs="+", type=int, default=None,
        help="Specific brief IDs (1-10). Default: all 10.",
    )
    run_parser.add_argument("--run-idx", type=int, default=0, help="Run index for filenames")

    # score
    score_parser = sub.add_parser("score", help="Run LLM judge on all saved results")

    # summary
    summary_parser = sub.add_parser("summary", help="Print comparison table")

    args = parser.parse_args()

    if args.command == "run":
        cmd_run(args)
    elif args.command == "score":
        cmd_score(args)
    elif args.command == "summary":
        cmd_summary(args)


if __name__ == "__main__":
    main()
