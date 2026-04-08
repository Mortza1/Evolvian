"""
Smoke tests — verify LLM API and web search are working.

Run:
  PYTHONPATH=backend:evoAgentX evoAgentX/venv/bin/python -m pytest \
    backend/dissertation/tests/test_smoke.py -v -s
"""
import sys, asyncio
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

import re
from dissertation.config import get_llm_config
from evoagentx.models.openrouter_model import OpenRouterLLM
from core.tools.adapters.web_search import WebSearchTool
from core.tools.executor import parse_tool_calls_from_response


def get_llm():
    return OpenRouterLLM(config=get_llm_config(max_tokens=1024))


def _build_tool_prompt(tool):
    """Build the <tool_call> usage block for a single tool."""
    param_lines = []
    for p in tool.parameters:
        req = " (required)" if p.required else " (optional)"
        param_lines.append(f'    "{p.name}": "<{p.description}>{req}"')
    params = ",\n".join(param_lines)
    return (
        f"### {tool.name}\n{tool.description}\n\n"
        f"Call it like this:\n"
        f'<tool_call>\n{{"name": "{tool.name}", "arguments": {{\n{params}\n}}}}\n</tool_call>'
    )


def _clean(text):
    text = re.sub(r'<tool_call>.*?</tool_call>', '', text, flags=re.DOTALL)
    text = re.sub(r'(?:^|\n)CRITICAL:.*', '', text, flags=re.IGNORECASE | re.DOTALL)
    return text.strip()


def test_llm_api():
    """LLM API responds to a simple prompt."""
    llm = get_llm()
    response = str(llm.generate("Say hello in one word."))
    print(f"\n[LLM] → {response!r}")
    assert len(response) > 0


def test_web_search():
    """Web search returns at least one result with a URL."""
    tool = WebSearchTool()
    result = asyncio.get_event_loop().run_until_complete(
        tool.safe_execute({"query": "Scottish SME lending market"}, {})
    )
    print(f"\n[WebSearch] success={result.success}")
    assert result.success, result.error
    results = result.output.get("results", [])
    assert len(results) > 0, "No results returned"
    for r in results[:3]:
        print(f"  {r.get('title')} — {r.get('url')}")


def test_llm_uses_search_result():
    """LLM can summarise a real search result."""
    tool = WebSearchTool()
    search = asyncio.get_event_loop().run_until_complete(
        tool.safe_execute({"query": "Scottish SME lending key players 2024"}, {})
    )
    assert search.success
    snippet = str(search.output)[:1500]

    llm = get_llm()
    prompt = (
        f"Using only the information below, name 2 lenders active in Scottish SME lending.\n\n"
        f"SEARCH RESULTS:\n{snippet}\n\nAnswer:"
    )
    response = str(llm.generate(prompt))
    print(f"\n[LLM+Search] → {response!r}")
    assert len(response) > 20


def test_investigator_agent_with_web_search():
    """
    Investigator agent runs its full tool loop:
      1. Gets a research subtask
      2. Calls web_search with a real query
      3. Reads the results
      4. Writes a grounded answer citing sources
    """
    llm = get_llm()
    tool = WebSearchTool()
    tools = [(tool, {})]

    tools_section = _build_tool_prompt(tool)

    subtask = "Find the top SME lenders in Scotland and their approximate market share."
    original_task = "Research the Scottish SME lending market for a fintech startup."

    prompt = (
        f"You are Investigator: a market research specialist.\n\n"
        f"ORIGINAL QUESTION:\n{original_task}\n\n"
        f"YOUR SUBTASK:\n{subtask}\n\n"
        f"{tools_section}\n"
        f"IMPORTANT: You MUST use web_search before answering. "
        f"Do NOT rely on memory. Search, read the results, then write your answer with source URLs."
    )

    state = {"conversation": prompt, "final_output": "", "searches": []}
    MAX_TURNS = 4

    async def run_agent():
        import functools
        loop = asyncio.get_event_loop()

        for turn in range(MAX_TURNS):
            response = await loop.run_in_executor(
                None, functools.partial(llm.generate, state["conversation"])
            )
            response = str(response)
            print(f"\n--- Turn {turn + 1} ---")
            print(f"LLM response ({len(response)} chars):\n{response[:500]}")

            tool_calls = parse_tool_calls_from_response(response)

            if not tool_calls:
                if turn == 0:
                    print("  [nudge] No tool call on turn 1 — nudging...")
                    state["conversation"] += (
                        f"\n\n{response}\n\n"
                        "You haven't searched yet. Call web_search now with a <tool_call> block."
                    )
                    continue
                state["final_output"] = response
                break

            for tc in tool_calls:
                if tc.get("name") == "web_search":
                    query = tc.get("arguments", {}).get("query", "")
                    state["searches"].append(query)
                    print(f"  [web_search] query: {query!r}")
                    result = await tool.safe_execute(tc.get("arguments", {}), {})
                    snippet = str(result.output)[:3000]
                    print(f"  [web_search] got {len(snippet)} chars of results")
                    state["conversation"] += (
                        f"\n\n{response}\n\n"
                        f"[web_search result]:\n{snippet}\n\n"
                        "Now write your final answer based on the search results. Include source URLs."
                    )
        else:
            state["final_output"] = response

        state["final_output"] = _clean(state["final_output"])

    asyncio.get_event_loop().run_until_complete(run_agent())

    print(f"\n{'='*60}")
    print(f"SEARCHES MADE: {state['searches']}")
    print(f"FINAL OUTPUT ({len(state['final_output'])} chars):")
    print(state["final_output"])
    print('='*60)

    assert len(state["searches"]) >= 1, "Investigator never called web_search"
    assert len(state["final_output"]) > 100, "Final output too short"
