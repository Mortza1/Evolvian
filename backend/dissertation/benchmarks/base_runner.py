"""
Config B benchmark runner: HierarchicalWorkFlow evaluation.

Provides:
  - HierarchicalEvaluator  — subclasses Evaluator to use HierarchicalWorkFlow
  - run_hierarchical()     — runs Config B on a single benchmark
  - run_all_hierarchical() — runs Config B on all benchmarks

Usage:
    python -m dissertation.benchmarks.base_runner --benchmark hotpotqa --sample-k 10
    python -m dissertation.benchmarks.base_runner --benchmark all --sample-k 50
"""
import sys
import time
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Tuple, Union

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.evaluators.evaluator import Evaluator
from evoagentx.workflow.workflow_graph import WorkFlowGraph
from evoagentx.benchmark.hotpotqa import HotPotQA
from evoagentx.benchmark.math_benchmark import MATH
from evoagentx.benchmark.mbpp import MBPP
from evoagentx.models.openrouter_model import OpenRouterLLM

from dissertation.config import get_llm_config, RESULTS_DIR, RANDOM_SEED
from dissertation.hierarchy.hierarchical_graph import HierarchicalWorkFlowGraph
from dissertation.hierarchy.execution import HierarchicalWorkFlow
from dissertation.benchmarks.hotpotqa_teams import build_hotpotqa_team
from dissertation.benchmarks.gaia_teams import build_gaia_teams
from dissertation.benchmarks.math_teams import build_math_team
from dissertation.benchmarks.mbpp_teams import build_mbpp_team

# Re-use collate/postprocess from baseline (same format, different workflow)
from dissertation.evaluation.run_baseline import (
    hotpotqa_collate, hotpotqa_postprocess,
    math_collate, math_postprocess,
    mbpp_collate, mbpp_postprocess,
)


# ---------------------------------------------------------------------------
# HierarchicalEvaluator
# ---------------------------------------------------------------------------

class HierarchicalEvaluator(Evaluator):
    """
    Evaluator that uses HierarchicalWorkFlow instead of the plain WorkFlow.

    Override only _execute_workflow_graph so that HierarchicalWorkFlowGraph
    instances are run through HierarchicalWorkFlow, preserving the full
    decompose → delegate → execute → review loop.
    """

    def _execute_workflow_graph(
        self,
        graph: WorkFlowGraph,
        inputs: dict,
        return_trajectory: bool = False,
        **kwargs,
    ) -> Union[str, Tuple[str, list]]:
        if isinstance(graph, HierarchicalWorkFlowGraph):
            # Reset node states so the graph can be re-executed per example
            graph_copy = HierarchicalWorkFlowGraph(
                goal=graph.goal,
                nodes=graph.nodes,
                edges=graph.edges,
                teams=graph.teams,
                team_graph=graph.team_graph,
                inter_team_protocol=graph.inter_team_protocol,
            )
            graph_copy.reset_graph()
            workflow = HierarchicalWorkFlow(
                llm=self.llm,
                graph=graph_copy,
                agent_manager=self.agent_manager,
                **kwargs,
            )
            output: str = workflow.execute(inputs=inputs, **kwargs)
            if return_trajectory:
                return output, workflow.environment.get()
            return output

        # Fall back to standard WorkFlow for non-hierarchical graphs
        return super()._execute_workflow_graph(graph, inputs, return_trajectory, **kwargs)


# ---------------------------------------------------------------------------
# Benchmark registry
# ---------------------------------------------------------------------------

BENCHMARK_REGISTRY = {
    "hotpotqa": {
        "class": HotPotQA,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_hotpotqa_team,
        "collate": hotpotqa_collate,
        "postprocess": hotpotqa_postprocess,
        "primary_metric": "f1",
    },
    "math": {
        "class": MATH,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_math_team,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "acc",
    },
    "mbpp": {
        "class": MBPP,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_mbpp_team,
        "collate": mbpp_collate,
        "postprocess": mbpp_postprocess,
        "primary_metric": "pass_at_1",
    },
}


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_hierarchical(
    benchmark_name: str,
    sample_k: int = 10,
    seed: int = RANDOM_SEED,
    run_idx: int = 0,
) -> dict:
    """
    Run Config B (hierarchical team workflow, no evolution) on one benchmark.

    Args:
        benchmark_name: One of "hotpotqa", "math", "mbpp"
        sample_k:       How many examples to evaluate
        seed:           Random seed for sampling
        run_idx:        Which repetition (0, 1, 2) — affects the filename

    Returns:
        dict with results
    """
    cfg = BENCHMARK_REGISTRY[benchmark_name]
    llm_config = get_llm_config(temperature=0.1, max_tokens=512)
    llm = OpenRouterLLM(config=llm_config)

    print(f"\n{'='*60}")
    print(f"Config B (Hierarchical) | {benchmark_name.upper()} | run {run_idx+1} | n={sample_k}")
    print(f"{'='*60}")

    print("Loading benchmark data...")
    benchmark = cfg["class"](**cfg["kwargs"])

    print("Building hierarchical team workflow...")
    graph, agent_manager = cfg["workflow_fn"](llm_config)

    evaluator = HierarchicalEvaluator(
        llm=llm,
        agent_manager=agent_manager,
        collate_func=cfg["collate"],
        output_postprocess_func=cfg["postprocess"],
        verbose=True,
    )

    t_start = time.time()

    print(f"Evaluating {sample_k} examples...")
    metrics = evaluator.evaluate(
        graph=graph,
        benchmark=benchmark,
        eval_mode=cfg["eval_mode"],
        sample_k=sample_k,
        seed=seed,
        update_agents=False,  # agents already configured with llm_config
    )

    elapsed = time.time() - t_start

    result = {
        "config": "B",
        "benchmark": benchmark_name,
        "run_idx": run_idx,
        "sample_k": sample_k,
        "seed": seed,
        "metrics": metrics,
        "primary_metric": cfg["primary_metric"],
        "primary_value": metrics.get(cfg["primary_metric"], 0.0),
        "elapsed_seconds": elapsed,
        "timestamp": datetime.now().isoformat(),
        "model": llm_config.model,
    }

    out_path = RESULTS_DIR / f"config_b_{benchmark_name}_run{run_idx}.json"
    out_path.write_text(json.dumps(result, indent=2))
    print(f"\nResults saved to {out_path}")
    print(f"Primary metric ({cfg['primary_metric']}): {result['primary_value']:.4f}")
    print(f"All metrics: {metrics}")
    print(f"Elapsed: {elapsed:.1f}s")

    return result


def run_all_hierarchical(sample_k: int = 10, num_runs: int = 1) -> dict:
    """Run Config B on all available benchmarks."""
    all_results = {}
    for bench in BENCHMARK_REGISTRY:
        bench_results = []
        for run_i in range(num_runs):
            r = run_hierarchical(bench, sample_k=sample_k, seed=RANDOM_SEED + run_i, run_idx=run_i)
            bench_results.append(r)
        all_results[bench] = bench_results

    print("\n" + "="*60)
    print("HIERARCHICAL SUMMARY (Config B)")
    print("="*60)
    print(f"{'Benchmark':<12} {'Metric':<12} {'Score':>8}")
    print("-"*35)
    for bench, results in all_results.items():
        primary_metric = BENCHMARK_REGISTRY[bench]["primary_metric"]
        scores = [r["primary_value"] for r in results]
        mean = sum(scores) / len(scores)
        print(f"{bench:<12} {primary_metric:<12} {mean:>8.4f}")

    return all_results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Config B hierarchical evaluation")
    parser.add_argument("--benchmark", default="hotpotqa",
                        choices=list(BENCHMARK_REGISTRY.keys()) + ["all"],
                        help="Which benchmark to run")
    parser.add_argument("--sample-k", type=int, default=10,
                        help="Number of examples to evaluate (default: 10 for quick test)")
    parser.add_argument("--runs", type=int, default=1,
                        help="Number of repetitions (default: 1)")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    if args.benchmark == "all":
        run_all_hierarchical(sample_k=args.sample_k, num_runs=args.runs)
    else:
        run_hierarchical(args.benchmark, sample_k=args.sample_k, seed=args.seed, run_idx=0)
