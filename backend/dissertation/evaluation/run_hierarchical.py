"""
Config C evaluation harness: Hierarchical team workflow WITHOUT evolution.

Thin wrapper around dissertation.benchmarks.base_runner that:
  - Uses HierarchicalWorkFlowGraph team configs from Phase 4
  - Runs HierarchicalEvaluator (no prompt optimisation)
  - Saves results to results/config_c_*.json

Usage:
    python -m dissertation.evaluation.run_hierarchical --benchmark hotpotqa --sample-k 10
    python -m dissertation.evaluation.run_hierarchical --benchmark all --sample-k 50
    python -m dissertation.evaluation.run_hierarchical --benchmark hotpotqa --sample-k 50 --runs 3
"""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.config import RANDOM_SEED
from dissertation.benchmarks.base_runner import (
    run_hierarchical,
    run_all_hierarchical,
    BENCHMARK_REGISTRY,
)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Config C (hierarchical, no evolution) evaluation"
    )
    parser.add_argument(
        "--benchmark",
        default="hotpotqa",
        choices=list(BENCHMARK_REGISTRY.keys()) + ["all"],
        help="Which benchmark to run (default: hotpotqa)",
    )
    parser.add_argument(
        "--sample-k",
        type=int,
        default=10,
        help="Number of examples to evaluate per run (default: 10)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="Number of repetitions for mean±std (default: 1)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=RANDOM_SEED,
        help="Random seed (default: 42)",
    )
    args = parser.parse_args()

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
