"""
Main CLI entry point for all dissertation experiments.

Usage:
    # Quick smoke-test (5 examples, 1 run)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config A --sample-k 5

    # Full Config A baseline (single agent)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config A --sample-k 100 --runs 3

    # Config B (flat multi-agent pipeline)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config B --sample-k 50 --runs 3

    # Config C (hierarchical, no evolution)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config C --sample-k 50 --runs 3

    # Config D (hierarchical + evolution)
    python -m dissertation.scripts.run_experiment --benchmark hotpotqa --config D \\
        --sample-k 50 --runs 3 --train-k 10 --max-steps 5

    # All configs, all benchmarks
    python -m dissertation.scripts.run_experiment --benchmark all --config A --sample-k 50 --runs 3

    # Show results summary
    python -m dissertation.scripts.run_experiment --results

    # Show API cost log
    python -m dissertation.scripts.run_experiment --costs
"""
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))          # backend/
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))  # evoAgentX/

from dissertation.config import RESULTS_DIR

# All benchmark choices
BENCHMARK_CHOICES = [
    "hotpotqa", "math", "math_hard", "math_moderate",
    "math_l1", "math_l2", "math_l3", "math_l4", "math_l5",
    "mbpp", "all",
]


# ---------------------------------------------------------------------------
# Show helpers
# ---------------------------------------------------------------------------

def show_results():
    """Print a summary of all saved result JSON files."""
    result_files = sorted(RESULTS_DIR.glob("config_*.json"))
    if not result_files:
        print("No results found in", RESULTS_DIR)
        return

    print(f"\n{'Config':<10} {'Benchmark':<16} {'Run':<5} {'Metric':<14} "
          f"{'Score':>8} {'Time':>9}")
    print("-" * 70)
    for f in result_files:
        r = json.loads(f.read_text())
        metric  = r.get("primary_metric", "?")
        score   = r.get("primary_value", 0.0)
        t       = r.get("elapsed_seconds", 0.0)
        bench   = r.get("benchmark", "?")
        run_idx = r.get("run_idx", 0)
        config  = r.get("config", "?")
        print(f"{config:<10} {bench:<16} {run_idx:<5} {metric:<14} "
              f"{score:>8.4f} {t:>8.1f}s")


def show_costs():
    """Print the accumulated API cost log."""
    from dissertation.scripts.cost_tracker import CostTracker
    log_path = RESULTS_DIR / "cost_log.json"
    tracker = CostTracker(log_path=log_path)
    tracker.load()
    if tracker.total_calls == 0:
        print("No cost records found.")
    else:
        tracker.print_report()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Dissertation experiment runner — Configs A, B, C, D"
    )
    parser.add_argument(
        "--benchmark",
        default="hotpotqa",
        choices=BENCHMARK_CHOICES,
        help="Benchmark to run (default: hotpotqa)",
    )
    parser.add_argument(
        "--config",
        default="A",
        choices=["A", "B", "C", "D", "compare"],
        help=(
            "A=single agent, B=flat pipeline, C=hierarchical, "
            "D=hierarchical+evolution, compare=tables"
        ),
    )
    parser.add_argument(
        "--sample-k",
        type=int,
        default=5,
        help="Test examples per run (default: 5 for quick smoke-test)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="Repetitions for mean+/-std (default: 1)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Base random seed (default: 42)",
    )
    # Config D specific
    parser.add_argument(
        "--train-k",
        type=int,
        default=5,
        help="[Config D] Training examples per optimisation step (default: 5)",
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=3,
        help="[Config D] Number of optimisation steps (default: 3)",
    )
    parser.add_argument(
        "--eval-every-n",
        type=int,
        default=2,
        help="[Config D] Validate every N steps (default: 2)",
    )
    # Info flags
    parser.add_argument(
        "--results",
        action="store_true",
        help="Print summary of saved results and exit",
    )
    parser.add_argument(
        "--costs",
        action="store_true",
        help="Print API cost log and exit",
    )
    args = parser.parse_args()

    if args.results:
        show_results()
        return

    if args.costs:
        show_costs()
        return

    # ── Config A (single agent) ──────────────────────────────────────────
    if args.config == "A":
        from dissertation.evaluation.run_baseline import run_baseline, run_all_baselines
        if args.benchmark == "all":
            run_all_baselines(sample_k=args.sample_k, num_runs=args.runs)
        else:
            for run_i in range(args.runs):
                run_baseline(
                    args.benchmark,
                    sample_k=args.sample_k,
                    seed=args.seed + run_i,
                    run_idx=run_i,
                )

    # ── Config B (flat multi-agent pipeline) ─────────────────────────────
    elif args.config == "B":
        from dissertation.evaluation.run_flat_pipeline import (
            run_flat_pipeline,
            run_all_flat_pipeline,
        )
        if args.benchmark == "all":
            run_all_flat_pipeline(sample_k=args.sample_k, num_runs=args.runs)
        else:
            for run_i in range(args.runs):
                run_flat_pipeline(
                    benchmark_name=args.benchmark,
                    sample_k=args.sample_k,
                    seed=args.seed + run_i,
                    run_idx=run_i,
                )

    # ── Config C (hierarchical, no evolution) ────────────────────────────
    elif args.config == "C":
        from dissertation.benchmarks.base_runner import (
            run_hierarchical,
            run_all_hierarchical,
        )
        if args.benchmark == "all":
            run_all_hierarchical(sample_k=args.sample_k, num_runs=args.runs)
        else:
            for run_i in range(args.runs):
                run_hierarchical(
                    benchmark_name=args.benchmark,
                    sample_k=args.sample_k,
                    seed=args.seed + run_i,
                    run_idx=run_i,
                )

    # ── Config D (hierarchical + evolution) ──────────────────────────────
    elif args.config == "D":
        from dissertation.evaluation.run_hierarchical_evo import (
            run_hierarchical_evo,
            run_all_hierarchical_evo,
        )
        if args.benchmark == "all":
            run_all_hierarchical_evo(
                sample_k=args.sample_k,
                train_k=args.train_k,
                max_steps=args.max_steps,
                num_runs=args.runs,
            )
        else:
            for run_i in range(args.runs):
                run_hierarchical_evo(
                    benchmark_name=args.benchmark,
                    sample_k=args.sample_k,
                    train_k=args.train_k,
                    max_steps=args.max_steps,
                    eval_every_n=args.eval_every_n,
                    seed=args.seed + run_i,
                    run_idx=run_i,
                )

    # ── Compare ──────────────────────────────────────────────────────────
    elif args.config == "compare":
        from dissertation.evaluation.compare_results import compare
        compare(
            plot=getattr(args, "plot", False),
            latex=getattr(args, "latex", False),
        )
        return


if __name__ == "__main__":
    main()
