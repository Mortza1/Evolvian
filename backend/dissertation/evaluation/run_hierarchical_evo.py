"""
Config D evaluation harness: Hierarchical team workflow WITH evolution.

Implements LLM-guided text-gradient prompt optimisation for hierarchical
agent descriptions, inspired by TextGrad (Zou et al., 2024).

How it works
------------
1. Build a HierarchicalWorkFlowGraph (same team configs as Config C).
2. Sample a training batch from the benchmark.
3. Run each example through HierarchicalWorkFlow; collect (input, output, label) triples.
4. For any incorrect outputs, ask an "optimiser LLM" to diagnose the error and
   suggest improved agent descriptions (text gradient).
5. Update the affected agents' descriptions in the graph.
6. Repeat for `max_steps` optimisation steps, evaluating on a held-out validation
   split every `eval_every_n_steps` steps.
7. Keep the best-performing configuration (rollback enabled by default).
8. Final evaluation on the dev/test split; save results to results/config_d_*.json.

Usage:
    python -m dissertation.evaluation.run_hierarchical_evo \\
        --benchmark hotpotqa --sample-k 10 --train-k 5 --max-steps 3

    python -m dissertation.evaluation.run_hierarchical_evo \\
        --benchmark all --sample-k 50 --train-k 20 --max-steps 5 --runs 3
"""
import sys
import copy
import time
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.benchmark.hotpotqa import HotPotQA
from evoagentx.benchmark.math_benchmark import MATH
from evoagentx.benchmark.mbpp import MBPP
from evoagentx.models.openrouter_model import OpenRouterLLM

from dissertation.config import get_llm_config, RESULTS_DIR, RANDOM_SEED
from dissertation.benchmarks.base_runner import (
    HierarchicalEvaluator,
    BENCHMARK_REGISTRY,
)

# Collate / postprocess re-used from Config A baseline
from dissertation.evaluation.run_baseline import (
    hotpotqa_collate, hotpotqa_postprocess,
    math_collate, math_postprocess,
    mbpp_collate, mbpp_postprocess,
)
from dissertation.evaluation.answer_extraction import make_hotpotqa_fns


# ---------------------------------------------------------------------------
# Optimiser prompts
# ---------------------------------------------------------------------------

_ANALYSE_PROMPT = """\
You are an expert in multi-agent system design. You are helping optimise a \
hierarchical team of AI agents.

CURRENT AGENT DESCRIPTIONS
---------------------------
{agent_descriptions}

FAILURE EXAMPLES (input → actual output vs expected)
-----------------------------------------------------
{failures}

TASK
----
Analyse why the agents produced incorrect outputs. Then write improved \
descriptions for ONE OR MORE agents that would fix these errors.

Return your answer as a JSON object with this exact structure:
{{
  "analysis": "<one paragraph explaining the root cause of the failures>",
  "updates": {{
    "<AgentName>": "<new description for this agent>",
    ...
  }}
}}

Rules:
- Only include agents whose description needs to change.
- Keep descriptions concise (≤ 6 sentences).
- Preserve role clarity (supervisor vs worker).
- Do not change agent names.
"""

_NO_FAILURES_MSG = "All training examples produced correct outputs — no updates needed."


# ---------------------------------------------------------------------------
# HierarchicalEvolutionOptimiser
# ---------------------------------------------------------------------------

class HierarchicalEvolutionOptimiser:
    """
    Optimises agent descriptions in a HierarchicalWorkFlowGraph via LLM-guided
    text-gradient descent.

    Parameters
    ----------
    graph           : HierarchicalWorkFlowGraph to optimise (modified in-place).
    evaluator       : HierarchicalEvaluator to run examples and metrics.
    optimizer_llm   : LLM used to generate text gradients (description updates).
    benchmark       : EvoAgentX Benchmark instance (for training data access).
    benchmark_cfg   : Entry from BENCHMARK_REGISTRY (collate / postprocess fns).
    max_steps       : Total optimisation steps.
    train_k         : Examples sampled per optimisation step.
    eval_every_n    : Evaluate on val set every N steps (None = never).
    eval_k          : Examples used for intermediate evaluation.
    rollback        : Whether to restore best-scoring graph after optimisation.
    seed            : Base random seed.
    """

    def __init__(
        self,
        graph,
        evaluator: HierarchicalEvaluator,
        optimizer_llm,
        benchmark,
        benchmark_cfg: dict,
        max_steps: int = 5,
        train_k: int = 5,
        eval_every_n: Optional[int] = 2,
        eval_k: int = 10,
        rollback: bool = True,
        seed: int = RANDOM_SEED,
        collate_fn=None,
        postprocess_fn=None,
    ):
        self.graph = graph
        self.evaluator = evaluator
        self.optimizer_llm = optimizer_llm
        self.benchmark = benchmark
        self.cfg = benchmark_cfg
        self.max_steps = max_steps
        self.train_k = train_k
        self.eval_every_n = eval_every_n
        self.eval_k = eval_k
        self.rollback = rollback
        self.seed = seed
        # Allow overriding collate/postprocess (e.g. extraction-aware versions)
        self._collate_fn = collate_fn or benchmark_cfg["collate"]
        self._postprocess_fn = postprocess_fn or benchmark_cfg["postprocess"]

        # Snapshot: list of {"step": int, "metrics": dict, "agent_descs": dict}
        self._snapshots: list[dict] = []

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def optimise(self) -> dict:
        """
        Run the full optimisation loop.

        Returns the best metrics dict observed across all evaluation snapshots
        (or the final metrics if no intermediate evals were run).
        """
        print(f"\n{'─'*55}")
        print(f"Starting Config D evolution: {self.max_steps} steps, "
              f"train_k={self.train_k}")
        print(f"{'─'*55}")

        for step in range(self.max_steps):
            print(f"\n[Step {step+1}/{self.max_steps}] Sampling training batch …")
            step_seed = self.seed + step * 7  # different seed each step

            try:
                train_data = self.benchmark.get_train_data(
                    sample_k=self.train_k, seed=step_seed
                )
            except Exception:
                # Fall back to dev data if no train split exists
                train_data = self.benchmark.get_dev_data(
                    sample_k=self.train_k, seed=step_seed
                )

            failures = self._collect_failures(train_data)

            if failures:
                print(f"  {len(failures)} failure(s) — generating text gradient …")
                self._apply_gradient(failures)
            else:
                print(f"  No failures — skipping update.")

            if self.eval_every_n and (step + 1) % self.eval_every_n == 0:
                print(f"  Evaluating on validation set (k={self.eval_k}) …")
                metrics = self.evaluator.evaluate(
                    graph=self.graph,
                    benchmark=self.benchmark,
                    eval_mode=self.cfg["eval_mode"],
                    sample_k=self.eval_k,
                    seed=self.seed + 1000,
                    update_agents=False,
                )
                print(f"  Validation metrics: {metrics}")
                self._snapshots.append({
                    "step": step + 1,
                    "metrics": metrics,
                    "agent_descs": self._capture_descriptions(),
                })

        if self.rollback and self._snapshots:
            best = self._best_snapshot()
            print(f"\nRollback: restoring best config (step {best['step']}, "
                  f"metrics={best['metrics']})")
            self._restore_descriptions(best["agent_descs"])

        return self._snapshots[-1]["metrics"] if self._snapshots else {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _collect_failures(self, train_data: list) -> list[dict]:
        """
        Run train_data through the evaluator; return (input, output, label) for
        examples where the output does not match the label.
        """
        failures = []
        collate = self._collate_fn
        postprocess = self._postprocess_fn

        for example in train_data:
            inputs = collate(example)
            # Run a single example through the hierarchical workflow
            try:
                raw_out = self.evaluator._execute_workflow_graph(
                    self.graph, inputs
                )
            except Exception as e:
                raw_out = f"[ERROR: {e}]"

            predicted = postprocess(raw_out)

            # Get ground-truth label
            labels = self.benchmark.get_labels([example])
            label = labels[0] if labels else ""
            if isinstance(label, dict):
                label = str(label)

            # Simple mismatch check (same logic as EvoAgentX evaluators)
            if not self._is_correct(predicted, label):
                failures.append({
                    "inputs": inputs,
                    "predicted": predicted,
                    "expected": label,
                })

        return failures

    def _is_correct(self, predicted: str, label: str) -> bool:
        """
        Lightweight correctness check.
        Full metric computation happens in evaluator.evaluate(); here we just
        need a binary signal to decide whether to compute a gradient.
        """
        if not predicted or not label:
            return False
        p = predicted.strip().lower()
        l = label.strip().lower()
        # Exact match or containment (covers F1 ≈ 1 cases cheaply)
        return p == l or l in p or p in l

    def _apply_gradient(self, failures: list[dict]) -> None:
        """
        Ask optimizer_llm for improved agent descriptions and update the graph.
        """
        agent_descs = self._capture_descriptions()
        desc_str = "\n".join(
            f"  {name}: {desc}" for name, desc in agent_descs.items()
        )
        failure_str = "\n".join(
            f"  Input: {f['inputs']}\n"
            f"  Predicted: {f['predicted']}\n"
            f"  Expected : {f['expected']}"
            for f in failures[:5]  # cap at 5 to keep prompt manageable
        )

        prompt = _ANALYSE_PROMPT.format(
            agent_descriptions=desc_str,
            failures=failure_str,
        )

        try:
            response = self.optimizer_llm.generate(prompt)
            text = response.content if hasattr(response, "content") else str(response)
            updates = self._parse_updates(text)
            if updates:
                self._apply_description_updates(updates)
                print(f"    Updated agents: {list(updates.keys())}")
            else:
                print("    No valid updates parsed from optimiser response.")
        except Exception as e:
            print(f"    Optimiser LLM error: {e} — skipping update.")

    def _parse_updates(self, text: str) -> dict:
        """
        Parse the JSON 'updates' block from the optimiser response.
        Returns {agent_name: new_description} or {} on failure.
        """
        from dissertation.hierarchy.supervisor import SupervisorDecomposer
        json_str = SupervisorDecomposer._extract_json_block(text, '{', '}')
        if not json_str:
            return {}
        try:
            data = json.loads(json_str)
            return data.get("updates", {})
        except json.JSONDecodeError:
            return {}

    def _capture_descriptions(self) -> dict:
        """Return {agent_name: description} for all agents in the graph."""
        descs = {}
        for team in self.graph.teams:
            descs[team.supervisor.name] = team.supervisor.description
            for worker in team.workers:
                descs[worker.name] = worker.description
        return descs

    def _restore_descriptions(self, descs: dict) -> None:
        """Restore agent descriptions from a captured snapshot."""
        for team in self.graph.teams:
            if team.supervisor.name in descs:
                team.supervisor.description = descs[team.supervisor.name]
            for worker in team.workers:
                if worker.name in descs:
                    worker.description = descs[worker.name]

    def _apply_description_updates(self, updates: dict) -> None:
        """Apply {agent_name: new_desc} updates to agents in the graph."""
        for team in self.graph.teams:
            if team.supervisor.name in updates:
                team.supervisor.description = updates[team.supervisor.name]
            for worker in team.workers:
                if worker.name in updates:
                    worker.description = updates[worker.name]

    def _best_snapshot(self) -> dict:
        """Return the snapshot with the highest primary metric score."""
        primary = self.cfg["primary_metric"]
        return max(
            self._snapshots,
            key=lambda s: s["metrics"].get(primary, 0.0),
        )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_hierarchical_evo(
    benchmark_name: str,
    sample_k: int = 10,
    train_k: int = 5,
    max_steps: int = 3,
    eval_every_n: int = 2,
    seed: int = RANDOM_SEED,
    run_idx: int = 0,
) -> dict:
    """
    Run Config D (hierarchical team workflow WITH evolution) on one benchmark.

    Args:
        benchmark_name : One of "hotpotqa", "math", "mbpp"
        sample_k       : Test evaluation set size
        train_k        : Training examples per optimisation step
        max_steps      : Number of text-gradient optimisation steps
        eval_every_n   : Evaluate on val set every N steps
        seed           : Random seed
        run_idx        : Repetition index (affects output filename)

    Returns:
        dict with results
    """
    cfg = BENCHMARK_REGISTRY[benchmark_name]
    llm_config = get_llm_config(temperature=0.1, max_tokens=1024)
    optimizer_llm_config = get_llm_config(temperature=0.3, max_tokens=1024)
    llm = OpenRouterLLM(config=llm_config)
    optimizer_llm = OpenRouterLLM(config=optimizer_llm_config)

    print(f"\n{'='*60}")
    print(f"Config D (Hierarchical + Evolution) | {benchmark_name.upper()} "
          f"| run {run_idx+1} | n={sample_k}")
    print(f"  max_steps={max_steps}, train_k={train_k}, eval_every_n={eval_every_n}")
    print(f"{'='*60}")

    print("Loading benchmark data…")
    benchmark = cfg["class"](**cfg["kwargs"])

    print("Building hierarchical team workflow…")
    graph, agent_manager = cfg["workflow_fn"](llm_config)

    if benchmark_name == "hotpotqa":
        collate_fn, postprocess_fn = make_hotpotqa_fns(llm)
    else:
        collate_fn, postprocess_fn = cfg["collate"], cfg["postprocess"]

    evaluator = HierarchicalEvaluator(
        llm=llm,
        agent_manager=agent_manager,
        collate_func=collate_fn,
        output_postprocess_func=postprocess_fn,
        verbose=False,  # suppress per-example noise during optimisation
    )

    # Run evolution
    optimiser = HierarchicalEvolutionOptimiser(
        graph=graph,
        evaluator=evaluator,
        optimizer_llm=optimizer_llm,
        benchmark=benchmark,
        benchmark_cfg=cfg,
        max_steps=max_steps,
        train_k=train_k,
        eval_every_n=eval_every_n,
        eval_k=min(sample_k, 10),
        rollback=True,
        seed=seed,
        collate_fn=collate_fn,
        postprocess_fn=postprocess_fn,
    )

    t_start = time.time()
    evolution_metrics = optimiser.optimise()
    t_evo = time.time() - t_start

    # Final evaluation with optimised graph
    print(f"\n{'─'*55}")
    print(f"Final evaluation on {sample_k} examples …")
    evaluator.verbose = True
    final_metrics = evaluator.evaluate(
        graph=graph,
        benchmark=benchmark,
        eval_mode=cfg["eval_mode"],
        sample_k=sample_k,
        seed=seed,
        update_agents=False,
    )

    elapsed = time.time() - t_start

    result = {
        "config": "D",
        "benchmark": benchmark_name,
        "run_idx": run_idx,
        "sample_k": sample_k,
        "seed": seed,
        "metrics": final_metrics,
        "primary_metric": cfg["primary_metric"],
        "primary_value": final_metrics.get(cfg["primary_metric"], 0.0),
        "evolution": {
            "max_steps": max_steps,
            "train_k": train_k,
            "eval_every_n": eval_every_n,
            "snapshots": optimiser._snapshots,
            "evolution_time_seconds": t_evo,
        },
        "elapsed_seconds": elapsed,
        "timestamp": datetime.now().isoformat(),
        "model": llm_config.model,
    }

    out_path = RESULTS_DIR / f"config_d_{benchmark_name}_run{run_idx}.json"
    out_path.write_text(json.dumps(result, indent=2))
    print(f"\nResults saved to {out_path}")
    print(f"Primary metric ({cfg['primary_metric']}): {result['primary_value']:.4f}")
    print(f"All metrics: {final_metrics}")
    print(f"Elapsed: {elapsed:.1f}s (evolution: {t_evo:.1f}s)")

    return result


def run_all_hierarchical_evo(
    sample_k: int = 10,
    train_k: int = 5,
    max_steps: int = 3,
    num_runs: int = 1,
) -> dict:
    """Run Config D on all available benchmarks."""
    all_results = {}
    for bench in BENCHMARK_REGISTRY:
        bench_results = []
        for run_i in range(num_runs):
            r = run_hierarchical_evo(
                benchmark_name=bench,
                sample_k=sample_k,
                train_k=train_k,
                max_steps=max_steps,
                seed=RANDOM_SEED + run_i,
                run_idx=run_i,
            )
            bench_results.append(r)
        all_results[bench] = bench_results

    print("\n" + "=" * 60)
    print("HIERARCHICAL + EVOLUTION SUMMARY (Config D)")
    print("=" * 60)
    print(f"{'Benchmark':<12} {'Metric':<12} {'Score':>8}")
    print("-" * 35)
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
    parser = argparse.ArgumentParser(
        description="Run Config D (hierarchical + evolution) evaluation"
    )
    parser.add_argument(
        "--benchmark",
        default="hotpotqa",
        choices=list(BENCHMARK_REGISTRY.keys()) + ["all"],
        help="Which benchmark to run",
    )
    parser.add_argument(
        "--sample-k",
        type=int,
        default=10,
        help="Test evaluation examples (default: 10)",
    )
    parser.add_argument(
        "--train-k",
        type=int,
        default=5,
        help="Training examples per optimisation step (default: 5)",
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=3,
        help="Optimisation steps (default: 3)",
    )
    parser.add_argument(
        "--eval-every-n",
        type=int,
        default=2,
        help="Validate every N steps (default: 2)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="Repetitions for mean±std (default: 1)",
    )
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

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
