"""
Tests for the Evolvian Tool System.

Run with: pytest tests/test_tools.py -v
"""

import pytest
import asyncio
from core.tools import (
    EvolvianTool,
    ToolResult,
    ToolParameter,
    ToolRegistry,
    get_tool_registry,
    ToolExecutor,
)
from core.tools.adapters import (
    WebSearchTool,
    WebScrapeTool,
    CodeExecutorTool,
    FileReaderTool,
)
from core.runtime.context import ExecutionContext


class TestToolBase:
    """Test the base EvolvianTool class."""

    def test_tool_parameter_schema(self):
        param = ToolParameter(
            name="query",
            type="string",
            description="Search query",
            required=True,
        )
        schema = param.to_json_schema()

        assert schema["type"] == "string"
        assert schema["description"] == "Search query"

    def test_tool_parameter_with_enum(self):
        param = ToolParameter(
            name="format",
            type="string",
            description="Output format",
            enum=["json", "text", "html"],
        )
        schema = param.to_json_schema()

        assert schema["enum"] == ["json", "text", "html"]

    def test_tool_result_to_string(self):
        result = ToolResult(success=True, output={"data": "test"})
        assert "test" in result.to_string()

        error_result = ToolResult(success=False, error="Something went wrong")
        assert "Error" in error_result.to_string()


class TestToolRegistry:
    """Test the ToolRegistry."""

    def test_register_tool(self):
        registry = ToolRegistry()
        registry.register(WebSearchTool)

        assert registry.has_tool("web_search")
        assert "web_search" in registry.list_tools()

    def test_get_tool(self):
        registry = ToolRegistry()
        registry.register(WebSearchTool)

        tool = registry.get_tool("web_search")
        assert tool is not None
        assert tool.name == "web_search"

    def test_get_tool_by_catalog_id(self):
        registry = ToolRegistry()
        registry.register(WebSearchTool)

        tool = registry.get_tool_by_id("tool-websearch")
        assert tool is not None
        assert tool.name == "web_search"

    def test_global_registry(self):
        registry = get_tool_registry()

        # Should have built-in tools
        assert registry.has_tool("web_search")
        assert registry.has_tool("web_scrape")
        assert registry.has_tool("code_executor")

    def test_get_tools_for_agent(self):
        registry = get_tool_registry()

        installed_tools = [
            {"tool_id": "tool-websearch", "configuration": {}, "assigned_agent_ids": []},
            {"tool_id": "tool-browser", "configuration": {}, "assigned_agent_ids": [1, 2]},
        ]

        # Agent 1 should have access to both tools
        tools = registry.get_tools_for_agent(1, installed_tools)
        assert len(tools) == 2

        # Agent 3 should only have access to websearch (browser is assigned to 1,2 only)
        tools = registry.get_tools_for_agent(3, installed_tools)
        assert len(tools) == 1


class TestWebSearchTool:
    """Test the WebSearchTool."""

    def test_tool_schema(self):
        tool = WebSearchTool()
        schema = tool.get_schema()

        assert schema["type"] == "function"
        assert schema["function"]["name"] == "web_search"
        assert "query" in schema["function"]["parameters"]["properties"]

    def test_validate_params(self):
        tool = WebSearchTool()

        # Valid params
        valid, error = tool.validate_params({"query": "test"})
        assert valid
        assert error is None

        # Missing required param
        valid, error = tool.validate_params({})
        assert not valid
        assert "query" in error

    @pytest.mark.asyncio
    async def test_execute_search(self):
        """Test actual web search (requires network)."""
        tool = WebSearchTool()

        result = await tool.safe_execute(
            {"query": "python programming", "num_results": 3},
            {}
        )

        # Even if search fails due to network, should return a result
        assert isinstance(result, ToolResult)
        if result.success:
            assert "results" in result.output


class TestCodeExecutorTool:
    """Test the CodeExecutorTool."""

    @pytest.mark.asyncio
    async def test_simple_calculation(self):
        tool = CodeExecutorTool()

        result = await tool.safe_execute(
            {"code": "x = 2 + 2\nprint(x)"},
            {}
        )

        assert result.success
        assert "4" in result.output["stdout"]
        assert result.output["variables"]["x"] == 4

    @pytest.mark.asyncio
    async def test_blocked_import(self):
        tool = CodeExecutorTool()

        result = await tool.safe_execute(
            {"code": "import os"},
            {}
        )

        assert not result.success
        assert "not allowed" in result.error

    @pytest.mark.asyncio
    async def test_allowed_import(self):
        tool = CodeExecutorTool()

        result = await tool.safe_execute(
            {"code": "import math\nresult = math.sqrt(16)\nprint(result)"},
            {}
        )

        assert result.success
        assert "4" in result.output["stdout"]

    @pytest.mark.asyncio
    async def test_blocked_dangerous_code(self):
        tool = CodeExecutorTool()

        # Try to access __builtins__
        result = await tool.safe_execute(
            {"code": "x = ().__class__.__bases__[0]"},
            {}
        )

        assert not result.success
        assert "not allowed" in result.error

    @pytest.mark.asyncio
    async def test_syntax_error(self):
        tool = CodeExecutorTool()

        result = await tool.safe_execute(
            {"code": "def broken("},
            {}
        )

        assert not result.success
        assert "Syntax error" in result.error


class TestToolExecutor:
    """Test the ToolExecutor."""

    @pytest.mark.asyncio
    async def test_execute_tool(self):
        context = ExecutionContext(operation_id=1, team_id=1)

        installed_tools = [
            {"tool_id": "tool-code-executor", "configuration": {}},
        ]

        executor = ToolExecutor(context, installed_tools)

        result = await executor.execute(
            "code_executor",
            {"code": "result = 42"},
            agent_name="test_agent"
        )

        assert result.success

        # Check that execution was recorded in context
        assert len(context.tool_states) == 1
        assert context.tool_states[0].tool_name == "code_executor"
        assert context.tool_states[0].success

    @pytest.mark.asyncio
    async def test_execute_unknown_tool(self):
        context = ExecutionContext(operation_id=1, team_id=1)
        executor = ToolExecutor(context, [])

        result = await executor.execute("unknown_tool", {})

        assert not result.success
        assert "not found" in result.error

    def test_get_available_tools(self):
        context = ExecutionContext(operation_id=1, team_id=1)

        installed_tools = [
            {"tool_id": "tool-websearch", "configuration": {}},
            {"tool_id": "tool-code-executor", "configuration": {}},
        ]

        executor = ToolExecutor(context, installed_tools)
        tools = executor.get_available_tools()

        assert len(tools) == 2

    def test_get_tool_schemas(self):
        context = ExecutionContext(operation_id=1, team_id=1)

        installed_tools = [
            {"tool_id": "tool-websearch", "configuration": {}},
        ]

        executor = ToolExecutor(context, installed_tools)
        schemas = executor.get_tool_schemas()

        assert len(schemas) == 1
        assert schemas[0]["function"]["name"] == "web_search"


class TestToolCallParsing:
    """Test parsing tool calls from agent responses."""

    def test_parse_json_tool_calls(self):
        from core.tools.executor import parse_tool_calls_from_response

        response = '''
        I'll search for that information.

        ```json
        {"tool_calls": [{"name": "web_search", "arguments": {"query": "python async"}}]}
        ```
        '''

        calls = parse_tool_calls_from_response(response)
        assert len(calls) == 1
        assert calls[0]["name"] == "web_search"

    def test_parse_xml_tool_calls(self):
        from core.tools.executor import parse_tool_calls_from_response

        response = '''
        Let me search for that.

        <tool_call>
        {"name": "web_search", "arguments": {"query": "test"}}
        </tool_call>
        '''

        calls = parse_tool_calls_from_response(response)
        assert len(calls) == 1

    def test_parse_function_style_calls(self):
        from core.tools.executor import parse_tool_calls_from_response

        response = '''
        I'll execute: web_search(query="python tutorials")
        '''

        calls = parse_tool_calls_from_response(response)
        assert len(calls) == 1
        assert calls[0]["arguments"]["query"] == "python tutorials"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
