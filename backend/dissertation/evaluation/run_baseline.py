"""
Config A: Vanilla EvoAgentX flat workflow baseline.

Runs each benchmark with a single CustomizeAgent in a flat WorkFlowGraph.
This reproduces the EvoAgentX paper's baseline configuration and gives us
the Config A numbers for the dissertation comparison table.

Usage:
    python -m dissertation.evaluation.run_baseline --benchmark hotpotqa --sample-k 10
    python -m dissertation.evaluation.run_baseline --benchmark all --sample-k 50
"""
import sys
import time
import json
import argparse
from pathlib import Path
from datetime import datetime

# Ensure evoAgentX is importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.benchmark.hotpotqa import HotPotQA
from evoagentx.benchmark.math_benchmark import MATH
from evoagentx.benchmark.mbpp import MBPP
from dissertation.benchmarks.math_level45 import MATHLevel45
from dissertation.benchmarks.math_levels import MATHLevel23, MATHByLevel
from evoagentx.agents import CustomizeAgent, AgentManager
from evoagentx.workflow.workflow_graph import WorkFlowGraph, WorkFlowNode
from evoagentx.workflow.workflow import WorkFlow
from evoagentx.evaluators.evaluator import Evaluator
from evoagentx.models.openrouter_model import OpenRouterLLM
from dissertation.config import get_llm_config, RESULTS_DIR, RANDOM_SEED
from dissertation.evaluation.answer_extraction import make_hotpotqa_fns


def _param(name: str, type_: str, description: str) -> dict:
    """Helper: create an input/output parameter dict for CustomizeAgent/WorkFlowNode."""
    return {"name": name, "type": type_, "description": description}


# ---------------------------------------------------------------------------
# Collate / postprocess functions per benchmark
# ---------------------------------------------------------------------------

def hotpotqa_collate(example: dict) -> dict:
    """Format a HotPotQA example as workflow inputs."""
    paragraphs = [item[1] for item in example["context"] if isinstance(item[1], list)]
    context_str = "\n\n".join(" ".join(p) for p in paragraphs)
    if len(context_str) > 4000:
        context_str = context_str[:4000] + "..."
    return {
        "question": example["question"],
        "context": context_str,
    }


def hotpotqa_postprocess(output: str) -> str:
    """Extract clean answer string from workflow output."""
    if not output:
        return ""
    # Take first line if multi-line, strip whitespace
    lines = [l.strip() for l in output.strip().splitlines() if l.strip()]
    return lines[0] if lines else output.strip()


def math_collate(example: dict) -> dict:
    return {"problem": example.get("problem", example.get("question", ""))}


def math_postprocess(output: str) -> str:
    """Extract the final answer from model output for MATH evaluation.

    The MATH benchmark's evaluate() calls extract_answer() which looks for
    \\boxed{} first, then falls back to the last sentence. LLM outputs
    typically use 'Answer: <value>' format instead of \\boxed{}, so we
    extract that pattern here to pass a clean value to extract_answer().
    """
    if not output:
        return ""
    import re
    # Try to find "Answer: <value>" or "Final answer: <value>" patterns
    # Handle LaTeX delimiters: $...$, \(...\), and plain text
    for pattern in [
        r'(?:final\s+)?answer\s*(?:is|[:=])\s*\$([^$]+)\$',        # Answer: $v$ / answer is $v$
        r'(?:final\s+)?answer\s*(?:is|[:=])\s*\\\(([^)]+)\\\)',     # Answer: \(v\) / answer is \(v\)
        r'(?:final\s+)?answer\s*(?:is|[:=])\s*\\boxed\{([^}]+)\}',  # Answer: \boxed{v}
        r'(?:final\s+)?answer\s*(?:is|[:=])\s*(.+?)(?:\n|$)',        # Answer: v (plain)
    ]:
        m = re.search(pattern, output, re.IGNORECASE)
        if m:
            answer = m.group(1).strip().rstrip('.*')
            if answer:
                # Wrap in \boxed{} so extract_answer() picks it up cleanly
                return f"\\boxed{{{answer}}}"
    # Fallback: return stripped output for extract_answer's last-sentence heuristic
    return output.strip()


def mbpp_collate(example: dict) -> dict:
    return {
        "task_id": str(example.get("task_id", "")),
        "text": example.get("text", ""),
        "test_list": "\n".join(example.get("test_list", [])),
    }


def mbpp_postprocess(output: str) -> str:
    return output.strip() if output else ""


# ---------------------------------------------------------------------------
# Flat workflow builders per benchmark
# ---------------------------------------------------------------------------

def build_hotpotqa_flat_workflow(llm_config) -> tuple:
    """
    Config A flat workflow for HotPotQA: single QA agent.
    Returns (workflow_graph, agent_manager).
    """
    qa_agent = CustomizeAgent(
        name="QAAgent",
        description="Multi-hop question answering agent",
        prompt=(
            "You are a multi-hop question answering assistant.\n\n"
            "Context:\n{context}\n\n"
            "Question: {question}\n\n"
            "Think step by step about what information is needed, then give ONLY "
            "the final short answer (a name, date, number, or brief phrase). "
            "Do not explain your reasoning in the answer."
        ),
        llm_config=llm_config,
        inputs=[
            _param("question", "str", "The question to answer"),
            _param("context", "str", "Supporting context paragraphs"),
        ],
        outputs=[_param("answer", "str", "The answer to the question")],
        parse_mode="str",
    )

    node = WorkFlowNode(
        name="qa_task",
        description="Answer the multi-hop question",
        inputs=[
            _param("question", "str", "The question"),
            _param("context", "str", "The context"),
        ],
        outputs=[_param("answer", "str", "The answer")],
        agents=[qa_agent],
    )

    graph = WorkFlowGraph(goal="Answer a multi-hop question given context", nodes=[node])
    agent_manager = AgentManager(agents=[qa_agent])
    return graph, agent_manager


def build_math_flat_workflow(llm_config) -> tuple:
    """Config A flat workflow for MATH: single solver agent."""
    solver = CustomizeAgent(
        name="MathSolver",
        description="Mathematical problem solving agent",
        prompt=(
            "You are a mathematical problem solver.\n\n"
            "Problem: {problem}\n\n"
            "Solve this step by step. At the end write 'Answer: <your answer>' "
            "where the answer is ONLY the final numerical or expression result."
        ),
        llm_config=llm_config,
        inputs=[_param("problem", "str", "The math problem")],
        outputs=[_param("solution", "str", "The solution")],
        parse_mode="str",
    )
    node = WorkFlowNode(
        name="solve_task",
        description="Solve the math problem",
        inputs=[_param("problem", "str", "The math problem")],
        outputs=[_param("solution", "str", "The solution")],
        agents=[solver],
    )
    graph = WorkFlowGraph(goal="Solve a mathematical problem", nodes=[node])
    agent_manager = AgentManager(agents=[solver])
    return graph, agent_manager


def build_mbpp_flat_workflow(llm_config) -> tuple:
    """Config A flat workflow for MBPP: single coder agent."""
    coder = CustomizeAgent(
        name="Coder",
        description="Python code generation agent",
        prompt=(
            "You are a Python programming expert.\n\n"
            "Task: {text}\n\n"
            "Tests that your code must pass:\n{test_list}\n\n"
            "Write a complete Python function that solves the task and passes the tests. "
            "Return ONLY the Python code, no explanation."
        ),
        llm_config=llm_config,
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("code", "str", "The Python code")],
        parse_mode="str",
    )
    node = WorkFlowNode(
        name="code_task",
        description="Write Python code for the task",
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("code", "str", "The code")],
        agents=[coder],
    )
    graph = WorkFlowGraph(goal="Generate Python code for a programming task", nodes=[node])
    agent_manager = AgentManager(agents=[coder])
    return graph, agent_manager


# ---------------------------------------------------------------------------
# Benchmark runner
# ---------------------------------------------------------------------------

BENCHMARK_REGISTRY = {
    "hotpotqa": {
        "class": HotPotQA,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_hotpotqa_flat_workflow,
        "collate": hotpotqa_collate,
        "postprocess": hotpotqa_postprocess,
        "primary_metric": "f1",
    },
    "math": {
        "class": MATH,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_math_flat_workflow,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "acc",
    },
    "mbpp": {
        "class": MBPP,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_mbpp_flat_workflow,
        "collate": mbpp_collate,
        "postprocess": mbpp_postprocess,
        "primary_metric": "pass_at_1",
    },
    "math_hard": {
        "class": MATHLevel45,
        "kwargs": {"mode": "all"},
        "eval_mode": "test",
        "workflow_fn": build_math_flat_workflow,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "solve_rate",
    },
    "math_moderate": {
        "class": MATHLevel23,
        "kwargs": {"mode": "all"},
        "eval_mode": "test",
        "workflow_fn": build_math_flat_workflow,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "solve_rate",
    },
    **{
        f"math_l{lvl}": {
            "class": MATHByLevel,
            "kwargs": {"mode": "all", "level": lvl},
            "eval_mode": "test",
            "workflow_fn": build_math_flat_workflow,
            "collate": math_collate,
            "postprocess": math_postprocess,
            "primary_metric": "solve_rate",
        }
        for lvl in range(1, 6)
    },
}


def run_baseline(benchmark_name: str, sample_k: int = 10, seed: int = RANDOM_SEED, run_idx: int = 0):
    """
    Run Config A (vanilla EvoAgentX flat workflow) on one benchmark.

    Args:
        benchmark_name: One of "hotpotqa", "math", "mbpp"
        sample_k: How many examples to evaluate
        seed: Random seed for sampling
        run_idx: Which repetition (0, 1, 2) — affects the filename

    Returns:
        dict with results
    """
    cfg = BENCHMARK_REGISTRY[benchmark_name]
    llm_config = get_llm_config(temperature=0.1, max_tokens=1024)
    llm = OpenRouterLLM(config=llm_config)

    print(f"\n{'='*60}")
    print(f"Config A (Baseline) | {benchmark_name.upper()} | run {run_idx+1} | n={sample_k}")
    print(f"{'='*60}")

    # Load benchmark
    print("Loading benchmark data...")
    benchmark = cfg["class"](**cfg["kwargs"])

    # Build flat workflow
    graph, agent_manager = cfg["workflow_fn"](llm_config)

    # For HotPotQA use extraction-aware collate/postprocess; others use registry defaults
    if benchmark_name == "hotpotqa":
        collate_fn, postprocess_fn = make_hotpotqa_fns(llm)
    else:
        collate_fn, postprocess_fn = cfg["collate"], cfg["postprocess"]

    # Create evaluator with benchmark-specific collate/postprocess
    evaluator = Evaluator(
        llm=llm,
        agent_manager=agent_manager,
        collate_func=collate_fn,
        output_postprocess_func=postprocess_fn,
        verbose=True,
    )

    # Track timing
    t_start = time.time()

    # Run evaluation
    print(f"Evaluating {sample_k} examples...")
    metrics = evaluator.evaluate(
        graph=graph,
        benchmark=benchmark,
        eval_mode=cfg["eval_mode"],
        sample_k=sample_k,
        seed=seed,
        update_agents=True,
    )

    elapsed = time.time() - t_start

    # Collect result
    result = {
        "config": "A",
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

    # Save to results/
    out_path = RESULTS_DIR / f"config_a_{benchmark_name}_run{run_idx}.json"
    out_path.write_text(json.dumps(result, indent=2))
    print(f"\nResults saved to {out_path}")
    print(f"Primary metric ({cfg['primary_metric']}): {result['primary_value']:.4f}")
    print(f"All metrics: {metrics}")
    print(f"Elapsed: {elapsed:.1f}s")

    return result


def run_all_baselines(sample_k: int = 10, num_runs: int = 1):
    """Run Config A on all available benchmarks."""
    all_results = {}
    for bench in BENCHMARK_REGISTRY:
        bench_results = []
        for run_i in range(num_runs):
            r = run_baseline(bench, sample_k=sample_k, seed=RANDOM_SEED + run_i, run_idx=run_i)
            bench_results.append(r)
        all_results[bench] = bench_results

    # Print summary table
    print("\n" + "="*60)
    print("BASELINE SUMMARY (Config A)")
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
    parser = argparse.ArgumentParser(description="Run Config A baseline evaluation")
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
        run_all_baselines(sample_k=args.sample_k, num_runs=args.runs)
    else:
        run_baseline(args.benchmark, sample_k=args.sample_k, seed=args.seed, run_idx=0)
