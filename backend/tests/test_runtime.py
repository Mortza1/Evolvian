#!/usr/bin/env python3
"""
Test script for the Evolvian Runtime Module.

This demonstrates how ExecutionContext and WorkflowExecution work together.
Run this file to see the runtime in action:

    cd backend
    python test_runtime.py

This test:
1. Creates an ExecutionContext for an operation
2. Simulates a multi-agent workflow execution
3. Demonstrates pause/resume via checkpoint serialization
4. Shows how to store execution data in WorkflowExecution model
5. Demonstrates the Workflow DNA concept
"""

import sys
import time
from datetime import datetime, timezone

# Add parent to path for imports
sys.path.insert(0, '.')

from core.runtime import (
    ExecutionContext,
    AgentState,
    ToolState,
    ExecutionMetrics,
    NodeMetrics,
)


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def test_basic_context():
    """Test basic ExecutionContext creation and usage."""
    print_section("1. Basic ExecutionContext Creation")

    # Create a context for operation_id=1, team_id=1
    context = ExecutionContext(operation_id=1, team_id=1)

    print(f"Created: {context}")
    print(f"Status: {context.status}")
    print(f"Operation ID: {context.operation_id}")
    print(f"Team ID: {context.team_id}")


def test_memory_operations():
    """Test memory operations - the operation-scoped key-value store."""
    print_section("2. Memory Operations (Operation-Scoped State)")

    context = ExecutionContext(operation_id=1, team_id=1)

    # Store values in memory
    context.add_to_memory("task_goal", "Create a marketing campaign for new product launch")
    context.add_to_memory("target_audience", "Tech-savvy millennials")
    context.add_to_memory("budget", 5000.0)

    print("Stored in memory:")
    print(f"  task_goal: {context.get_from_memory('task_goal')}")
    print(f"  target_audience: {context.get_from_memory('target_audience')}")
    print(f"  budget: {context.get_from_memory('budget')}")
    print(f"  missing_key: {context.get_from_memory('missing_key', 'default_value')}")

    # Check existence
    print(f"\nhas 'task_goal': {context.has_in_memory('task_goal')}")
    print(f"has 'missing': {context.has_in_memory('missing')}")


def test_agent_execution():
    """Test agent state tracking during execution."""
    print_section("3. Agent Execution Tracking")

    context = ExecutionContext(operation_id=1, team_id=1)
    context.start(total_nodes=3)

    # Simulate researcher agent execution
    print("Simulating researcher agent execution...")
    researcher_state = AgentState(
        agent_id=1,
        agent_name="researcher",
        role="Market Researcher",
        output="Market analysis shows 40% growth in target segment...",
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        tokens_used=1500,
        cost=0.015,
        xp_earned=25
    )
    context.set_agent_state("researcher", researcher_state)

    # Simulate analyst agent execution
    print("Simulating analyst agent execution...")
    analyst_state = AgentState(
        agent_id=2,
        agent_name="analyst",
        role="Data Analyst",
        output="Based on researcher's findings, recommend focusing on social media...",
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        tokens_used=1200,
        cost=0.012,
        xp_earned=20
    )
    context.set_agent_state("analyst", analyst_state)

    # Simulate writer agent execution
    print("Simulating writer agent execution...")
    writer_state = AgentState(
        agent_id=3,
        agent_name="writer",
        role="Content Writer",
        output="# Marketing Campaign Plan\n\n## Executive Summary\n...",
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=datetime.now(timezone.utc).isoformat(),
        tokens_used=2000,
        cost=0.020,
        xp_earned=30
    )
    context.set_agent_state("writer", writer_state)

    print("\nAgent states recorded:")
    for name, state in context.agent_states.items():
        print(f"  {name}: {state.role} - {state.tokens_used} tokens, ${state.cost:.3f}")

    print("\nGet previous agent output (for chaining):")
    print(f"  researcher output: {context.get_agent_output('researcher')[:50]}...")

    print("\nAll agent outputs:")
    for name, output in context.get_all_agent_outputs().items():
        print(f"  {name}: {output[:40]}...")


def test_node_metrics():
    """Test node-level metrics tracking."""
    print_section("4. Node Metrics Tracking")

    context = ExecutionContext(operation_id=1, team_id=1)
    context.start(total_nodes=3)

    # Simulate node executions with timing
    nodes = [
        ("node_1", "researcher"),
        ("node_2", "analyst"),
        ("node_3", "writer"),
    ]

    for node_id, agent_name in nodes:
        # Start node
        metrics = context.start_node(node_id, agent_name)
        print(f"Started {node_id} with {agent_name}")

        # Simulate work
        time.sleep(0.1)  # 100ms of "work"

        # Complete node
        context.complete_node(
            node_id,
            success=True,
            cost=0.01,
            tokens_used=500
        )
        print(f"  Completed {node_id}: latency={context.node_metrics[node_id].latency_ms}ms")

    print("\nAggregate metrics:")
    print(f"  Total cost: ${context.metrics.total_cost:.3f}")
    print(f"  Total tokens: {context.metrics.total_tokens}")
    print(f"  Total latency: {context.metrics.total_latency_ms}ms")
    print(f"  Nodes completed: {context.metrics.nodes_completed}/{context.metrics.nodes_total}")


def test_tool_execution():
    """Test tool execution tracking."""
    print_section("5. Tool Execution Tracking")

    context = ExecutionContext(operation_id=1, team_id=1)

    # Simulate web search tool execution
    search_tool = ToolState(
        tool_id="tool-websearch",
        tool_name="Web Search",
        input_data={"query": "marketing trends 2024"},
        output_data={"results": ["trend1", "trend2", "trend3"]},
        executed_at=datetime.now(timezone.utc).isoformat(),
        latency_ms=250,
        cost=0.001,
        success=True
    )
    context.add_tool_execution(search_tool)

    # Simulate database query tool
    db_tool = ToolState(
        tool_id="tool-database",
        tool_name="Database Query",
        input_data={"query": "SELECT * FROM customers WHERE segment='tech'"},
        output_data={"rows": 150},
        executed_at=datetime.now(timezone.utc).isoformat(),
        latency_ms=50,
        cost=0.0,
        success=True
    )
    context.add_tool_execution(db_tool)

    print("Tool executions recorded:")
    for tool in context.get_tool_executions():
        print(f"  {tool.tool_name}: {tool.latency_ms}ms, success={tool.success}")

    print(f"\nFiltered by tool name:")
    for tool in context.get_tool_executions("Web Search"):
        print(f"  {tool.tool_name}: input={tool.input_data}")


def test_assumptions():
    """Test assumptions system - agents ask instead of hallucinate."""
    print_section("6. Assumptions System (Ask Don't Hallucinate)")

    context = ExecutionContext(operation_id=1, team_id=1)

    # Agent raises an assumption instead of guessing
    assumption1 = context.raise_assumption(
        question="What is the target budget for this campaign?",
        context="I need to know the budget to recommend appropriate channels",
        options=["Under $1000", "$1000-$5000", "$5000-$10000", "Over $10000"],
        priority="high"
    )
    print(f"Assumption raised: {assumption1['question']}")
    print(f"  Options: {assumption1['options']}")

    # Another assumption
    assumption2 = context.raise_assumption(
        question="Should we focus on B2B or B2C messaging?",
        context="The product could appeal to both markets",
        options=["B2B", "B2C", "Both"],
        priority="normal"
    )

    print(f"\nUnanswered assumptions: {len(context.get_unanswered_assumptions())}")

    # User answers the first assumption
    context.answer_assumption(0, "$5000-$10000")
    print(f"\nAnswered assumption 0: '$5000-$10000'")
    print(f"Unanswered assumptions: {len(context.get_unanswered_assumptions())}")


def test_knowledge_context():
    """Test knowledge context - relevant nodes from team's graph."""
    print_section("7. Knowledge Context (From Team's Graph)")

    context = ExecutionContext(operation_id=1, team_id=1)

    # Simulate loading relevant knowledge nodes
    knowledge_nodes = [
        {
            "id": 1,
            "node_type": "policy",
            "label": "Brand Voice Guidelines",
            "description": "Always use friendly, professional tone"
        },
        {
            "id": 2,
            "node_type": "entity",
            "label": "Target Customer Persona",
            "description": "Tech-savvy millennial, values sustainability"
        },
        {
            "id": 3,
            "node_type": "decision",
            "label": "Previous Campaign Choice",
            "description": "Chose Instagram over Twitter for last launch"
        }
    ]
    context.add_knowledge_context(knowledge_nodes)

    print(f"Knowledge context loaded: {len(context.knowledge_context)} nodes")

    print("\nPolicies:")
    for node in context.get_knowledge_context("policy"):
        print(f"  - {node['label']}: {node['description']}")

    print("\nEntities:")
    for node in context.get_knowledge_context("entity"):
        print(f"  - {node['label']}: {node['description']}")


def test_checkpoint_serialization():
    """Test pause/resume via checkpoint serialization."""
    print_section("8. Checkpoint Serialization (Pause/Resume)")

    # Create and populate a context
    context = ExecutionContext(operation_id=42, team_id=7)
    context.start(total_nodes=5)

    # Add some state
    context.add_to_memory("task_goal", "Build a landing page")
    context.set_agent_state("designer", AgentState(
        agent_id=1,
        agent_name="designer",
        role="Visual Designer",
        output="Created wireframe...",
        tokens_used=800,
        cost=0.008
    ))
    context.start_node("node_1", "designer")
    context.complete_node("node_1", success=True, cost=0.008)
    context.current_node_index = 1

    print(f"Original context: {context}")
    print(f"  Memory: {context.memory}")
    print(f"  Agent states: {list(context.agent_states.keys())}")
    print(f"  Current node: {context.current_node_index}")

    # Pause and serialize
    context.pause()
    checkpoint = context.to_checkpoint()
    print(f"\nContext paused and serialized to checkpoint")
    print(f"  Checkpoint keys: {list(checkpoint.keys())}")

    # Simulate storing checkpoint (would go to DB in real usage)
    import json
    checkpoint_json = json.dumps(checkpoint)
    print(f"  Checkpoint size: {len(checkpoint_json)} bytes")

    # Later... restore from checkpoint
    restored_context = ExecutionContext.from_checkpoint(checkpoint)
    restored_context.resume()

    print(f"\nRestored context: {restored_context}")
    print(f"  Memory: {restored_context.memory}")
    print(f"  Agent states: {list(restored_context.agent_states.keys())}")
    print(f"  Current node: {restored_context.current_node_index}")
    print(f"  Status: {restored_context.status}")


def test_workflow_dna():
    """Test workflow DNA signature for evolution tracking."""
    print_section("9. Workflow DNA (For Evolution)")

    context = ExecutionContext(operation_id=1, team_id=1)

    # Compute workflow signature
    signature = context.compute_workflow_signature(
        agents=["researcher", "analyst", "writer"],
        prompts={
            "researcher": "You are a market researcher...",
            "analyst": "You analyze data and provide insights...",
            "writer": "You write compelling marketing copy..."
        },
        tools={
            "researcher": ["web_search", "database"],
            "analyst": ["calculator", "chart_generator"],
            "writer": ["grammar_check"]
        }
    )

    print(f"Workflow DNA signature: {signature}")
    print(f"  (This hash identifies this unique workflow configuration)")

    # Same config = same signature
    context2 = ExecutionContext(operation_id=2, team_id=1)
    signature2 = context2.compute_workflow_signature(
        agents=["researcher", "analyst", "writer"],
        prompts={
            "researcher": "You are a market researcher...",
            "analyst": "You analyze data and provide insights...",
            "writer": "You write compelling marketing copy..."
        },
        tools={
            "researcher": ["web_search", "database"],
            "analyst": ["calculator", "chart_generator"],
            "writer": ["grammar_check"]
        }
    )
    print(f"\nSame config, same signature: {signature == signature2}")

    # Different config = different signature
    context3 = ExecutionContext(operation_id=3, team_id=1)
    signature3 = context3.compute_workflow_signature(
        agents=["researcher", "writer"],  # Different agents
        prompts={
            "researcher": "You are a market researcher...",
            "writer": "You write compelling marketing copy..."
        },
        tools={}
    )
    print(f"Different config signature: {signature3}")
    print(f"Different from original: {signature != signature3}")


def test_execution_summary():
    """Test getting execution summary."""
    print_section("10. Execution Summary")

    context = ExecutionContext(operation_id=1, team_id=1)
    context.start(total_nodes=3)

    # Simulate full execution
    context.add_to_memory("task_goal", "Create marketing campaign")

    for i, (agent, role) in enumerate([
        ("researcher", "Researcher"),
        ("analyst", "Analyst"),
        ("writer", "Writer")
    ]):
        context.start_node(f"node_{i+1}", agent)
        time.sleep(0.05)
        context.set_agent_state(agent, AgentState(
            agent_id=i+1,
            agent_name=agent,
            role=role,
            output=f"Output from {agent}...",
            tokens_used=500,
            cost=0.005
        ))
        context.complete_node(f"node_{i+1}", success=True, cost=0.005, tokens_used=500)

    context.raise_assumption("What tone should we use?", options=["Formal", "Casual"])
    context.answer_assumption(0, "Casual")

    context.complete(success=True)

    summary = context.get_summary()
    print("Execution Summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")


def test_database_model():
    """Test WorkflowExecution database model integration."""
    print_section("11. WorkflowExecution Database Model")

    print("Note: This test shows how to create a WorkflowExecution record")
    print("from an ExecutionContext. In production, this would be saved to DB.\n")

    # Create and run a context
    context = ExecutionContext(operation_id=1, team_id=1)
    context.start(total_nodes=2)

    signature = context.compute_workflow_signature(
        agents=["researcher", "writer"],
        prompts={"researcher": "...", "writer": "..."},
        tools={}
    )

    context.set_agent_state("researcher", AgentState(
        agent_id=1, agent_name="researcher", role="Researcher",
        output="...", tokens_used=1000, cost=0.01
    ))
    context.set_agent_state("writer", AgentState(
        agent_id=2, agent_name="writer", role="Writer",
        output="...", tokens_used=1500, cost=0.015
    ))

    context.start_node("node_1", "researcher")
    context.complete_node("node_1", success=True, cost=0.01, tokens_used=1000)
    context.start_node("node_2", "writer")
    context.complete_node("node_2", success=True, cost=0.015, tokens_used=1500)

    context.complete(success=True)

    # This is what you'd save to the WorkflowExecution model
    workflow_execution_data = {
        "operation_id": context.operation_id,
        "team_id": context.team_id,
        "workflow_signature": context.workflow_signature,
        "task_type": "content_creation",  # Would be inferred or set
        "team_composition": [
            {"agent_id": 1, "agent_name": "researcher", "role": "Researcher"},
            {"agent_id": 2, "agent_name": "writer", "role": "Writer"},
        ],
        "agents_used": list(context.agent_states.keys()),
        "cost": context.metrics.total_cost,
        "latency_ms": context.metrics.total_latency_ms,
        "tokens_used": context.metrics.total_tokens,
        "nodes_total": context.metrics.nodes_total,
        "nodes_completed": context.metrics.nodes_completed,
        "nodes_failed": context.metrics.nodes_failed,
        "node_metrics": {
            node_id: metrics.to_dict()
            for node_id, metrics in context.node_metrics.items()
        },
        "assumptions_raised": len(context.assumptions),
        "assumptions_answered": len([a for a in context.assumptions if a["answered"]]),
        "status": context.status,
        "context_snapshot": context.to_checkpoint(),  # Full snapshot for replay
    }

    print("WorkflowExecution record data:")
    for key, value in workflow_execution_data.items():
        if key == "context_snapshot":
            print(f"  {key}: <checkpoint with {len(value)} keys>")
        elif key == "node_metrics":
            print(f"  {key}: {len(value)} nodes tracked")
        elif key == "team_composition":
            print(f"  {key}: {len(value)} agents")
        else:
            print(f"  {key}: {value}")

    print("\nThis data can now be used for:")
    print("  - Comparing workflow performance over time")
    print("  - Identifying successful patterns (by workflow_signature)")
    print("  - Training evolution algorithms")
    print("  - Quality vs cost analysis")


def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("  EVOLVIAN RUNTIME MODULE TEST")
    print("="*60)

    test_basic_context()
    test_memory_operations()
    test_agent_execution()
    test_node_metrics()
    test_tool_execution()
    test_assumptions()
    test_knowledge_context()
    test_checkpoint_serialization()
    test_workflow_dna()
    test_execution_summary()
    test_database_model()

    print_section("ALL TESTS COMPLETED")
    print("The ExecutionContext provides:")
    print("  - Stateful execution environment (agents are no longer stateless)")
    print("  - Memory persistence across agent executions")
    print("  - Tool and node metrics tracking")
    print("  - Assumptions system (ask don't hallucinate)")
    print("  - Knowledge context injection")
    print("  - Pause/resume via checkpoint serialization")
    print("  - Workflow DNA for evolution tracking")
    print("\nNext steps:")
    print("  - Wire ExecutionContext into routers/operations.py")
    print("  - Build RuntimeKernel to orchestrate execution")
    print("  - Build MemoryBridge to connect to knowledge graph")
    print("  - Build ExecutionEvaluator for quality scoring")


if __name__ == "__main__":
    run_all_tests()
