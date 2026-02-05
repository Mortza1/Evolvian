"""
ToolExecutor - Executes tools and tracks results in ExecutionContext.

The executor:
1. Receives tool call requests from agents
2. Looks up the tool in the registry
3. Executes the tool with proper config
4. Records the result in ExecutionContext
5. Returns the result to the agent
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from .base import EvolvianTool, ToolResult
from .registry import ToolRegistry, get_tool_registry
from ..runtime.context import ExecutionContext, ToolState


class ToolExecutor:
    """
    Executes tools within an ExecutionContext.

    Usage:
        executor = ToolExecutor(context, installed_tools)

        # Execute a tool call from an agent
        result = await executor.execute("web_search", {"query": "python async"})

        # The result is automatically recorded in context.tool_states
    """

    def __init__(
        self,
        context: ExecutionContext,
        installed_tools: List[dict],
        registry: Optional[ToolRegistry] = None,
    ):
        self.context = context
        self.installed_tools = installed_tools
        self.registry = registry or get_tool_registry()

        # Build a map of tool_id -> config for quick lookup
        self._tool_configs: Dict[str, dict] = {}
        for installed in installed_tools:
            tool_id = installed.get("tool_id", "")
            self._tool_configs[tool_id] = installed.get("configuration", {})

            # Also map by internal name
            id_to_name = {
                "tool-websearch": "web_search",
                "tool-browser": "web_scrape",
                "tool-code-executor": "code_executor",
                "tool-file-manager": "file_manager",
            }
            if tool_id in id_to_name:
                self._tool_configs[id_to_name[tool_id]] = installed.get("configuration", {})

    def get_available_tools(self) -> List[EvolvianTool]:
        """Get all tools available in this execution context."""
        tools = []
        for installed in self.installed_tools:
            tool_id = installed.get("tool_id")
            tool = self.registry.get_tool_by_id(tool_id)
            if tool:
                tools.append(tool)
        return tools

    def get_tool_schemas(self) -> List[dict]:
        """Get schemas for all available tools (for LLM function calling)."""
        return [tool.get_schema() for tool in self.get_available_tools()]

    async def execute(
        self,
        tool_name: str,
        params: dict,
        agent_name: Optional[str] = None,
    ) -> ToolResult:
        """
        Execute a tool by name.

        Args:
            tool_name: The tool's internal name (e.g., "web_search")
            params: Parameters to pass to the tool
            agent_name: Name of the agent making the call (for tracking)

        Returns:
            ToolResult with the output or error
        """
        # Get the tool
        tool = self.registry.get_tool(tool_name)
        if not tool:
            result = ToolResult(
                success=False,
                error=f"Tool not found: {tool_name}",
            )
            self._record_execution(tool_name, params, result, agent_name)
            return result

        # Get config for this tool
        config = self._tool_configs.get(tool_name, {})

        # Execute
        result = await tool.safe_execute(params, config)

        # Record in context
        self._record_execution(tool_name, params, result, agent_name)

        return result

    async def execute_function_call(
        self,
        function_call: dict,
        agent_name: Optional[str] = None,
    ) -> ToolResult:
        """
        Execute a function call from LLM response.

        Args:
            function_call: Dict with "name" and "arguments" keys
            agent_name: Name of the agent making the call

        Returns:
            ToolResult
        """
        tool_name = function_call.get("name", "")
        arguments = function_call.get("arguments", {})

        # Arguments might be a JSON string
        if isinstance(arguments, str):
            import json
            try:
                arguments = json.loads(arguments)
            except json.JSONDecodeError:
                return ToolResult(
                    success=False,
                    error=f"Invalid JSON in function arguments: {arguments}",
                )

        return await self.execute(tool_name, arguments, agent_name)

    def _record_execution(
        self,
        tool_name: str,
        params: dict,
        result: ToolResult,
        agent_name: Optional[str] = None,
    ) -> None:
        """Record a tool execution in the context."""
        tool_state = ToolState(
            tool_id=tool_name,
            tool_name=tool_name,
            input_data=params,
            output_data=result.output if result.success else None,
            executed_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=result.latency_ms,
            cost=result.cost,
            success=result.success,
            error=result.error,
        )

        self.context.add_tool_execution(tool_state)

    def get_execution_history(self) -> List[ToolState]:
        """Get all tool executions from this context."""
        return self.context.tool_states


def parse_tool_calls_from_response(response: str) -> List[dict]:
    """
    Parse tool calls from an agent's response.

    Agents can request tool calls in multiple formats:
    1. JSON blocks with tool_calls array
    2. <tool_call> XML-style tags
    3. Function call syntax

    Returns:
        List of dicts with "name" and "arguments" keys
    """
    import json
    import re

    tool_calls = []

    # Try to find JSON tool_calls array
    try:
        # Look for ```json blocks
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(1))
            if "tool_calls" in data:
                tool_calls.extend(data["tool_calls"])
    except (json.JSONDecodeError, AttributeError):
        pass

    # Try to find <tool_call> tags
    tool_call_pattern = r'<tool_call>\s*(\{.*?\})\s*</tool_call>'
    for match in re.finditer(tool_call_pattern, response, re.DOTALL):
        try:
            call = json.loads(match.group(1))
            tool_calls.append(call)
        except json.JSONDecodeError:
            pass

    # Try to find function-style calls: tool_name(arg1="value", arg2="value")
    func_pattern = r'(\w+)\((.*?)\)'
    for match in re.finditer(func_pattern, response):
        name = match.group(1)
        args_str = match.group(2)

        # Only process if it looks like a tool call
        if name in ["web_search", "web_scrape", "code_executor", "file_reader"]:
            # Parse simple key=value args
            args = {}
            for arg_match in re.finditer(r'(\w+)\s*=\s*["\']([^"\']*)["\']', args_str):
                args[arg_match.group(1)] = arg_match.group(2)

            if args:
                tool_calls.append({"name": name, "arguments": args})

    return tool_calls
