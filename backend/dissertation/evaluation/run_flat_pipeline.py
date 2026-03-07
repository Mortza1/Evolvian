"""
Config B evaluation harness: Flat multi-agent pipeline (no hierarchy).

Uses the same specialist agents as Config C (hierarchical), but wired
sequentially in a flat WorkFlowGraph: Agent1 → Agent2 → Agent3.
No supervisor, no review loop, no escalation.

This isolates the value of *specialisation* (Config B vs A) from the
value of *hierarchy* (Config C vs B).

Usage:
    python -m dissertation.evaluation.run_flat_pipeline --benchmark hotpotqa --sample-k 10
    python -m dissertation.evaluation.run_flat_pipeline --benchmark all --sample-k 50
"""
import sys
import time
import json
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.agents import CustomizeAgent, AgentManager
from evoagentx.workflow.workflow_graph import WorkFlowGraph, WorkFlowNode, WorkFlowEdge
from evoagentx.evaluators.evaluator import Evaluator
from evoagentx.models.openrouter_model import OpenRouterLLM

from dissertation.config import get_llm_config, RESULTS_DIR, RANDOM_SEED
from dissertation.evaluation.run_baseline import (
    hotpotqa_collate, hotpotqa_postprocess,
    math_collate, math_postprocess,
    mbpp_collate, mbpp_postprocess,
    _param,
)
from dissertation.evaluation.answer_extraction import make_hotpotqa_fns


# Flat pipeline workflow builders (3 chained agents, no supervisor)

def build_hotpotqa_flat_pipeline(llm_config) -> tuple:
    """
    Config B flat pipeline for HotPotQA: Retriever → Reasoner → Synthesiser.
    Same specialists as Config C, but sequentially chained with no supervisor.
    """
    retriever = CustomizeAgent(
        name="Retriever",
        description="Retrieval Specialist for multi-hop QA",
        prompt=(
            "You are a Retrieval Specialist. Given a question and context, "
            "extract the most relevant sentences or facts that directly address "
            "the question. Be precise and quote from the context.\n\n"
            "Context:\n{context}\n\n"
            "Question: {question}\n\n"
            "Extract the key facts:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("question", "str", "The question"),
            _param("context", "str", "Supporting context"),
        ],
        outputs=[_param("retrieved_facts", "str", "Extracted facts")],
        parse_mode="str",
    )

    reasoner = CustomizeAgent(
        name="Reasoner",
        description="Reasoning Specialist for multi-hop QA",
        prompt=(
            "You are a Reasoning Specialist. Given a question and retrieved facts, "
            "reason through the evidence step by step to produce an answer.\n\n"
            "Question: {question}\n\n"
            "Retrieved facts:\n{retrieved_facts}\n\n"
            "Reason through the facts and provide your answer:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("question", "str", "The question"),
            _param("retrieved_facts", "str", "Facts from retriever"),
        ],
        outputs=[_param("reasoning_output", "str", "Reasoned answer")],
        parse_mode="str",
    )

    synthesiser = CustomizeAgent(
        name="Synthesiser",
        description="Synthesis Specialist for multi-hop QA",
        prompt=(
            "You are a Synthesis Specialist. Given a question and a reasoned response, "
            "extract ONLY the final short answer (a name, date, number, or brief phrase). "
            "Do not explain your reasoning.\n\n"
            "Question: {question}\n\n"
            "Reasoned response:\n{reasoning_output}\n\n"
            "Final short answer:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("question", "str", "The question"),
            _param("reasoning_output", "str", "Reasoning from previous step"),
        ],
        outputs=[_param("answer", "str", "The final answer")],
        parse_mode="str",
    )

    node1 = WorkFlowNode(
        name="retrieve_task",
        description="Extract relevant facts from context",
        inputs=[
            _param("question", "str", "The question"),
            _param("context", "str", "The context"),
        ],
        outputs=[_param("retrieved_facts", "str", "Extracted facts")],
        agents=[retriever],
    )
    node2 = WorkFlowNode(
        name="reason_task",
        description="Reason through retrieved facts",
        inputs=[
            _param("question", "str", "The question"),
            _param("retrieved_facts", "str", "Facts from retriever"),
        ],
        outputs=[_param("reasoning_output", "str", "Reasoned answer")],
        agents=[reasoner],
    )
    node3 = WorkFlowNode(
        name="synthesise_task",
        description="Synthesise final short answer",
        inputs=[
            _param("question", "str", "The question"),
            _param("reasoning_output", "str", "Reasoning from previous step"),
        ],
        outputs=[_param("answer", "str", "The final answer")],
        agents=[synthesiser],
    )

    graph = WorkFlowGraph(
        goal="Answer a multi-hop question using a retrieval-reasoning-synthesis pipeline",
        nodes=[node1, node2, node3],
        edges=[
            WorkFlowEdge(("retrieve_task", "reason_task")),
            WorkFlowEdge(("reason_task", "synthesise_task")),
        ],
    )
    agent_manager = AgentManager(agents=[retriever, reasoner, synthesiser])
    return graph, agent_manager


def build_math_flat_pipeline(llm_config) -> tuple:
    """
    Config B flat pipeline for MATH: Planner → Solver → Verifier.
    Same specialists as Config C, but sequentially chained with no supervisor.
    """
    planner = CustomizeAgent(
        name="Planner",
        description="Mathematics Planner",
        prompt=(
            "You are a Mathematics Planner. Given a math problem, identify the "
            "mathematical domain and plan the solution approach. List the steps "
            "needed to solve the problem. Do NOT solve it — only produce a plan.\n\n"
            "Problem: {problem}\n\n"
            "Solution plan:"
        ),
        llm_config=llm_config,
        inputs=[_param("problem", "str", "The math problem")],
        outputs=[_param("plan", "str", "The solution plan")],
        parse_mode="str",
    )

    solver = CustomizeAgent(
        name="Solver",
        description="Mathematics Solver",
        prompt=(
            "You are a Mathematics Solver. Given a problem and a solution plan, "
            "work through every step carefully. Show all working. "
            "At the end write 'Answer: <your answer>' where the answer is ONLY "
            "the final numerical or expression result.\n\n"
            "Problem: {problem}\n\n"
            "Solution plan:\n{plan}\n\n"
            "Solve step by step:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("problem", "str", "The math problem"),
            _param("plan", "str", "The solution plan"),
        ],
        outputs=[_param("solution", "str", "The solution with working")],
        parse_mode="str",
    )

    verifier = CustomizeAgent(
        name="Verifier",
        description="Mathematics Verifier",
        prompt=(
            "You are a Mathematics Verifier. Given a problem and a proposed solution, "
            "check the answer by re-deriving or substituting back. "
            "If the answer is correct, respond with the final answer in the format "
            "'Answer: <value>'. If incorrect, provide the corrected answer.\n\n"
            "Problem: {problem}\n\n"
            "Proposed solution:\n{solution}\n\n"
            "Verification and final answer:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("problem", "str", "The math problem"),
            _param("solution", "str", "Proposed solution to verify"),
        ],
        outputs=[_param("verified_answer", "str", "Verified final answer")],
        parse_mode="str",
    )

    node1 = WorkFlowNode(
        name="plan_task",
        description="Plan the solution approach",
        inputs=[_param("problem", "str", "The math problem")],
        outputs=[_param("plan", "str", "The solution plan")],
        agents=[planner],
    )
    node2 = WorkFlowNode(
        name="solve_task",
        description="Solve the math problem using the plan",
        inputs=[
            _param("problem", "str", "The math problem"),
            _param("plan", "str", "The solution plan"),
        ],
        outputs=[_param("solution", "str", "The solution")],
        agents=[solver],
    )
    node3 = WorkFlowNode(
        name="verify_task",
        description="Verify the solution",
        inputs=[
            _param("problem", "str", "The math problem"),
            _param("solution", "str", "Proposed solution"),
        ],
        outputs=[_param("verified_answer", "str", "Verified final answer")],
        agents=[verifier],
    )

    graph = WorkFlowGraph(
        goal="Solve a math problem using a plan-solve-verify pipeline",
        nodes=[node1, node2, node3],
        edges=[
            WorkFlowEdge(("plan_task", "solve_task")),
            WorkFlowEdge(("solve_task", "verify_task")),
        ],
    )
    agent_manager = AgentManager(agents=[planner, solver, verifier])
    return graph, agent_manager


def build_mbpp_flat_pipeline(llm_config) -> tuple:
    """
    Config B flat pipeline for MBPP: Designer → Coder → Tester.
    Same specialists as Config C, but sequentially chained with no supervisor.
    """
    designer = CustomizeAgent(
        name="Designer",
        description="Software Designer",
        prompt=(
            "You are a Software Designer. Given a task description and tests, "
            "design the implementation approach: function signature, algorithm, "
            "edge cases. Do NOT write the code — only the design.\n\n"
            "Task: {text}\n\n"
            "Tests:\n{test_list}\n\n"
            "Implementation design:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("design", "str", "Implementation design")],
        parse_mode="str",
    )

    coder = CustomizeAgent(
        name="Coder",
        description="Python Programmer",
        prompt=(
            "You are a Python Programmer. Given a task, tests, and a design, "
            "write a complete Python function that passes all the given tests. "
            "Return ONLY the Python code, no explanation.\n\n"
            "Task: {text}\n\n"
            "Tests:\n{test_list}\n\n"
            "Design:\n{design}\n\n"
            "Python code:"
        ),
        llm_config=llm_config,
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
            _param("design", "str", "Implementation design"),
        ],
        outputs=[_param("code", "str", "Python code")],
        parse_mode="str",
    )

    tester = CustomizeAgent(
        name="Tester",
        description="Software Tester",
        prompt=(
            "You are a Software Tester. Given code and test cases, verify whether "
            "the code satisfies each test. If it passes, return the code as-is. "
            "If it fails, describe the issue and provide a corrected version.\n\n"
            "Code:\n{code}\n\n"
            "Tests:\n{test_list}\n\n"
            "Final code (corrected if needed):"
        ),
        llm_config=llm_config,
        inputs=[
            _param("code", "str", "Code to test"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("final_code", "str", "Tested/corrected code")],
        parse_mode="str",
    )

    node1 = WorkFlowNode(
        name="design_task",
        description="Design the implementation",
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("design", "str", "Implementation design")],
        agents=[designer],
    )
    node2 = WorkFlowNode(
        name="code_task",
        description="Write the Python code",
        inputs=[
            _param("text", "str", "Task description"),
            _param("test_list", "str", "Test cases"),
            _param("design", "str", "Implementation design"),
        ],
        outputs=[_param("code", "str", "Python code")],
        agents=[coder],
    )
    node3 = WorkFlowNode(
        name="test_task",
        description="Test and correct the code",
        inputs=[
            _param("code", "str", "Code to test"),
            _param("test_list", "str", "Test cases"),
        ],
        outputs=[_param("final_code", "str", "Tested code")],
        agents=[tester],
    )

    graph = WorkFlowGraph(
        goal="Generate Python code using a design-code-test pipeline",
        nodes=[node1, node2, node3],
        edges=[
            WorkFlowEdge(("design_task", "code_task")),
            WorkFlowEdge(("code_task", "test_task")),
        ],
    )
    agent_manager = AgentManager(agents=[designer, coder, tester])
    return graph, agent_manager


# Benchmark registry (flat pipeline versions)

from dissertation.benchmarks.math_level45 import MATHLevel45
from dissertation.benchmarks.math_levels import MATHLevel23, MATHByLevel
from evoagentx.benchmark.hotpotqa import HotPotQA
from evoagentx.benchmark.math_benchmark import MATH
from evoagentx.benchmark.mbpp import MBPP

PIPELINE_BENCHMARK_REGISTRY = {
    "hotpotqa": {
        "class": HotPotQA,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_hotpotqa_flat_pipeline,
        "collate": hotpotqa_collate,
        "postprocess": hotpotqa_postprocess,
        "primary_metric": "f1",
    },
    "math": {
        "class": MATH,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_math_flat_pipeline,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "acc",
    },
    "mbpp": {
        "class": MBPP,
        "kwargs": {"mode": "dev"},
        "eval_mode": "dev",
        "workflow_fn": build_mbpp_flat_pipeline,
        "collate": mbpp_collate,
        "postprocess": mbpp_postprocess,
        "primary_metric": "pass_at_1",
    },
    "math_hard": {
        "class": MATHLevel45,
        "kwargs": {"mode": "all"},
        "eval_mode": "test",
        "workflow_fn": build_math_flat_pipeline,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "solve_rate",
    },
    "math_moderate": {
        "class": MATHLevel23,
        "kwargs": {"mode": "all"},
        "eval_mode": "test",
        "workflow_fn": build_math_flat_pipeline,
        "collate": math_collate,
        "postprocess": math_postprocess,
        "primary_metric": "solve_rate",
    },
    **{
        f"math_l{lvl}": {
            "class": MATHByLevel,
            "kwargs": {"mode": "all", "level": lvl},
            "eval_mode": "test",
            "workflow_fn": build_math_flat_pipeline,
            "collate": math_collate,
            "postprocess": math_postprocess,
            "primary_metric": "solve_rate",
        }
        for lvl in range(1, 6)
    },
}


# Runner

def run_flat_pipeline(
    benchmark_name: str,
    sample_k: int = 10,
    seed: int = RANDOM_SEED,
    run_idx: int = 0,
) -> dict:
    """
    Run Config B (flat multi-agent pipeline, no hierarchy) on one benchmark.
    """
    cfg = PIPELINE_BENCHMARK_REGISTRY[benchmark_name]
    llm_config = get_llm_config(temperature=0.1, max_tokens=1024)
    llm = OpenRouterLLM(config=llm_config)

    print(f"\n{'='*60}")
    print(f"Config B (Flat Pipeline) | {benchmark_name.upper()} | run {run_idx+1} | n={sample_k}")
    print(f"{'='*60}")

    print("Loading benchmark data...")
    benchmark = cfg["class"](**cfg["kwargs"])

    print("Building flat pipeline workflow...")
    graph, agent_manager = cfg["workflow_fn"](llm_config)

    if benchmark_name == "hotpotqa":
        collate_fn, postprocess_fn = make_hotpotqa_fns(llm)
    else:
        collate_fn, postprocess_fn = cfg["collate"], cfg["postprocess"]

    evaluator = Evaluator(
        llm=llm,
        agent_manager=agent_manager,
        collate_func=collate_fn,
        output_postprocess_func=postprocess_fn,
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
        update_agents=True,
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


def run_all_flat_pipeline(sample_k: int = 10, num_runs: int = 1) -> dict:
    """Run Config B on all available benchmarks."""
    all_results = {}
    for bench in PIPELINE_BENCHMARK_REGISTRY:
        bench_results = []
        for run_i in range(num_runs):
            r = run_flat_pipeline(bench, sample_k=sample_k, seed=RANDOM_SEED + run_i, run_idx=run_i)
            bench_results.append(r)
        all_results[bench] = bench_results

    print("\n" + "="*60)
    print("FLAT PIPELINE SUMMARY (Config B)")
    print("="*60)
    print(f"{'Benchmark':<12} {'Metric':<12} {'Score':>8}")
    print("-"*35)
    for bench, results in all_results.items():
        primary_metric = PIPELINE_BENCHMARK_REGISTRY[bench]["primary_metric"]
        scores = [r["primary_value"] for r in results]
        mean = sum(scores) / len(scores)
        print(f"{bench:<12} {primary_metric:<12} {mean:>8.4f}")

    return all_results


# CLI

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Config B flat pipeline evaluation")
    parser.add_argument("--benchmark", default="hotpotqa",
                        choices=list(PIPELINE_BENCHMARK_REGISTRY.keys()) + ["all"],
                        help="Which benchmark to run")
    parser.add_argument("--sample-k", type=int, default=10,
                        help="Number of examples to evaluate (default: 10)")
    parser.add_argument("--runs", type=int, default=1,
                        help="Number of repetitions (default: 1)")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    if args.benchmark == "all":
        run_all_flat_pipeline(sample_k=args.sample_k, num_runs=args.runs)
    else:
        for run_i in range(args.runs):
            run_flat_pipeline(
                args.benchmark,
                sample_k=args.sample_k,
                seed=args.seed + run_i,
                run_idx=run_i,
            )
