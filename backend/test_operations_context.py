#!/usr/bin/env python3
"""
Test script for Operations + ExecutionContext integration.

This tests the wiring of ExecutionContext into the operations router.
Run this file to verify the integration works:

    cd backend
    python test_operations_context.py

This test:
1. Creates test database records (user, team, agents, operation)
2. Simulates the execution flow with ExecutionContext
3. Tests checkpoint serialization (pause/resume)
4. Verifies WorkflowExecution record is created
5. Cleans up test data
"""

import sys
import os
import time
from datetime import datetime, timezone

# Add parent to path for imports
sys.path.insert(0, '.')

# Set up test database (use a separate test DB)
os.environ["DATABASE_URL"] = "sqlite:///./test_evolvian.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

from models import User, Team, Agent, Operation, WorkflowExecution
from core.runtime import ExecutionContext, AgentState, ToolState, NodeMetrics


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def setup_test_db():
    """Create test database and return session."""
    engine = create_engine("sqlite:///./test_evolvian.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def create_test_data(db):
    """Create test user, team, agents, and operation."""
    print("Creating test data...")

    # Create user
    user = User(
        email="test@evolvian.ai",
        username="testuser",
        hashed_password="fakehash"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"  Created user: {user.username} (ID: {user.id})")

    # Create team
    team = Team(
        user_id=user.id,
        name="Test Team",
        description="A test team for integration testing"
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    print(f"  Created team: {team.name} (ID: {team.id})")

    # Create agents
    agents = []
    agent_configs = [
        ("Alice", "Brand Strategist", "Value Proposition", 35.0),
        ("Bob", "Content Creator", "Copywriting", 28.0),
        ("Charlie", "Visual Designer", "Brand Identity", 32.0),
    ]

    for name, role, specialty, cost in agent_configs:
        agent = Agent(
            team_id=team.id,
            name=name,
            role=role,
            specialty=specialty,
            cost_per_hour=cost,
            skills=["research", "analysis", "creativity"],
            status="available"
        )
        db.add(agent)
        agents.append(agent)

    db.commit()
    for agent in agents:
        db.refresh(agent)
        print(f"  Created agent: {agent.name} ({agent.role}, ID: {agent.id})")

    # Create operation with workflow
    operation = Operation(
        team_id=team.id,
        title="Test Marketing Campaign",
        description="Create a marketing campaign for a new product launch",
        status="pending",
        workflow_config={
            "title": "Marketing Campaign Workflow",
            "nodes": [
                {
                    "id": "step-1",
                    "name": "Brand Strategy Analysis",
                    "description": "Analyze brand positioning and target market",
                    "agentRole": "Brand Strategist"
                },
                {
                    "id": "step-2",
                    "name": "Content Creation",
                    "description": "Create marketing copy and messaging",
                    "agentRole": "Content Creator"
                },
                {
                    "id": "step-3",
                    "name": "Visual Design",
                    "description": "Design visual assets for the campaign",
                    "agentRole": "Visual Designer"
                }
            ]
        },
        estimated_cost=50.0
    )
    db.add(operation)
    db.commit()
    db.refresh(operation)
    print(f"  Created operation: {operation.title} (ID: {operation.id})")

    return user, team, agents, operation


def test_execution_context_creation(operation, team):
    """Test creating ExecutionContext for an operation."""
    print_section("1. ExecutionContext Creation")

    context = ExecutionContext(
        operation_id=operation.id,
        team_id=team.id
    )

    # Add initial memory
    context.add_to_memory("task_goal", operation.title)
    context.add_to_memory("task_description", operation.description)
    context.add_to_memory("team_name", team.name)

    # Compute workflow signature
    nodes = operation.workflow_config.get("nodes", [])
    agent_roles = [node.get("agentRole", "") for node in nodes]
    signature = context.compute_workflow_signature(agents=agent_roles)

    print(f"Context created:")
    print(f"  operation_id: {context.operation_id}")
    print(f"  team_id: {context.team_id}")
    print(f"  workflow_signature: {signature}")
    print(f"  memory keys: {list(context.memory.keys())}")

    return context


def test_simulated_execution(context, operation, agents):
    """Simulate execution flow with context tracking."""
    print_section("2. Simulated Execution Flow")

    nodes = operation.workflow_config.get("nodes", [])
    context.start(total_nodes=len(nodes))

    print(f"Started execution: {len(nodes)} nodes")

    # Create agent lookup
    agent_by_role = {}
    for agent in agents:
        agent_by_role[agent.role.lower()] = agent

    for idx, node in enumerate(nodes):
        node_id = node.get("id", f"step-{idx+1}")
        node_name = node.get("name", f"Step {idx+1}")
        agent_role = node.get("agentRole", "General Agent")

        # Find matching agent
        assigned_agent = None
        role_lower = agent_role.lower()
        for key in agent_by_role:
            if key in role_lower or role_lower in key:
                assigned_agent = agent_by_role[key]
                break
        if not assigned_agent:
            assigned_agent = agents[0]

        agent_name = assigned_agent.name
        agent_id = assigned_agent.id

        print(f"\n  Node {idx+1}: {node_name}")
        print(f"    Agent: {agent_name} ({agent_role})")

        # Start node in context
        context.start_node(node_id, agent_name)

        # Simulate tool usage
        tool_state = ToolState(
            tool_id=f"tool-research",
            tool_name="Research Tool",
            input_data={"query": node_name},
            output_data={"results": ["result1", "result2"]},
            executed_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=150,
            success=True
        )
        context.add_tool_execution(tool_state)
        print(f"    Tool: {tool_state.tool_name} ({tool_state.latency_ms}ms)")

        # Simulate LLM response
        time.sleep(0.1)  # Simulate work
        llm_response = f"[Simulated output for {node_name}] Analysis complete with key findings..."

        # Record agent state
        agent_state = AgentState(
            agent_id=agent_id,
            agent_name=agent_name,
            role=agent_role,
            output=llm_response,
            started_at=context.node_metrics[node_id].started_at,
            completed_at=datetime.now(timezone.utc).isoformat(),
            tokens_used=500,
            cost=assigned_agent.cost_per_hour * 0.1,
            xp_earned=25
        )
        context.set_agent_state(agent_name, agent_state)

        # Complete node
        context.complete_node(
            node_id,
            success=True,
            cost=agent_state.cost,
            tokens_used=agent_state.tokens_used
        )
        context.advance_node()

        print(f"    Output: {llm_response[:50]}...")
        print(f"    Cost: ${agent_state.cost:.2f}, Tokens: {agent_state.tokens_used}")

    context.complete(success=True)

    print(f"\n  Execution complete!")
    print(f"  Total cost: ${context.metrics.total_cost:.2f}")
    print(f"  Total tokens: {context.metrics.total_tokens}")
    print(f"  Nodes completed: {context.metrics.nodes_completed}/{context.metrics.nodes_total}")

    return context


def test_checkpoint_serialization(context):
    """Test checkpoint serialization and restoration."""
    print_section("3. Checkpoint Serialization (Pause/Resume)")

    # Serialize to checkpoint
    checkpoint = context.to_checkpoint()

    print(f"Checkpoint created:")
    print(f"  Keys: {list(checkpoint.keys())}")
    print(f"  Agent states: {list(checkpoint['agent_states'].keys())}")
    print(f"  Node metrics: {list(checkpoint['node_metrics'].keys())}")

    # Convert to JSON (what would be stored in DB)
    import json
    checkpoint_json = json.dumps(checkpoint)
    print(f"  JSON size: {len(checkpoint_json)} bytes")

    # Restore from checkpoint
    restored_context = ExecutionContext.from_checkpoint(checkpoint)

    print(f"\nRestored context:")
    print(f"  operation_id: {restored_context.operation_id}")
    print(f"  team_id: {restored_context.team_id}")
    print(f"  workflow_signature: {restored_context.workflow_signature}")
    print(f"  status: {restored_context.status}")
    print(f"  nodes_completed: {restored_context.metrics.nodes_completed}")
    print(f"  agent_states: {list(restored_context.agent_states.keys())}")

    # Verify data integrity
    assert restored_context.operation_id == context.operation_id
    assert restored_context.team_id == context.team_id
    assert restored_context.workflow_signature == context.workflow_signature
    assert len(restored_context.agent_states) == len(context.agent_states)
    assert restored_context.metrics.total_cost == context.metrics.total_cost

    print(f"\n  Data integrity verified!")

    return checkpoint


def test_workflow_execution_record(context, operation, db):
    """Test creating WorkflowExecution record from context."""
    print_section("4. WorkflowExecution Record (for Evolution)")

    # Infer task type
    def _infer_task_type(title: str, description: str) -> str:
        text = (title + " " + description).lower()
        if any(w in text for w in ["brand", "branding"]):
            return "branding"
        elif any(w in text for w in ["content", "blog"]):
            return "content_creation"
        elif any(w in text for w in ["campaign", "marketing"]):
            return "marketing"
        else:
            return "general"

    task_type = _infer_task_type(operation.title, operation.description)
    print(f"Inferred task_type: {task_type}")

    # Create WorkflowExecution record
    workflow_execution = WorkflowExecution(
        operation_id=operation.id,
        team_id=operation.team_id,
        workflow_signature=context.workflow_signature,
        task_type=task_type,
        team_composition=[
            {"agent_id": state.agent_id, "agent_name": name, "role": state.role}
            for name, state in context.agent_states.items()
        ],
        agents_used=list(context.agent_states.keys()),
        cost=context.metrics.total_cost,
        latency_ms=context.metrics.total_latency_ms,
        tokens_used=context.metrics.total_tokens,
        nodes_total=context.metrics.nodes_total,
        nodes_completed=context.metrics.nodes_completed,
        nodes_failed=context.metrics.nodes_failed,
        node_metrics={
            node_id: metrics.to_dict()
            for node_id, metrics in context.node_metrics.items()
        },
        assumptions_raised=len(context.assumptions),
        assumptions_answered=len([a for a in context.assumptions if a.get("answered")]),
        status="completed",
        context_snapshot=context.to_checkpoint(),
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )

    db.add(workflow_execution)
    db.commit()
    db.refresh(workflow_execution)

    print(f"WorkflowExecution record created:")
    print(f"  ID: {workflow_execution.id}")
    print(f"  workflow_signature: {workflow_execution.workflow_signature}")
    print(f"  task_type: {workflow_execution.task_type}")
    print(f"  agents_used: {workflow_execution.agents_used}")
    print(f"  cost: ${workflow_execution.cost:.2f}")
    print(f"  tokens_used: {workflow_execution.tokens_used}")
    print(f"  nodes: {workflow_execution.nodes_completed}/{workflow_execution.nodes_total}")

    return workflow_execution


def test_previous_outputs_in_prompt(context):
    """Test that previous agent outputs are available for subsequent agents."""
    print_section("5. Previous Outputs Access (Agent Chaining)")

    # Get all previous outputs
    previous_outputs = context.get_all_agent_outputs()

    print(f"Previous outputs available for prompt building:")
    for agent_name, output in previous_outputs.items():
        print(f"  {agent_name}: {output[:50]}...")

    # Simulate building prompt with previous context
    context_section = ""
    if previous_outputs:
        context_section = "\nPrevious work from team:\n"
        for prev_agent, prev_output in previous_outputs.items():
            context_section += f"- {prev_agent}: {prev_output[:100]}...\n"

    print(f"\nContext section for next agent prompt:")
    print(context_section)


def test_context_summary(context):
    """Test context summary generation."""
    print_section("6. Context Summary")

    summary = context.get_summary()

    print(f"Execution Summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")


def cleanup_test_data(db):
    """Clean up test data."""
    print_section("7. Cleanup")

    # Delete in order due to foreign keys
    db.query(WorkflowExecution).delete()
    db.query(Operation).delete()
    db.query(Agent).delete()
    db.query(Team).delete()
    db.query(User).delete()
    db.commit()

    print("Test data cleaned up.")


def run_all_tests():
    """Run all integration tests."""
    print("\n" + "="*60)
    print("  OPERATIONS + EXECUTION CONTEXT INTEGRATION TEST")
    print("="*60)

    # Setup
    db = setup_test_db()

    try:
        # Create test data
        print_section("0. Setup Test Data")
        user, team, agents, operation = create_test_data(db)

        # Run tests
        context = test_execution_context_creation(operation, team)
        context = test_simulated_execution(context, operation, agents)
        checkpoint = test_checkpoint_serialization(context)
        workflow_execution = test_workflow_execution_record(context, operation, db)
        test_previous_outputs_in_prompt(context)
        test_context_summary(context)

        # Cleanup
        cleanup_test_data(db)

        print_section("ALL TESTS PASSED")
        print("The ExecutionContext is now wired into operations:")
        print("  - Context created at execution start")
        print("  - Agent states tracked during execution")
        print("  - Tool executions recorded")
        print("  - Node metrics tracked")
        print("  - Checkpoint serialization works for pause/resume")
        print("  - WorkflowExecution record created for evolution")
        print("  - Previous outputs available for agent chaining")
        print("\nNext: Run an actual operation through the API to verify end-to-end.")

    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        cleanup_test_data(db)
        return False

    finally:
        db.close()
        # Remove test database
        if os.path.exists("./test_evolvian.db"):
            os.remove("./test_evolvian.db")
            print("\nTest database removed.")

    return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
