"""
Web Scrape Tool - Extract content from web pages.

Uses aiohttp to fetch pages and extracts text content.
"""

import aiohttp
import re
from typing import Optional
from ..base import EvolvianTool, ToolResult, ToolParameter


class WebScrapeTool(EvolvianTool):
    """Browse and extract content from web pages."""

    name = "web_scrape"
    description = "Fetch a web page and extract its text content. Useful for reading articles, documentation, or any web content."
    category = "research"
    cost_per_call = 0.02

    parameters = [
        ToolParameter(
            name="url",
            type="string",
            description="The URL to fetch",
            required=True,
        ),
        ToolParameter(
            name="extract",
            type="string",
            description="What to extract: 'text' (main content), 'all' (full page), 'links' (all links)",
            required=False,
            default="text",
            enum=["text", "all", "links"],
        ),
        ToolParameter(
            name="max_length",
            type="number",
            description="Maximum content length to return (characters)",
            required=False,
            default=5000,
        ),
    ]

    async def execute(self, params: dict, config: dict) -> ToolResult:
        url = params["url"]
        extract = params.get("extract", "text")
        max_length = params.get("max_length", 5000)

        # Validate URL
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        try:
            content = await self._fetch_page(url, extract, max_length)

            return ToolResult(
                success=True,
                output={
                    "url": url,
                    "extract_type": extract,
                    "content": content,
                    "length": len(content) if isinstance(content, str) else len(str(content)),
                },
            )

        except aiohttp.ClientError as e:
            return ToolResult(
                success=False,
                error=f"Failed to fetch URL: {str(e)}",
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error processing page: {str(e)}",
            )

    async def _fetch_page(
        self,
        url: str,
        extract: str,
        max_length: int,
    ) -> str | list:
        """Fetch and process a web page."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=15),
                allow_redirects=True,
            ) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {response.reason}")

                html = await response.text()

                if extract == "links":
                    return self._extract_links(html, url)
                elif extract == "all":
                    return self._html_to_text(html)[:max_length]
                else:  # text
                    return self._extract_main_content(html)[:max_length]

    def _html_to_text(self, html: str) -> str:
        """Convert HTML to plain text."""
        # Remove script and style elements
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

        # Remove HTML comments
        html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)

        # Replace common block elements with newlines
        html = re.sub(r'<(br|p|div|h[1-6]|li|tr)[^>]*>', '\n', html, flags=re.IGNORECASE)

        # Remove all other HTML tags
        html = re.sub(r'<[^>]+>', '', html)

        # Decode common HTML entities
        html = html.replace('&nbsp;', ' ')
        html = html.replace('&amp;', '&')
        html = html.replace('&lt;', '<')
        html = html.replace('&gt;', '>')
        html = html.replace('&quot;', '"')
        html = html.replace('&#39;', "'")

        # Collapse whitespace
        html = re.sub(r'\s+', ' ', html)
        html = re.sub(r'\n\s*\n', '\n\n', html)

        return html.strip()

    def _extract_main_content(self, html: str) -> str:
        """
        Extract the main content from HTML, filtering out navigation, ads, etc.
        """
        # Try to find main content areas
        main_patterns = [
            r'<main[^>]*>(.*?)</main>',
            r'<article[^>]*>(.*?)</article>',
            r'<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)</div>',
            r'<div[^>]*id="[^"]*content[^"]*"[^>]*>(.*?)</div>',
            r'<div[^>]*class="[^"]*post[^"]*"[^>]*>(.*?)</div>',
            r'<div[^>]*class="[^"]*article[^"]*"[^>]*>(.*?)</div>',
        ]

        for pattern in main_patterns:
            match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
            if match:
                content = match.group(1)
                text = self._html_to_text(content)
                if len(text) > 200:  # Only use if substantial content
                    return text

        # Fallback to full page text
        return self._html_to_text(html)

    def _extract_links(self, html: str, base_url: str) -> list:
        """Extract all links from HTML."""
        from urllib.parse import urljoin

        links = []
        pattern = r'<a[^>]*href="([^"]*)"[^>]*>([^<]*)</a>'

        for match in re.finditer(pattern, html, re.IGNORECASE):
            href = match.group(1)
            text = match.group(2).strip()

            # Skip empty or anchor-only links
            if not href or href.startswith('#') or href.startswith('javascript:'):
                continue

            # Make absolute URL
            absolute_url = urljoin(base_url, href)

            links.append({
                "url": absolute_url,
                "text": text[:100] if text else "",
            })

        # Deduplicate by URL
        seen = set()
        unique_links = []
        for link in links:
            if link["url"] not in seen:
                seen.add(link["url"])
                unique_links.append(link)

        return unique_links[:50]  # Limit to 50 links
