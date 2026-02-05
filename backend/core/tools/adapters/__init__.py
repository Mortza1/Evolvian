"""
Tool Adapters - Implementations of specific tools.

Each adapter implements the EvolvianTool interface for a specific capability.
"""

from .web_search import WebSearchTool
from .web_scrape import WebScrapeTool
from .code_executor import CodeExecutorTool
from .file_reader import FileReaderTool

__all__ = [
    "WebSearchTool",
    "WebScrapeTool",
    "CodeExecutorTool",
    "FileReaderTool",
]
