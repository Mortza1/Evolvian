"""
Web Search Tool - Search the web using DuckDuckGo.

No API key required. Uses the DuckDuckGo instant answer API.
"""

import aiohttp
from typing import List
from ..base import EvolvianTool, ToolResult, ToolParameter


class WebSearchTool(EvolvianTool):
    """Search the web for information."""

    name = "web_search"
    description = "Search the web for information. Returns relevant search results with titles, URLs, and snippets."
    category = "research"
    cost_per_call = 0.01

    parameters = [
        ToolParameter(
            name="query",
            type="string",
            description="The search query",
            required=True,
        ),
        ToolParameter(
            name="num_results",
            type="number",
            description="Number of results to return (max 10)",
            required=False,
            default=5,
        ),
    ]

    async def execute(self, params: dict, config: dict) -> ToolResult:
        query = params["query"]
        num_results = min(params.get("num_results", 5), 10)

        try:
            results = await self._search_duckduckgo(query, num_results)

            if not results:
                return ToolResult(
                    success=True,
                    output={
                        "query": query,
                        "results": [],
                        "message": "No results found for this query.",
                    },
                )

            return ToolResult(
                success=True,
                output={
                    "query": query,
                    "num_results": len(results),
                    "results": results,
                },
                metadata={"source": "duckduckgo"},
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Search failed: {str(e)}",
            )

    async def _search_duckduckgo(self, query: str, num_results: int) -> List[dict]:
        """
        Search using DuckDuckGo's HTML search.
        Falls back to instant answers API if HTML parsing fails.
        """
        results = []

        # Use DuckDuckGo HTML search
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                data={"q": query},
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status != 200:
                    # Fall back to instant answer API
                    return await self._search_instant_answer(session, query)

                html = await response.text()
                results = self._parse_ddg_html(html, num_results)

        return results

    def _parse_ddg_html(self, html: str, num_results: int) -> List[dict]:
        """Parse DuckDuckGo HTML search results."""
        import re

        results = []

        # Find result blocks
        # DuckDuckGo HTML has results in <a class="result__a"> tags
        result_pattern = r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'
        snippet_pattern = r'<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)</a>'

        links = re.findall(result_pattern, html)
        snippets = re.findall(snippet_pattern, html)

        for i, (url, title) in enumerate(links[:num_results]):
            # Clean up the URL (DuckDuckGo wraps URLs)
            if "uddg=" in url:
                url_match = re.search(r'uddg=([^&]+)', url)
                if url_match:
                    import urllib.parse
                    url = urllib.parse.unquote(url_match.group(1))

            snippet = snippets[i] if i < len(snippets) else ""
            # Clean HTML from snippet
            snippet = re.sub(r'<[^>]+>', '', snippet).strip()

            results.append({
                "title": title.strip(),
                "url": url,
                "snippet": snippet[:300],  # Limit snippet length
            })

        return results

    async def _search_instant_answer(
        self,
        session: aiohttp.ClientSession,
        query: str,
    ) -> List[dict]:
        """Fallback: Use DuckDuckGo instant answer API."""
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1",
        }

        async with session.get(url, params=params) as response:
            if response.status != 200:
                return []

            data = await response.json()

            results = []

            # Abstract (main answer)
            if data.get("Abstract"):
                results.append({
                    "title": data.get("Heading", "Result"),
                    "url": data.get("AbstractURL", ""),
                    "snippet": data.get("Abstract", ""),
                })

            # Related topics
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append({
                        "title": topic.get("Text", "")[:100],
                        "url": topic.get("FirstURL", ""),
                        "snippet": topic.get("Text", ""),
                    })

            return results
