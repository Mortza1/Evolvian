"""
Tests for the real tool wiring in the operations execution loop.

Tests:
1. Helper functions: _build_tools_prompt_section, _strip_tool_calls, _update_tool_stats
2. Tool loading from DB (InstalledTool query -> ToolExecutor creation)
3. Multi-turn tool loop with mocked LLM
4. Backward compatibility: no tools installed -> simple_chat path
5. InstalledTool stats updated after tool use

Run with:
    cd backend
    ../venv/bin/pytest tests/test_tool_wiring.py -v
"""

import sys
import os
import json
import asyncio
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use isolated test DB before any app imports
os.environ["DATABASE_URL"] = "sqlite:///./test_tool_wiring.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, Team, Agent, Operation, InstalledTool, WorkflowExecution, VaultFile
from core.runtime.context import ExecutionContext, ToolState
from core.tools.base import EvolvianTool, ToolResult, ToolParameter
from core.tools.executor import ToolExecutor, parse_tool_calls_from_response
from core.tools.registry import ToolRegistry, get_tool_registry
from routers.operations import (
    _build_tools_prompt_section,
    _strip_tool_calls,
    _update_tool_stats,
    generate_execution_events,
)
from llm_service import ChatMessage as LLMChatMessage, ChatCompletionResponse

# DB path for cleanup
TEST_DB_PATH = "./test_tool_wiring.db"


# ==================== FIXTURES ====================

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(
        f"sqlite:///{TEST_DB_PATH}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture
def db(db_engine):
    """Each test gets a fresh session. Cleanup happens via _cleanup_db."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    # Clean up ALL test data after each test to avoid UNIQUE conflicts
    _cleanup_db(session)
    session.close()


def _cleanup_db(session):
    """Delete all rows from relevant tables."""
    try:
        session.query(VaultFile).delete()
        session.query(WorkflowExecution).delete()
        session.query(InstalledTool).delete()
        session.query(Operation).delete()
        session.query(Agent).delete()
        session.query(Team).delete()
        session.query(User).delete()
        session.commit()
    except Exception:
        session.rollback()


@pytest.fixture
def seed_data(db):
    """Create user, team, 2 agents, operation, and 1 installed tool."""
    user = User(email="test@test.com", username="tester", hashed_password="fake")
    db.add(user)
    db.flush()

    team = Team(user_id=user.id, name="Test Team", description="t")
    db.add(team)
    db.flush()

    agent1 = Agent(
        team_id=team.id, name="Alice", role="Researcher",
        specialty="research", cost_per_hour=10.0,
        skills=["research"], status="available",
    )
    agent2 = Agent(
        team_id=team.id, name="Bob", role="Writer",
        specialty="writing", cost_per_hour=12.0,
        skills=["writing"], status="available",
    )
    db.add_all([agent1, agent2])
    db.flush()

    operation = Operation(
        team_id=team.id,
        title="Research Task",
        description="Do some research",
        status="pending",
        workflow_config={
            "nodes": [
                {
                    "id": "step-1",
                    "name": "Web Research",
                    "description": "Search the web for info",
                    "agentRole": "Researcher",
                },
            ]
        },
        estimated_cost=5.0,
    )
    db.add(operation)
    db.flush()

    installed = InstalledTool(
        team_id=team.id,
        tool_id="tool-websearch",
        configuration={"api_key": "test123"},
        status="connected",
        assigned_agent_ids=[],
        total_calls=0,
        total_cost=0.0,
    )
    db.add(installed)
    db.commit()

    return {
        "user": user,
        "team": team,
        "agents": [agent1, agent2],
        "operation": operation,
        "installed_tool": installed,
    }


# ==================== HELPER FUNCTION TESTS ====================

class TestBuildToolsPromptSection:
    def test_empty_tools_returns_empty_string(self):
        assert _build_tools_prompt_section([]) == ""

    def test_single_tool_produces_prompt(self):
        from core.tools.adapters.web_search import WebSearchTool
        tool = WebSearchTool()
        result = _build_tools_prompt_section([(tool, {})])

        assert "web_search" in result
        assert "<tool_call>" in result
        assert "query" in result
        assert "Available Tools" in result

    def test_multiple_tools(self):
        from core.tools.adapters.web_search import WebSearchTool
        from core.tools.adapters.code_executor import CodeExecutorTool

        tools = [(WebSearchTool(), {}), (CodeExecutorTool(), {})]
        result = _build_tools_prompt_section(tools)

        assert "web_search" in result
        assert "code_executor" in result


class TestStripToolCalls:
    def test_strips_single_tag(self):
        text = 'Hello <tool_call>{"name": "web_search"}</tool_call> world'
        assert _strip_tool_calls(text) == "Hello  world"

    def test_strips_multiline_tag(self):
        text = 'Before\n<tool_call>\n{"name": "x"}\n</tool_call>\nAfter'
        result = _strip_tool_calls(text)
        assert "<tool_call>" not in result
        assert "Before" in result
        assert "After" in result

    def test_no_tags_unchanged(self):
        text = "Just a normal response"
        assert _strip_tool_calls(text) == text

    def test_empty_string(self):
        assert _strip_tool_calls("") == ""


class TestUpdateToolStats:
    def test_updates_installed_tool_stats(self, db, seed_data):
        inst = seed_data["installed_tool"]
        lookup = {"tool-websearch": inst}

        _update_tool_stats(db, lookup, "web_search", 0.05)

        db.refresh(inst)
        assert inst.total_calls == 1
        assert abs(inst.total_cost - 0.05) < 1e-6
        assert inst.last_used_at is not None

    def test_increments_existing_stats(self, db, seed_data):
        inst = seed_data["installed_tool"]
        inst.total_calls = 5
        inst.total_cost = 1.0
        db.commit()

        lookup = {"tool-websearch": inst}
        _update_tool_stats(db, lookup, "web_search", 0.1)

        db.refresh(inst)
        assert inst.total_calls == 6
        assert abs(inst.total_cost - 1.1) < 1e-6

    def test_unknown_tool_no_error(self, db, seed_data):
        lookup = {"tool-websearch": seed_data["installed_tool"]}
        # Should not raise
        _update_tool_stats(db, lookup, "nonexistent_tool", 0.0)


# ==================== TOOL LOADING TESTS ====================

class TestToolLoadingFromDB:
    def test_query_installed_tools(self, db, seed_data):
        team = seed_data["team"]
        records = db.query(InstalledTool).filter(
            InstalledTool.team_id == team.id,
            InstalledTool.status == "connected",
        ).all()

        assert len(records) == 1
        assert records[0].tool_id == "tool-websearch"

    def test_build_installed_tools_data(self, db, seed_data):
        team = seed_data["team"]
        records = db.query(InstalledTool).filter(
            InstalledTool.team_id == team.id,
            InstalledTool.status == "connected",
        ).all()

        installed_tools_data = []
        for inst in records:
            installed_tools_data.append({
                "tool_id": inst.tool_id,
                "configuration": inst.configuration or {},
                "assigned_agent_ids": inst.assigned_agent_ids or [],
            })

        assert len(installed_tools_data) == 1
        assert installed_tools_data[0]["tool_id"] == "tool-websearch"
        assert installed_tools_data[0]["configuration"]["api_key"] == "test123"

    def test_create_tool_executor(self, db, seed_data):
        context = ExecutionContext(operation_id=1, team_id=seed_data["team"].id)
        installed_tools_data = [{
            "tool_id": "tool-websearch",
            "configuration": {},
            "assigned_agent_ids": [],
        }]

        executor = ToolExecutor(context, installed_tools_data)
        available = executor.get_available_tools()

        assert len(available) == 1
        assert available[0].name == "web_search"

    def test_get_tools_for_agent_all_access(self, seed_data):
        registry = get_tool_registry()
        installed_tools_data = [{
            "tool_id": "tool-websearch",
            "configuration": {},
            "assigned_agent_ids": [],  # empty = all agents
        }]

        agent_id = seed_data["agents"][0].id
        tools = registry.get_tools_for_agent(agent_id, installed_tools_data)
        assert len(tools) == 1

    def test_get_tools_for_agent_restricted(self, seed_data):
        registry = get_tool_registry()
        agent1_id = seed_data["agents"][0].id
        agent2_id = seed_data["agents"][1].id

        installed_tools_data = [{
            "tool_id": "tool-websearch",
            "configuration": {},
            "assigned_agent_ids": [agent1_id],  # only agent1
        }]

        # agent1 should get the tool
        assert len(registry.get_tools_for_agent(agent1_id, installed_tools_data)) == 1
        # agent2 should not
        assert len(registry.get_tools_for_agent(agent2_id, installed_tools_data)) == 0


# ==================== MULTI-TURN TOOL LOOP TESTS ====================

class TestMultiTurnToolLoop:
    def test_parse_and_execute_tool_call(self):
        """parse_tool_calls_from_response finds <tool_call> tags."""
        response = (
            'Let me search.\n'
            '<tool_call>\n'
            '{"name": "web_search", "arguments": {"query": "test"}}\n'
            '</tool_call>\n'
        )
        calls = parse_tool_calls_from_response(response)
        assert len(calls) == 1
        assert calls[0]["name"] == "web_search"
        assert calls[0]["arguments"]["query"] == "test"

    def test_no_tool_calls_in_final_response(self):
        response = "Here is the final answer with no tool calls."
        calls = parse_tool_calls_from_response(response)
        assert calls == []

    def test_execute_function_call_via_executor(self):
        """ToolExecutor.execute_function_call dispatches to the right tool."""
        context = ExecutionContext(operation_id=1, team_id=1)
        installed = [{"tool_id": "tool-code-executor", "configuration": {}}]
        executor = ToolExecutor(context, installed)

        call = {"name": "code_executor", "arguments": {"code": "x = 2 + 2\nprint(x)"}}

        # Run async executor from sync test (same pattern as operations.py)
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            executor.execute_function_call(call, agent_name="TestAgent")
        )
        loop.close()

        assert result.success
        assert "4" in result.output["stdout"]
        # Recorded in context
        assert len(context.tool_states) == 1
        assert context.tool_states[0].tool_name == "code_executor"


# ==================== EXECUTION GENERATOR INTEGRATION ====================

def _collect_events(gen):
    """Drain an SSE generator and return parsed events."""
    events = []
    for raw in gen:
        line = raw.strip()
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


class TestGenerateExecutionEvents:
    """Test generate_execution_events with mocked LLM - both paths."""

    @patch("routers.operations.llm_service")
    def test_no_tools_path_uses_simple_chat(self, mock_llm, db, seed_data):
        """When no tools are installed, falls through to simple_chat."""
        # Remove all installed tools for this team
        db.query(InstalledTool).filter(
            InstalledTool.team_id == seed_data["team"].id
        ).delete()
        db.commit()

        mock_llm.simple_chat.return_value = "Here is my research output."

        op = seed_data["operation"]
        op.status = "pending"
        op.started_at = None
        op.completed_at = None
        op.execution_checkpoint = None
        db.commit()

        events = _collect_events(
            generate_execution_events(
                op, seed_data["team"], seed_data["agents"], db
            )
        )

        event_types = [e["type"] for e in events]
        assert "start" in event_types
        assert "node_start" in event_types
        assert "node_complete" in event_types
        assert "complete" in event_types

        # simple_chat called for agent + once for LLM-as-judge evaluation
        assert mock_llm.simple_chat.call_count >= 1
        # The first call is the agent call (no tools path)
        first_call_args = mock_llm.simple_chat.call_args_list[0]
        assert "Researcher" in str(first_call_args) or "Web Research" in str(first_call_args)
        mock_llm.chat_completion.assert_not_called()

        # No tool_use events emitted
        assert "tool_use" not in event_types

    @patch("routers.operations.llm_service")
    def test_tools_path_multi_turn(self, mock_llm, db, seed_data):
        """When tools are installed, uses chat_completion + tool loop."""
        # Replace installed tool with code_executor
        existing = seed_data["installed_tool"]
        existing.tool_id = "tool-code-executor"
        existing.configuration = {}
        db.commit()

        # Turn 1: LLM wants to call code_executor
        turn1_response = ChatCompletionResponse(
            response=(
                'Let me compute that.\n'
                '<tool_call>\n'
                '{"name": "code_executor", "arguments": {"code": "x = 42\\nprint(x)"}}\n'
                '</tool_call>\n'
            ),
            model="test-model",
            usage={"total_tokens": 100},
        )
        # Turn 2: LLM gives final answer (no tool calls)
        turn2_response = ChatCompletionResponse(
            response="The answer is 42.",
            model="test-model",
            usage={"total_tokens": 50},
        )
        mock_llm.chat_completion.side_effect = [turn1_response, turn2_response]

        op = seed_data["operation"]
        op.status = "pending"
        op.started_at = None
        op.completed_at = None
        op.execution_checkpoint = None
        db.commit()

        events = _collect_events(
            generate_execution_events(
                op, seed_data["team"], seed_data["agents"], db
            )
        )

        event_types = [e["type"] for e in events]

        # Should have tool_use events
        tool_events = [e for e in events if e["type"] == "tool_use"]
        assert len(tool_events) >= 2  # running + completed

        tool_running = [e for e in tool_events if e["status"] == "running"]
        tool_completed = [e for e in tool_events if e["status"] == "completed"]
        assert len(tool_running) >= 1
        assert len(tool_completed) >= 1
        assert tool_running[0]["tool"] == "code_executor"

        # chat_completion called twice (2 turns for agent)
        assert mock_llm.chat_completion.call_count == 2
        # simple_chat may be called for LLM-as-judge evaluation (post-execution)
        # but NOT for the agent execution itself

        # Final node_complete and complete events present
        assert "node_complete" in event_types
        assert "complete" in event_types

        # The stored result should be the clean final answer
        llm_events = [e for e in events if e["type"] == "llm_call" and e.get("status") == "completed"]
        assert len(llm_events) == 1
        assert "42" in llm_events[0]["output_preview"]

    @patch("routers.operations.llm_service")
    def test_tool_error_emits_error_event(self, mock_llm, db, seed_data):
        """When a tool call references an unknown tool, error status is emitted."""
        # Use code_executor as installed tool but LLM will call a nonexistent one
        existing = seed_data["installed_tool"]
        existing.tool_id = "tool-code-executor"
        existing.configuration = {}
        db.commit()

        # LLM tries to call a tool that doesn't exist in executor
        turn1_response = ChatCompletionResponse(
            response=(
                '<tool_call>\n'
                '{"name": "nonexistent_tool", "arguments": {}}\n'
                '</tool_call>\n'
            ),
            model="test-model",
            usage={"total_tokens": 50},
        )
        # After error, LLM gives final answer
        turn2_response = ChatCompletionResponse(
            response="I could not use the tool. Here is my best answer.",
            model="test-model",
            usage={"total_tokens": 50},
        )
        mock_llm.chat_completion.side_effect = [turn1_response, turn2_response]

        op = seed_data["operation"]
        op.status = "pending"
        op.started_at = None
        op.completed_at = None
        op.execution_checkpoint = None
        db.commit()

        events = _collect_events(
            generate_execution_events(
                op, seed_data["team"], seed_data["agents"], db
            )
        )

        tool_events = [e for e in events if e["type"] == "tool_use"]
        error_events = [e for e in tool_events if e.get("status") == "error"]
        assert len(error_events) >= 1


# ==================== PROMPT INTEGRATION TEST ====================

class TestPromptContainsToolSection:
    """Verify the prompt sent to chat_completion includes tool descriptions."""

    @patch("routers.operations.llm_service")
    def test_prompt_includes_tool_section(self, mock_llm, db, seed_data):
        existing = seed_data["installed_tool"]
        existing.tool_id = "tool-websearch"
        existing.configuration = {}
        db.commit()

        # Single turn, no tool calls
        mock_llm.chat_completion.return_value = ChatCompletionResponse(
            response="Final answer without tools.",
            model="test-model",
            usage={"total_tokens": 50},
        )

        op = seed_data["operation"]
        op.status = "pending"
        op.started_at = None
        op.completed_at = None
        op.execution_checkpoint = None
        db.commit()

        # Consume the generator
        for _ in generate_execution_events(
            op, seed_data["team"], seed_data["agents"], db
        ):
            pass

        # Inspect the system message sent to chat_completion
        call_args = mock_llm.chat_completion.call_args
        messages = call_args[0][0] if call_args[0] else call_args[1]["messages"]
        system_msg = messages[0].content

        assert "Available Tools" in system_msg
        assert "web_search" in system_msg
        assert "<tool_call>" in system_msg


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
