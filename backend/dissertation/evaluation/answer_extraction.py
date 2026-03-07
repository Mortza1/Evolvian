"""
Answer extraction post-processing.

Provides `extract_concise_answer()` which uses a lightweight LLM prompt to
strip verbose reasoning from agent outputs, extracting only the direct answer.

Applied to ALL configs equally (A, B, C, D) so it is not a confound.
For MATH, the existing regex-based \\boxed{} extraction (math_postprocess)
is sufficient, so this is primarily used for HotPotQA.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.models.openrouter_model import OpenRouterLLM
from dissertation.config import get_llm_config


_EXTRACTION_PROMPT = """\
Given the following response to the question below, extract ONLY the direct \
answer in as few words as possible. Return just the answer — no explanation, \
no reasoning, no preamble.

Question: {question}

Response:
{response}

Direct answer (as few words as possible):"""


def extract_concise_answer(
    raw_output: str,
    question: str,
    llm: OpenRouterLLM = None,
) -> str:
    """
    Use a lightweight LLM call to extract a concise answer from verbose output.

    Args:
        raw_output: The raw agent output (potentially verbose).
        question:   The original question (provides context for extraction).
        llm:        An OpenRouterLLM instance. If None, creates one with
                    low max_tokens for cheap extraction.

    Returns:
        A concise answer string.
    """
    if not raw_output or not raw_output.strip():
        return ""

    # If the output is already short (< 50 chars), no extraction needed
    stripped = raw_output.strip()
    if len(stripped) < 50:
        return stripped

    if llm is None:
        config = get_llm_config(temperature=0.0, max_tokens=64)
        llm = OpenRouterLLM(config=config)

    prompt = _EXTRACTION_PROMPT.format(
        question=question,
        response=stripped[:1000],  # cap to avoid excessive tokens
    )

    try:
        response = llm.generate(prompt)
        text = response if isinstance(response, str) else str(response)
        # Take the first non-empty line
        for line in text.strip().splitlines():
            line = line.strip()
            if line:
                return line
        return text.strip()
    except Exception:
        # Fallback: return the first line of the raw output
        lines = [l.strip() for l in stripped.splitlines() if l.strip()]
        return lines[0] if lines else stripped


def make_hotpotqa_fns(llm: OpenRouterLLM = None):
    """
    Return a (collate, postprocess) pair for HotPotQA with answer extraction.

    The collate function records the current question in a shared mutable cell;
    the postprocess function reads it and runs extract_concise_answer on verbose
    outputs before scoring. Apply to ALL configs equally (not a confound).

    Usage::
        collate, postprocess = make_hotpotqa_fns(llm)
        evaluator = Evaluator(..., collate_func=collate,
                              output_postprocess_func=postprocess)
    """
    if llm is None:
        config = get_llm_config(temperature=0.0, max_tokens=64)
        llm = OpenRouterLLM(config=config)

    _current_question: list = [None]  # mutable cell shared between closures

    def collate(example: dict) -> dict:
        paragraphs = [item[1] for item in example.get("context", [])
                      if isinstance(item[1], list)]
        context_str = "\n\n".join(" ".join(p) for p in paragraphs)
        if len(context_str) > 4000:
            context_str = context_str[:4000] + "..."
        _current_question[0] = example.get("question", "")
        return {"question": example["question"], "context": context_str}

    def postprocess(output: str) -> str:
        if not output:
            return ""
        question = _current_question[0] or ""
        return extract_concise_answer(output, question, llm)

    return collate, postprocess
