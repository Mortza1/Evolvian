"""
Code Executor Tool - Execute Python code in a restricted environment.

This tool allows agents to run Python code for data processing, calculations,
and other programmatic tasks. It uses a restricted execution environment
with limited builtins and no file/network access.
"""

import sys
import io
import ast
from typing import Any, Dict
from ..base import EvolvianTool, ToolResult, ToolParameter


# Safe builtins for code execution
SAFE_BUILTINS = {
    # Basic functions
    "abs": abs,
    "all": all,
    "any": any,
    "ascii": ascii,
    "bin": bin,
    "bool": bool,
    "bytearray": bytearray,
    "bytes": bytes,
    "callable": callable,
    "chr": chr,
    "dict": dict,
    "divmod": divmod,
    "enumerate": enumerate,
    "filter": filter,
    "float": float,
    "format": format,
    "frozenset": frozenset,
    "hash": hash,
    "hex": hex,
    "int": int,
    "isinstance": isinstance,
    "issubclass": issubclass,
    "iter": iter,
    "len": len,
    "list": list,
    "map": map,
    "max": max,
    "min": min,
    "next": next,
    "oct": oct,
    "ord": ord,
    "pow": pow,
    "print": print,
    "range": range,
    "repr": repr,
    "reversed": reversed,
    "round": round,
    "set": set,
    "slice": slice,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "type": type,
    "zip": zip,
    # Exceptions
    "Exception": Exception,
    "ValueError": ValueError,
    "TypeError": TypeError,
    "KeyError": KeyError,
    "IndexError": IndexError,
    "StopIteration": StopIteration,
    # Constants
    "True": True,
    "False": False,
    "None": None,
}

# Modules that are safe to import
ALLOWED_MODULES = {
    "math",
    "random",
    "datetime",
    "json",
    "re",
    "collections",
    "itertools",
    "functools",
    "statistics",
    "decimal",
    "fractions",
    "string",
    "textwrap",
    "unicodedata",
}


class RestrictedImport:
    """Custom import function that only allows safe modules."""

    def __call__(self, name: str, *args, **kwargs):
        if name not in ALLOWED_MODULES:
            raise ImportError(f"Import of '{name}' is not allowed")
        return __builtins__["__import__"](name, *args, **kwargs)


class CodeExecutorTool(EvolvianTool):
    """Execute Python code in a sandboxed environment."""

    name = "code_executor"
    description = "Execute Python code for calculations, data processing, and transformations. Has access to math, json, datetime, re, and collections modules. Cannot access files or network."
    category = "dev"
    cost_per_call = 0.05

    parameters = [
        ToolParameter(
            name="code",
            type="string",
            description="Python code to execute",
            required=True,
        ),
        ToolParameter(
            name="timeout",
            type="number",
            description="Maximum execution time in seconds (max 30)",
            required=False,
            default=10,
        ),
    ]

    async def execute(self, params: dict, config: dict) -> ToolResult:
        code = params["code"]
        timeout = min(params.get("timeout", 10), 30)

        # Validate the code first
        validation_error = self._validate_code(code)
        if validation_error:
            return ToolResult(
                success=False,
                error=validation_error,
            )

        try:
            result = self._execute_code(code, timeout)
            return ToolResult(
                success=True,
                output=result,
                metadata={"language": "python"},
            )
        except TimeoutError:
            return ToolResult(
                success=False,
                error=f"Code execution timed out after {timeout} seconds",
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Execution error: {type(e).__name__}: {str(e)}",
            )

    def _validate_code(self, code: str) -> str | None:
        """
        Validate code for potentially dangerous operations.
        Returns error message if invalid, None if valid.
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return f"Syntax error: {e}"

        # Check for dangerous patterns
        for node in ast.walk(tree):
            # Block exec/eval
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in ("exec", "eval", "compile", "__import__"):
                        return f"Function '{node.func.id}' is not allowed"

            # Block attribute access to dangerous attrs
            if isinstance(node, ast.Attribute):
                if node.attr in ("__class__", "__bases__", "__subclasses__", "__mro__",
                                "__globals__", "__code__", "__builtins__"):
                    return f"Access to '{node.attr}' is not allowed"

            # Block dangerous imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name not in ALLOWED_MODULES:
                        return f"Import of '{alias.name}' is not allowed"

            if isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] not in ALLOWED_MODULES:
                    return f"Import from '{node.module}' is not allowed"

        return None

    def _execute_code(self, code: str, timeout: int) -> Dict[str, Any]:
        """Execute code in a restricted environment."""
        import signal

        # Set up timeout (Unix only)
        def timeout_handler(signum, frame):
            raise TimeoutError("Code execution timed out")

        # Capture stdout
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()

        # Set up restricted globals
        restricted_globals = {
            "__builtins__": {**SAFE_BUILTINS, "__import__": RestrictedImport()},
            "__name__": "__main__",
        }

        # Local namespace for execution
        local_ns: Dict[str, Any] = {}

        try:
            # Set timeout if on Unix
            if hasattr(signal, 'SIGALRM'):
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(timeout)

            # Execute the code
            exec(code, restricted_globals, local_ns)

            # Cancel timeout
            if hasattr(signal, 'SIGALRM'):
                signal.alarm(0)

            # Get output
            stdout_value = sys.stdout.getvalue()
            stderr_value = sys.stderr.getvalue()

            # Get any variables defined (excluding modules and functions for cleaner output)
            variables = {}
            for key, value in local_ns.items():
                if not key.startswith('_') and not callable(value):
                    try:
                        # Try to serialize the value
                        import json
                        json.dumps(value)
                        variables[key] = value
                    except (TypeError, ValueError):
                        variables[key] = str(value)

            return {
                "stdout": stdout_value,
                "stderr": stderr_value,
                "variables": variables,
            }

        finally:
            # Restore stdout/stderr
            sys.stdout = old_stdout
            sys.stderr = old_stderr

            # Cancel any pending alarm
            if hasattr(signal, 'SIGALRM'):
                signal.alarm(0)
