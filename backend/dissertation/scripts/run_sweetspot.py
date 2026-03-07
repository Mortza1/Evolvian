"""
Sweet-spot experiment: hierarchy benefit vs problem difficulty.

Runs Configs A, B, C on MATH Level 1 through Level 5 to identify the
difficulty range where hierarchical orchestration provides the most benefit.

Usage:
    python -m dissertation.scripts.run_sweetspot --sample-k 20 --runs 1
    python -m dissertation.scripts.run_sweetspot --sample-k 50 --runs 3 --configs A B C
"""
import sys
import json
import argparse
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from dissertation.config import RESULTS_DIR, RANDOM_SEED


def run_sweetspot(
    sample_k: int = 1,
    num_runs: int = 1,
    configs: list = None,
    seed: int = RANDOM_SEED,
):
    """
    Run A/B/C on MATH L1-L5, collect results, print comparison table.
    """
    if configs is None:
        configs = ["A", "B", "C"]

    levels = [1, 2, 3, 4, 5]
    results = defaultdict(lambda: defaultdict(list))  # {config: {level: [scores]}}

    for level in levels:
        bench_name = f"math_l{level}"
        for config in configs:
            for run_i in range(num_runs):
                run_seed = seed + run_i
                try:
                    if config == "A":
                        from dissertation.evaluation.run_baseline import run_baseline
                        r = run_baseline(bench_name, sample_k=sample_k, seed=run_seed, run_idx=run_i)
                    elif config == "B":
                        from dissertation.evaluation.run_flat_pipeline import run_flat_pipeline
                        r = run_flat_pipeline(bench_name, sample_k=sample_k, seed=run_seed, run_idx=run_i)
                    elif config == "C":
                        from dissertation.benchmarks.base_runner import run_hierarchical
                        r = run_hierarchical(bench_name, sample_k=sample_k, seed=run_seed, run_idx=run_i)
                    else:
                        print(f"Unknown config: {config}")
                        continue

                    results[config][level].append(r.get("primary_value", 0.0))
                except Exception as e:
                    print(f"  ERROR: Config {config}, Level {level}, run {run_i}: {e}")
                    results[config][level].append(0.0)

    # Print results table
    print(f"\n{'='*70}")
    print("SWEET-SPOT EXPERIMENT: Hierarchy Benefit vs MATH Difficulty Level")
    print(f"{'='*70}")

    header = f"{'Level':<10}"
    for cfg in configs:
        header += f" {'Config ' + cfg:>12}"
    if "A" in configs and "C" in configs:
        header += f" {'Delta C-A':>12}"
    if "A" in configs and "B" in configs:
        header += f" {'Delta B-A':>12}"
    print(header)
    print("-" * len(header))

    for level in levels:
        row = f"Level {level:<5}"
        means = {}
        for cfg in configs:
            scores = results[cfg].get(level, [0.0])
            mean = sum(scores) / len(scores) if scores else 0.0
            means[cfg] = mean
            if len(scores) > 1:
                import numpy as np
                std = float(np.std(scores))
                row += f" {mean:>8.4f}±{std:.3f}"
            else:
                row += f" {mean:>12.4f}"

        if "A" in configs and "C" in configs:
            delta = means.get("C", 0) - means.get("A", 0)
            sign = "+" if delta >= 0 else ""
            row += f" {sign}{delta:>11.4f}"
        if "A" in configs and "B" in configs:
            delta = means.get("B", 0) - means.get("A", 0)
            sign = "+" if delta >= 0 else ""
            row += f" {sign}{delta:>11.4f}"

        print(row)

    print(f"{'='*70}")

    # Save summary
    summary = {
        "experiment": "sweetspot",
        "sample_k": sample_k,
        "num_runs": num_runs,
        "configs": configs,
        "results": {
            cfg: {str(lvl): scores for lvl, scores in lvl_scores.items()}
            for cfg, lvl_scores in results.items()
        },
    }
    out_path = RESULTS_DIR / "sweetspot_summary.json"
    out_path.write_text(json.dumps(summary, indent=2))
    print(f"\nSummary saved to {out_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sweet-spot experiment: hierarchy benefit vs MATH difficulty"
    )
    parser.add_argument("--sample-k", type=int, default=20,
                        help="Examples per level per config (default: 20)")
    parser.add_argument("--runs", type=int, default=1,
                        help="Repetitions per experiment (default: 1)")
    parser.add_argument("--configs", nargs="+", default=["A", "B", "C"],
                        choices=["A", "B", "C", "D"],
                        help="Configs to run (default: A B C)")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    run_sweetspot(
        sample_k=args.sample_k,
        num_runs=args.runs,
        configs=args.configs,
        seed=args.seed,
    )
