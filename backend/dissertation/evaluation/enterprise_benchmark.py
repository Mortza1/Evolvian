"""
Enterprise Research-to-Report benchmark runner.

Runs Configs A, B, C on all 10 research briefs and saves:
  - Raw report output per config per brief
  - Execution trace (for structural metrics) for Config C
  - Timing and token metadata

No gold labels — scoring is done separately by enterprise_judge.py.

Usage:
    python -m dissertation.evaluation.enterprise_benchmark --config A
    python -m dissertation.evaluation.enterprise_benchmark --config C --brief-ids 1 2 3
    python -m dissertation.evaluation.enterprise_benchmark --config all
"""
import sys
import asyncio
import time
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.models.openrouter_model import OpenRouterLLM

from dissertation.config import get_llm_config, RESULTS_DIR
from dissertation.benchmarks.enterprise_briefs import get_all_briefs, get_brief, ResearchBrief
from dissertation.benchmarks.enterprise_teams import build_enterprise_team
from dissertation.benchmarks.base_runner import HierarchicalEvaluator
from dissertation.hierarchy.execution import HierarchicalWorkFlow

ENTERPRISE_RESULTS_DIR = RESULTS_DIR / "enterprise"
ENTERPRISE_RESULTS_DIR.mkdir(exist_ok=True)


# Config A — single generalist agent (direct LLM call)

def run_config_a_on_brief(brief: ResearchBrief, llm_config) -> dict:
    """Run Config A (single agent) on one brief. Uses sync generate() to avoid 402."""
    llm = OpenRouterLLM(config=llm_config)
    brief_text = brief.as_prompt_text()
    prompt = (
        "You are a senior business analyst and report writer.\n\n"
        f"{brief_text}\n\n"
        "Produce a comprehensive, well-structured report that:\n"
        "- Includes ALL required sections listed above (use the exact section names as headers)\n"
        "- Answers ALL specific questions listed above\n"
        "- Supports claims with evidence and reasoning\n"
        "- Provides a clear recommendation that follows from the analysis\n"
        "- Includes an Executive Summary at the top\n\n"
        "Write the full report now:"
    )

    t0 = time.time()
    time.sleep(1.0)
    report = llm.generate(prompt)
    if not isinstance(report, str):
        report = str(report)
    elapsed = time.time() - t0

    return {
        "config": "A",
        "brief_id": brief.id,
        "brief_title": brief.title,
        "report": report,
        "elapsed_seconds": elapsed,
        "structural_metrics": {"review_loops": 0, "escalations": 0, "revisions": 0},
    }


# Config B — flat pipeline (Research Analyst → Data Analyst → Report Writer)

def run_config_b_on_brief(brief: ResearchBrief, llm_config) -> dict:
    """Run Config B (3-agent flat pipeline) on one brief. Uses sync generate() to avoid 402."""
    llm = OpenRouterLLM(config=llm_config)
    brief_text = brief.as_prompt_text()

    t0 = time.time()

    # Stage 1: Research Analyst
    time.sleep(1.0)
    research_prompt = (
        "You are a Research Analyst. You have received the following research brief:\n\n"
        f"{brief_text}\n\n"
        "Conduct thorough research on ALL topics required by this brief. "
        "Provide structured findings with clear headings for each sub-topic. "
        "Address the specific questions listed in the brief with evidence and data. "
        "Be comprehensive — the Data Analyst will rely entirely on your output."
    )
    research_findings = llm.generate(research_prompt)
    if not isinstance(research_findings, str):
        research_findings = str(research_findings)

    # Stage 2: Data Analyst
    time.sleep(1.0)
    analysis_prompt = (
        "You are a Data Analyst. You have the original brief and research findings below.\n\n"
        f"ORIGINAL BRIEF:\n{brief_text}\n\n"
        f"RESEARCH FINDINGS:\n{research_findings}\n\n"
        "Perform structured analysis: create comparisons, matrices, estimates, and "
        "risk assessments as required by the brief. Identify key patterns and insights. "
        "Derive conclusions that will support the final recommendation. "
        "Be analytical — do not just restate the research."
    )
    analysis = llm.generate(analysis_prompt)
    if not isinstance(analysis, str):
        analysis = str(analysis)

    # Stage 3: Report Writer
    time.sleep(1.0)
    writing_prompt = (
        "You are a Report Writer. Produce the final report using the brief, "
        "research findings, and analysis provided.\n\n"
        f"ORIGINAL BRIEF:\n{brief_text}\n\n"
        f"RESEARCH FINDINGS:\n{research_findings}\n\n"
        f"ANALYSIS:\n{analysis}\n\n"
        "Write a complete, professionally structured report that:\n"
        "- Includes ALL required sections from the brief (use exact section names as headers)\n"
        "- Answers ALL specific questions from the brief\n"
        "- Has an Executive Summary that accurately reflects the body\n"
        "- Has a clear Recommendation grounded in the analysis\n"
        "Write the full report now:"
    )
    report = llm.generate(writing_prompt)
    if not isinstance(report, str):
        report = str(report)

    elapsed = time.time() - t0

    return {
        "config": "B",
        "brief_id": brief.id,
        "brief_title": brief.title,
        "report": report,
        "elapsed_seconds": elapsed,
        "structural_metrics": {"review_loops": 0, "escalations": 0, "revisions": 0},
    }


# Config C — hierarchical team

def run_config_c_on_brief(brief: ResearchBrief, llm_config) -> dict:
    """Run Config C (hierarchical) on one brief. Captures structural metrics."""
    from evoagentx.agents import AgentManager

    graph, agent_manager = build_enterprise_team(llm_config)
    llm = OpenRouterLLM(config=llm_config)

    workflow = HierarchicalWorkFlow(
        graph=graph,
        agent_manager=agent_manager,
        llm=llm,
    )

    t0 = time.time()
    result = asyncio.run(workflow.async_execute(
        inputs={"brief": brief.as_prompt_text()}
    ))
    elapsed = time.time() - t0

    # Extract structural metrics from trace
    structural = _extract_structural_metrics(workflow.trace)

    report = result if isinstance(result, str) else str(result)
    return {
        "config": "C",
        "brief_id": brief.id,
        "brief_title": brief.title,
        "report": report,
        "elapsed_seconds": elapsed,
        "structural_metrics": structural,
        "trace_events": [vars(e) for e in workflow.trace.events] if hasattr(workflow.trace, 'events') else [],
    }


# Helpers

def _extract_output(workflow_result, key: str) -> str:
    """Pull string output from workflow result (handles dict or string)."""
    if isinstance(workflow_result, dict):
        return str(workflow_result.get(key, workflow_result.get("output", "")))
    return str(workflow_result) if workflow_result else ""


def _extract_structural_metrics(trace) -> dict:
    """Count review loops, escalations, and revisions from execution trace."""
    review_loops = 0
    escalations = 0
    revisions = 0

    if not hasattr(trace, 'events') or not trace.events:
        return {"review_loops": review_loops, "escalations": escalations, "revisions": revisions}

    for event in trace.events:
        event_type = getattr(event, 'event_type', '') or getattr(event, 'type', '')
        event_type = str(event_type).lower()
        if 'review' in event_type:
            review_loops += 1
        if 'escalat' in event_type:
            escalations += 1
        if 'revis' in event_type:
            revisions += 1

    return {"review_loops": review_loops, "escalations": escalations, "revisions": revisions}


# Main runner

def run_config_on_briefs(
    config: str,
    brief_ids: Optional[list] = None,
    run_idx: int = 0,
) -> list:
    """
    Run a single config on selected briefs (or all 10).
    Returns list of result dicts. Saves each result to enterprise results dir.
    """
    llm_config = get_llm_config(temperature=0.1, max_tokens=2048)

    runners = {
        "A": run_config_a_on_brief,
        "B": run_config_b_on_brief,
        "C": run_config_c_on_brief,
    }

    if config not in runners:
        raise ValueError(f"Config must be A, B, or C — got '{config}'")

    runner = runners[config]
    briefs = get_all_briefs() if brief_ids is None else [get_brief(i) for i in brief_ids]

    results = []
    for brief in briefs:
        print(f"\n{'='*60}")
        print(f"Config {config} | Brief {brief.id}: {brief.title}")
        print(f"  Sections: {brief.section_count()} | Questions: {brief.question_count()} | Complexity: {brief.complexity}")
        print(f"{'='*60}")

        try:
            result = runner(brief, llm_config)
        except Exception as e:
            print(f"  ERROR: {e}")
            result = {
                "config": config,
                "brief_id": brief.id,
                "brief_title": brief.title,
                "report": f"[ERROR: {e}]",
                "elapsed_seconds": 0,
                "structural_metrics": {"review_loops": 0, "escalations": 0, "revisions": 0},
                "error": str(e),
            }

        result["run_idx"] = run_idx
        result["timestamp"] = datetime.now().isoformat()
        result["model"] = llm_config.model

        # Save immediately
        fname = f"config_{config.lower()}_brief{brief.id}_run{run_idx}.json"
        out_path = ENTERPRISE_RESULTS_DIR / fname
        # Save without full trace_events to keep files readable
        save_result = {k: v for k, v in result.items() if k != "trace_events"}
        out_path.write_text(json.dumps(save_result, indent=2))

        report_len = len(result.get("report", ""))
        sm = result.get("structural_metrics", {})
        print(f"  Report length: {report_len} chars")
        print(f"  Elapsed: {result['elapsed_seconds']:.1f}s")
        print(f"  Review loops: {sm.get('review_loops', 0)} | Escalations: {sm.get('escalations', 0)} | Revisions: {sm.get('revisions', 0)}")
        print(f"  Saved to {out_path}")

        results.append(result)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run enterprise benchmark")
    parser.add_argument("--config", required=True, choices=["A", "B", "C", "all"])
    parser.add_argument("--brief-ids", nargs="+", type=int, default=None,
                        help="Specific brief IDs to run (default: all 10)")
    parser.add_argument("--run-idx", type=int, default=0)
    args = parser.parse_args()

    configs = ["A", "B", "C"] if args.config == "all" else [args.config]
    for cfg in configs:
        run_config_on_briefs(cfg, brief_ids=args.brief_ids, run_idx=args.run_idx)
