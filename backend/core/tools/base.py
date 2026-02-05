"""
EvolvianTool - Base class for all executable tools.

Tools are capabilities that agents can use to interact with the outside world.
Each tool has a defined interface (parameters, returns) and an execute method.

Tools are:
- Stateless (all state goes through ExecutionContext)
- Trackable (execution is logged in ToolState)
- Costable (each execution can have an associated cost)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import json


@dataclass
class ToolParameter:
    """Definition of a tool parameter."""
    name: str
    type: str  # "string", "number", "boolean", "array", "object"
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[List[Any]] = None  # Allowed values

    def to_json_schema(self) -> dict:
        """Convert to JSON Schema format for LLM function calling."""
        schema = {
            "type": self.type,
            "description": self.description,
        }
        if self.enum:
            schema["enum"] = self.enum
        if self.default is not None:
            schema["default"] = self.default
        return schema


@dataclass
class ToolResult:
    """Result of a tool execution."""
    success: bool
    output: Any = None
    error: Optional[str] = None
    cost: float = 0.0
    latency_ms: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "output": self.output,
            "error": self.error,
            "cost": self.cost,
            "latency_ms": self.latency_ms,
            "metadata": self.metadata,
        }

    def to_string(self) -> str:
        """Convert result to string for agent consumption."""
        if self.success:
            if isinstance(self.output, str):
                return self.output
            return json.dumps(self.output, indent=2)
        return f"Error: {self.error}"


class EvolvianTool(ABC):
    """
    Base class for all Evolvian tools.

    To create a new tool:
    1. Subclass EvolvianTool
    2. Set name, description, and parameters
    3. Implement the execute() method

    Example:
        class WebSearchTool(EvolvianTool):
            name = "web_search"
            description = "Search the web for information"
            parameters = [
                ToolParameter("query", "string", "The search query"),
                ToolParameter("num_results", "number", "Number of results", required=False, default=5),
            ]

            async def execute(self, params: dict, config: dict) -> ToolResult:
                query = params["query"]
                # ... do the search ...
                return ToolResult(success=True, output=results)
    """

    # Tool identity - must be set by subclasses
    name: str = ""
    description: str = ""
    category: str = "general"  # research, dev, data, communication, creative

    # Tool interface
    parameters: List[ToolParameter] = []

    # Pricing
    cost_per_call: float = 0.0

    # Configuration requirements (keys that must be in config)
    required_config: List[str] = []

    def __init__(self):
        if not self.name:
            raise ValueError("Tool must have a name")

    def get_schema(self) -> dict:
        """
        Get the tool schema in OpenAI function calling format.
        This is what gets sent to the LLM so it knows how to call the tool.
        """
        properties = {}
        required = []

        for param in self.parameters:
            properties[param.name] = param.to_json_schema()
            if param.required:
                required.append(param.name)

        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                }
            }
        }

    def validate_params(self, params: dict) -> tuple[bool, Optional[str]]:
        """Validate parameters against the schema."""
        for param in self.parameters:
            if param.required and param.name not in params:
                return False, f"Missing required parameter: {param.name}"

            if param.name in params:
                value = params[param.name]
                # Basic type checking
                if param.type == "string" and not isinstance(value, str):
                    return False, f"Parameter {param.name} must be a string"
                if param.type == "number" and not isinstance(value, (int, float)):
                    return False, f"Parameter {param.name} must be a number"
                if param.type == "boolean" and not isinstance(value, bool):
                    return False, f"Parameter {param.name} must be a boolean"
                if param.type == "array" and not isinstance(value, list):
                    return False, f"Parameter {param.name} must be an array"
                if param.type == "object" and not isinstance(value, dict):
                    return False, f"Parameter {param.name} must be an object"

                # Enum validation
                if param.enum and value not in param.enum:
                    return False, f"Parameter {param.name} must be one of: {param.enum}"

        return True, None

    def validate_config(self, config: dict) -> tuple[bool, Optional[str]]:
        """Validate that required configuration is present."""
        for key in self.required_config:
            if key not in config or not config[key]:
                return False, f"Missing required configuration: {key}"
        return True, None

    @abstractmethod
    async def execute(self, params: dict, config: dict) -> ToolResult:
        """
        Execute the tool with the given parameters.

        Args:
            params: The parameters passed by the agent
            config: Configuration for this tool instance (API keys, etc.)

        Returns:
            ToolResult with success status, output, and metadata
        """
        pass

    async def safe_execute(self, params: dict, config: dict) -> ToolResult:
        """
        Execute with validation and error handling.
        This is the method that should be called by ToolExecutor.
        """
        start_time = datetime.now(timezone.utc)

        # Validate config
        valid, error = self.validate_config(config)
        if not valid:
            return ToolResult(success=False, error=error)

        # Validate params
        valid, error = self.validate_params(params)
        if not valid:
            return ToolResult(success=False, error=error)

        # Fill in defaults
        filled_params = {}
        for param in self.parameters:
            if param.name in params:
                filled_params[param.name] = params[param.name]
            elif param.default is not None:
                filled_params[param.name] = param.default

        try:
            result = await self.execute(filled_params, config)
            result.cost = result.cost or self.cost_per_call

            # Calculate latency
            end_time = datetime.now(timezone.utc)
            result.latency_ms = int((end_time - start_time).total_seconds() * 1000)

            return result

        except Exception as e:
            end_time = datetime.now(timezone.utc)
            latency = int((end_time - start_time).total_seconds() * 1000)
            return ToolResult(
                success=False,
                error=str(e),
                latency_ms=latency,
            )

    def __repr__(self) -> str:
        return f"EvolvianTool(name={self.name}, category={self.category})"
