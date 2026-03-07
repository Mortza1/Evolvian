"""
LLM-as-judge scoring for the enterprise Research-to-Report benchmark.

Applies two scoring passes to each saved report:
  1. Quality scoring (5 criteria, 0-10 each, weighted average)
  2. Brief alignment (which specific questions are answered)

Scores all saved results in enterprise/results/ or a specific file.

Usage:
    python -m dissertation.evaluation.enterprise_judge --results-dir results/enterprise
    python -m dissertation.evaluation.enterprise_judge --file results/enterprise/config_a_brief1_run0.json
    python -m dissertation.evaluation.enterprise_judge --summary          # print comparison table
"""
import sys
import re
import json
import time
import argparse
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.models.openrouter_model import OpenRouterLLM
from dissertation.config import get_llm_config, RESULTS_DIR
from dissertation.benchmarks.enterprise_briefs import get_brief

ENTERPRISE_RESULTS_DIR = RESULTS_DIR / "enterprise"

# Use a slightly higher temperature for the judge to avoid degenerate scoring
JUDGE_LLM_CONFIG = None  # lazy init

QUALITY_WEIGHTS = {
    "completeness": 0.25,
    "analytical_depth": 0.25,
    "accuracy": 0.20,
    "coherence": 0.15,
    "actionability": 0.15,
}

# Judge prompts

QUALITY_JUDGE_SYSTEM = """\
You are an expert business report evaluator. You will receive an original research brief \
and a report produced in response to that brief. Score the report on each criterion below \
from 0-10. A score of 5 means average/acceptable, 7 means good, 9+ means exceptional. \
Be strict and consistent. For each criterion, output the numerical score and a ONE-SENTENCE \
justification.

Criteria:
1. COMPLETENESS (25%): Does the report include ALL sections specified in the brief? \
Are ALL specific questions from the brief answered?
2. ANALYTICAL_DEPTH (25%): Does the report go beyond surface-level description? \
Are claims supported with evidence, data, or reasoning?
3. ACCURACY (20%): Are facts consistent? Are conclusions logically supported by the \
analysis? Are there contradictions?
4. COHERENCE (15%): Does the report flow logically from section to section? \
Does the executive summary accurately reflect the body?
5. ACTIONABILITY (15%): Could a decision-maker act on this report? \
Is the recommendation clear and justified?

Output format (exactly):
COMPLETENESS: [score]/10 - [justification]
ANALYTICAL_DEPTH: [score]/10 - [justification]
ACCURACY: [score]/10 - [justification]
COHERENCE: [score]/10 - [justification]
ACTIONABILITY: [score]/10 - [justification]
OVERALL: [weighted average]/10"""

QUALITY_JUDGE_USER = """\
ORIGINAL BRIEF:
{brief}

REPORT TO EVALUATE:
{report}"""

ALIGNMENT_JUDGE_SYSTEM = """\
You will receive a research brief and a report. The brief contains specific questions \
that must be answered. For each question, assess whether the report answers it.

Output format — one line per question:
[question text] — ANSWERED / PARTIALLY / MISSING

Then on the final line:
ALIGNMENT_SCORE: [count of ANSWERED] / [total questions]"""

ALIGNMENT_JUDGE_USER = """\
BRIEF QUESTIONS TO CHECK:
{questions}

REPORT:
{report}"""


# Scoring logic

def _get_judge_llm():
    global JUDGE_LLM_CONFIG
    if JUDGE_LLM_CONFIG is None:
        JUDGE_LLM_CONFIG = get_llm_config(temperature=0.1, max_tokens=512)
    return OpenRouterLLM(config=JUDGE_LLM_CONFIG)


def score_quality(brief_text: str, report: str, llm=None) -> dict:
    """
    Run the quality judge. Returns dict with per-criterion scores and overall.
    """
    if llm is None:
        llm = _get_judge_llm()

    prompt = (
        QUALITY_JUDGE_SYSTEM + "\n\n"
        + QUALITY_JUDGE_USER.format(brief=brief_text[:3000], report=report[:4000])
    )

    try:
        time.sleep(1.0)
        response = llm.generate(prompt)
        text = str(response).strip()
        return _parse_quality_scores(text)
    except Exception as e:
        return {"error": str(e), "overall": 0.0}


def score_alignment(brief_questions: list, report: str, llm=None) -> dict:
    """
    Run the brief alignment checker. Returns counts and per-question results.
    """
    if llm is None:
        llm = _get_judge_llm()

    questions_text = "\n".join(f"{i+1}. {q}" for i, q in enumerate(brief_questions))
    prompt = (
        ALIGNMENT_JUDGE_SYSTEM + "\n\n"
        + ALIGNMENT_JUDGE_USER.format(questions=questions_text, report=report[:4000])
    )

    try:
        time.sleep(1.0)
        response = llm.generate(prompt)
        text = str(response).strip()
        return _parse_alignment(text, len(brief_questions))
    except Exception as e:
        return {"error": str(e), "alignment_score": 0.0, "answered": 0, "total": len(brief_questions)}


def _parse_quality_scores(text: str) -> dict:
    """Parse the judge's quality score output."""
    scores = {}
    criteria = ["completeness", "analytical_depth", "accuracy", "coherence", "actionability"]

    for criterion in criteria:
        pattern = rf"{criterion.upper()}[:\s]+(\d+(?:\.\d+)?)\s*/\s*10"
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            scores[criterion] = float(m.group(1))
        else:
            scores[criterion] = 5.0  # default if parsing fails

    # Compute weighted overall
    overall = sum(scores.get(c, 5.0) * w for c, w in QUALITY_WEIGHTS.items())
    scores["overall"] = round(overall, 2)
    scores["raw_judge_output"] = text
    return scores


def _parse_alignment(text: str, total_questions: int) -> dict:
    """Parse the alignment checker output."""
    answered = len(re.findall(r'—\s*ANSWERED', text, re.IGNORECASE))
    partial = len(re.findall(r'—\s*PARTIALLY', text, re.IGNORECASE))
    missing = len(re.findall(r'—\s*MISSING', text, re.IGNORECASE))

    # Try to parse ALIGNMENT_SCORE line directly
    m = re.search(r'ALIGNMENT_SCORE[:\s]+(\d+)\s*/\s*(\d+)', text, re.IGNORECASE)
    if m:
        answered = int(m.group(1))
        total_questions = int(m.group(2))

    score = answered / total_questions if total_questions > 0 else 0.0
    return {
        "answered": answered,
        "partially": partial,
        "missing": missing,
        "total": total_questions,
        "alignment_score": round(score, 3),
        "raw_judge_output": text,
    }


# Score a single result file

def score_result_file(result_path: Path, llm=None) -> dict:
    """Load a saved result JSON, score it, save scores back."""
    data = json.loads(result_path.read_text())

    if "scores" in data:
        print(f"  Already scored: {result_path.name}")
        return data

    brief_id = data.get("brief_id")
    report = data.get("report", "")

    if not report or report.startswith("[ERROR"):
        print(f"  Skipping {result_path.name} — no valid report")
        data["scores"] = {"error": "no report", "overall": 0.0, "alignment_score": 0.0}
        result_path.write_text(json.dumps(data, indent=2))
        return data

    brief = get_brief(brief_id)
    brief_text = brief.as_prompt_text()

    print(f"  Scoring Brief {brief_id}: {brief.title[:50]}...")

    quality = score_quality(brief_text, report, llm)
    alignment = score_alignment(brief.specific_questions, report, llm)

    data["scores"] = {
        "quality": quality,
        "alignment": alignment,
        "overall": quality.get("overall", 0.0),
        "alignment_score": alignment.get("alignment_score", 0.0),
    }

    result_path.write_text(json.dumps(data, indent=2))
    print(f"    Overall: {quality.get('overall', 0):.1f}/10 | Alignment: {alignment.get('alignment_score', 0):.0%}")
    return data


# Score all results + print summary table

def score_all(results_dir: Path = ENTERPRISE_RESULTS_DIR):
    llm = _get_judge_llm()
    result_files = sorted(results_dir.glob("config_*_brief*_run*.json"))

    if not result_files:
        print(f"No result files found in {results_dir}")
        return

    print(f"\nScoring {len(result_files)} result files...\n")
    for f in result_files:
        print(f"  {f.name}")
        score_result_file(f, llm)


def print_summary(results_dir: Path = ENTERPRISE_RESULTS_DIR):
    """Print a comparison table across configs and briefs."""
    from collections import defaultdict

    data = defaultdict(list)
    for f in sorted(results_dir.glob("config_*_brief*_run*.json")):
        result = json.loads(f.read_text())
        config = result.get("config", "?")
        if "scores" not in result:
            continue
        scores = result["scores"]
        quality = scores.get("quality", {})
        data[config].append({
            "brief_id": result.get("brief_id"),
            "overall": quality.get("overall", 0),
            "completeness": quality.get("completeness", 0),
            "analytical_depth": quality.get("analytical_depth", 0),
            "accuracy": quality.get("accuracy", 0),
            "coherence": quality.get("coherence", 0),
            "actionability": quality.get("actionability", 0),
            "alignment": scores.get("alignment_score", 0),
            "review_loops": result.get("structural_metrics", {}).get("review_loops", 0),
            "escalations": result.get("structural_metrics", {}).get("escalations", 0),
        })

    if not data:
        print("No scored results found. Run score_all() first.")
        return

    print("\n" + "="*80)
    print("ENTERPRISE BENCHMARK RESULTS SUMMARY")
    print("="*80)

    criteria = ["overall", "completeness", "analytical_depth", "accuracy", "coherence", "actionability"]
    header = f"{'Config':<8}" + "".join(f"{c[:10]:>12}" for c in criteria) + f"{'Alignment':>12}"
    print(header)
    print("-"*80)

    for config in ["A", "B", "C", "D"]:
        if config not in data:
            continue
        rows = data[config]
        avgs = {}
        for c in criteria:
            vals = [r[c] for r in rows if r.get(c) is not None]
            avgs[c] = sum(vals) / len(vals) if vals else 0
        align_vals = [r["alignment"] for r in rows]
        avg_align = sum(align_vals) / len(align_vals) if align_vals else 0

        row = f"{f'Config {config}':<8}" + "".join(f"{avgs[c]:>12.2f}" for c in criteria) + f"{avg_align:>12.1%}"
        print(row)

    print("\nStructural Metrics (Config C only):")
    if "C" in data:
        total_reviews = sum(r["review_loops"] for r in data["C"])
        total_escalations = sum(r["escalations"] for r in data["C"])
        n = len(data["C"])
        print(f"  Avg review loops per brief: {total_reviews/n:.1f}")
        print(f"  Avg escalations per brief:  {total_escalations/n:.1f}")
        print(f"  Total briefs run: {n}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=Path, default=None)
    parser.add_argument("--results-dir", type=Path, default=ENTERPRISE_RESULTS_DIR)
    parser.add_argument("--summary", action="store_true")
    args = parser.parse_args()

    if args.summary:
        print_summary(args.results_dir)
    elif args.file:
        score_result_file(args.file)
    else:
        score_all(args.results_dir)
