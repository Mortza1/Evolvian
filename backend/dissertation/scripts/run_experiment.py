"""
Main CLI entry point for all dissertation experiments.

Usage:
    # Quick smoke-test (5 examples, 1 run)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config A --sample-k 5

    # Full Config A baseline
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config A --sample-k 100 --runs 3

    # All baselines
    python -m dissertation.scripts.run_experiment --benchmark all --config A --sample-k 50 --runs 3

    # Show results summary
    python -m dissertation.scripts.run_experiment --results
"""
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))          # backend/
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))  # evoAgentX/

from dissertation.config import RESULTS_DIR


def show_results():
    """Print a summary of all saved results."""
    result_files = sorted(RESULTS_DIR.glob("*.json"))
    if not result_files:
        print("No results found in", RESULTS_DIR)
        return

    print(f"\n{'Config':<10} {'Benchmark':<12} {'Run':<6} {'Metric':<14} {'Score':>8} {'Time':>8}")
    print("-" * 62)
    for f in result_files:
        r = json.loads(f.read_text())
        metric = r.get("primary_metric", "?")
        score = r.get("primary_value", 0.0)
        t = r.get("elapsed_seconds", 0)
        bench = r.get("benchmark", "?")
        run_idx = r.get("run_idx", 0)
        config = r.get("config", "?")
        print(f"{config:<10} {bench:<12} {run_idx:<6} {metric:<14} {score:>8.4f} {t:>7.1f}s")


def main():
    parser = argparse.ArgumentParser(description="Dissertation experiment runner")
    parser.add_argument("--benchmark", default="hotpotqa",
                        choices=["hotpotqa", "math", "mbpp", "all"],
                        help="Which benchmark to run")
    parser.add_argument("--config", default="A",
                        choices=["A", "B", "C"],
                        help="A=baseline flat, B=hierarchical, C=hierarchical+evolution")
    parser.add_argument("--sample-k", type=int, default=5,
                        help="Examples per run (default: 5 for quick test)")
    parser.add_argument("--runs", type=int, default=1,
                        help="Repetitions for mean±std (default: 1)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--results", action="store_true",
                        help="Show summary of saved results and exit")
    args = parser.parse_args()

    if args.results:
        show_results()
        return

    if args.config == "A":
        from dissertation.evaluation.run_baseline import run_baseline, run_all_baselines
        if args.benchmark == "all":
            run_all_baselines(sample_k=args.sample_k, num_runs=args.runs)
        else:
            for run_i in range(args.runs):
                run_baseline(args.benchmark, sample_k=args.sample_k,
                             seed=args.seed + run_i, run_idx=run_i)
    elif args.config == "B":
        print("Config B (Hierarchical) not yet implemented — see Phase 3 of TODO.")
    elif args.config == "C":
        print("Config C (Hierarchical + Evolution) not yet implemented — see Phase 5 of TODO.")


if __name__ == "__main__":
    main()
