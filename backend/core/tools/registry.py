"""
ToolRegistry - Manages available tools and their instances.

The registry:
1. Stores all available tool classes (the "catalog")
2. Creates tool instances for teams based on InstalledTool records
3. Provides tools to agents during execution
"""

from typing import Dict, List, Optional, Type
from .base import EvolvianTool


class ToolRegistry:
    """
    Central registry for all Evolvian tools.

    Usage:
        registry = ToolRegistry()

        # Register a tool class
        registry.register(WebSearchTool)

        # Get a tool instance with config
        tool = registry.get_tool("web_search", config={"api_key": "..."})

        # Get all tools available to an agent
        tools = registry.get_tools_for_agent(agent_id, installed_tools)
    """

    def __init__(self):
        # Map of tool_id -> tool class
        self._tools: Dict[str, Type[EvolvianTool]] = {}

    def register(self, tool_class: Type[EvolvianTool]) -> None:
        """Register a tool class."""
        # Create temporary instance to get name
        instance = tool_class()
        self._tools[instance.name] = tool_class

    def register_many(self, tool_classes: List[Type[EvolvianTool]]) -> None:
        """Register multiple tool classes."""
        for tool_class in tool_classes:
            self.register(tool_class)

    def get_tool(self, tool_name: str) -> Optional[EvolvianTool]:
        """Get a tool instance by name."""
        tool_class = self._tools.get(tool_name)
        if tool_class:
            return tool_class()
        return None

    def get_tool_by_id(self, tool_id: str) -> Optional[EvolvianTool]:
        """
        Get a tool by its catalog ID (e.g., "tool-websearch").
        Maps catalog IDs to internal tool names.
        """
        # Map catalog IDs to tool names
        id_to_name = {
            "tool-websearch": "web_search",
            "tool-browser": "web_scrape",
            "tool-code-executor": "code_executor",
            "tool-file-manager": "file_manager",
            "tool-email": "email_sender",
            "tool-slack": "slack_sender",
            "tool-image-gen": "image_generator",
            "tool-database": "database_query",
        }

        tool_name = id_to_name.get(tool_id)
        if tool_name:
            return self.get_tool(tool_name)
        return None

    def has_tool(self, tool_name: str) -> bool:
        """Check if a tool is registered."""
        return tool_name in self._tools

    def list_tools(self) -> List[str]:
        """List all registered tool names."""
        return list(self._tools.keys())

    def get_all_tools(self) -> List[EvolvianTool]:
        """Get instances of all registered tools."""
        return [tool_class() for tool_class in self._tools.values()]

    def get_tools_for_agent(
        self,
        agent_id: int,
        installed_tools: List[dict],
    ) -> List[tuple[EvolvianTool, dict]]:
        """
        Get all tools available to a specific agent.

        Args:
            agent_id: The agent's ID
            installed_tools: List of InstalledTool records (as dicts)

        Returns:
            List of (tool_instance, config) tuples
        """
        available = []

        for installed in installed_tools:
            # Check if this tool is assigned to the agent
            assigned_agents = installed.get("assigned_agent_ids", [])

            # If no agents assigned, tool is available to all
            # If agents are assigned, check if this agent is in the list
            if not assigned_agents or agent_id in assigned_agents:
                tool_id = installed.get("tool_id")
                tool = self.get_tool_by_id(tool_id)

                if tool:
                    config = installed.get("configuration", {})
                    available.append((tool, config))

        return available

    def get_schemas_for_agent(
        self,
        agent_id: int,
        installed_tools: List[dict],
    ) -> List[dict]:
        """
        Get tool schemas in OpenAI function format for an agent.
        This is what gets sent to the LLM.
        """
        tools = self.get_tools_for_agent(agent_id, installed_tools)
        return [tool.get_schema() for tool, _ in tools]


# Global registry instance
_global_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get the global tool registry, creating it if needed."""
    global _global_registry

    if _global_registry is None:
        _global_registry = ToolRegistry()
        _register_builtin_tools(_global_registry)

    return _global_registry


def _register_builtin_tools(registry: ToolRegistry) -> None:
    """Register all built-in tools."""
    # Import here to avoid circular imports
    from .adapters.web_search import WebSearchTool
    from .adapters.web_scrape import WebScrapeTool
    from .adapters.code_executor import CodeExecutorTool
    from .adapters.file_reader import FileReaderTool

    registry.register_many([
        WebSearchTool,
        WebScrapeTool,
        CodeExecutorTool,
        FileReaderTool,
    ])
