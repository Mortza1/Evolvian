#!/usr/bin/env python3
"""
Test script for the MemoryBridge module.

This tests the memory bridge that connects agents to:
- Short-term memory (per operation)
- Long-term memory (team knowledge graph)

Run this file to verify the memory bridge works:

    cd backend
    python test_memory_bridge.py

This test:
1. Creates test database with knowledge nodes
2. Tests ShortTermMemory operations
3. Tests LongTermMemory (knowledge graph) queries
4. Tests MemoryBridge context building
5. Tests learning extraction and storage
6. Cleans up test data
"""

import sys
import os

# Add parent to path for imports
sys.path.insert(0, '.')

# Set up test database
os.environ["DATABASE_URL"] = "sqlite:///./test_memory.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base

from models import User, Team, KnowledgeNode
from core.runtime import (
    MemoryBridge,
    ShortTermMemory,
    LongTermMemory,
    KnowledgeContext,
    MemoryItem,
)


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def setup_test_db():
    """Create test database and return session."""
    engine = create_engine("sqlite:///./test_memory.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def create_test_data(db):
    """Create test user, team, and knowledge nodes."""
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
        name="Marketing Team",
        description="A team focused on marketing campaigns"
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    print(f"  Created team: {team.name} (ID: {team.id})")

    # Create knowledge nodes of various types
    knowledge_nodes = [
        # Policies
        KnowledgeNode(
            team_id=team.id,
            node_type="policy",
            label="Brand Voice Guidelines",
            description="Always use friendly, professional tone. Avoid jargon. Speak directly to the customer.",
            created_by="admin"
        ),
        KnowledgeNode(
            team_id=team.id,
            node_type="policy",
            label="Content Approval Process",
            description="All external content must be reviewed by marketing lead before publication.",
            created_by="admin"
        ),
        # Entities
        KnowledgeNode(
            team_id=team.id,
            node_type="entity",
            label="Target Customer Persona",
            description="Tech-savvy millennials aged 25-35 who value sustainability and quality.",
            created_by="Brand Strategist"
        ),
        KnowledgeNode(
            team_id=team.id,
            node_type="entity",
            label="Competitor: TechBrand Inc",
            description="Main competitor in the smart home space. Known for aggressive pricing.",
            created_by="Market Researcher"
        ),
        # Decisions
        KnowledgeNode(
            team_id=team.id,
            node_type="decision",
            label="Chose Instagram over Twitter",
            description="Based on audience analysis, Instagram provides better engagement for our target demographic.",
            created_by="Social Media Manager"
        ),
        KnowledgeNode(
            team_id=team.id,
            node_type="decision",
            label="Q4 Campaign Theme: Sustainability",
            description="Focus on eco-friendly messaging to align with brand values and customer preferences.",
            created_by="Brand Strategist"
        ),
        # Risks
        KnowledgeNode(
            team_id=team.id,
            node_type="risk",
            label="Supply Chain Delays",
            description="Current shipping delays may affect product availability for holiday campaign.",
            created_by="Operations"
        ),
        # Concepts
        KnowledgeNode(
            team_id=team.id,
            node_type="concept",
            label="Brand Positioning",
            description="Premium quality at accessible prices. Emphasize value over cheap alternatives.",
            created_by="Brand Strategist"
        ),
    ]

    for node in knowledge_nodes:
        db.add(node)

    db.commit()

    for node in knowledge_nodes:
        db.refresh(node)
        print(f"  Created {node.node_type}: {node.label} (ID: {node.id})")

    return user, team, knowledge_nodes


def test_short_term_memory():
    """Test ShortTermMemory operations."""
    print_section("1. ShortTermMemory (Per-Operation)")

    memory = ShortTermMemory()

    # Add items
    memory.add("task_goal", "Create a marketing campaign for product launch")
    memory.add("target_audience", "Tech-savvy millennials", {"source": "persona"})
    memory.add("budget", 5000.0, {"currency": "USD"})

    print("Added to memory:")
    print(f"  task_goal: {memory.get('task_goal')}")
    print(f"  target_audience: {memory.get('target_audience')}")
    print(f"  budget: {memory.get('budget')}")

    # Check existence
    print(f"\nhas 'task_goal': {memory.has('task_goal')}")
    print(f"has 'missing': {memory.has('missing')}")

    # Get with default
    print(f"get 'missing' with default: {memory.get('missing', 'default_value')}")

    # Get all
    print(f"\nAll items: {memory.get_all()}")

    # Get items with metadata
    print("\nItems with metadata:")
    for item in memory.get_items():
        print(f"  {item.key}: {item.value} (metadata: {item.metadata})")

    # Serialize and restore
    serialized = memory.to_dict()
    print(f"\nSerialized: {len(str(serialized))} chars")

    restored = ShortTermMemory.from_dict(serialized)
    print(f"Restored 'task_goal': {restored.get('task_goal')}")

    # Clear
    memory.clear()
    print(f"\nAfter clear: {memory.get_all()}")

    return True


def test_long_term_memory(db, team):
    """Test LongTermMemory (Knowledge Graph) queries."""
    print_section("2. LongTermMemory (Knowledge Graph)")

    ltm = LongTermMemory(team_id=team.id, db=db)

    # Get by type
    print("Get policies:")
    policies = ltm.get_policies(limit=5)
    for p in policies:
        print(f"  - {p['label']}: {p['description'][:50]}...")

    print("\nGet entities:")
    entities = ltm.get_entities(limit=5)
    for e in entities:
        print(f"  - {e['label']}: {e['description'][:50]}...")

    print("\nGet decisions:")
    decisions = ltm.get_decisions(limit=5)
    for d in decisions:
        print(f"  - {d['label']}: {d['description'][:50]}...")

    # Search
    print("\n\nSearch for 'brand':")
    results = ltm.search("brand", max_results=5)
    for r in results:
        print(f"  - [{r['node_type']}] {r['label']} (score: {r['relevance_score']:.2f})")

    print("\nSearch for 'sustainability':")
    results = ltm.search("sustainability", max_results=5)
    for r in results:
        print(f"  - [{r['node_type']}] {r['label']} (score: {r['relevance_score']:.2f})")

    print("\nSearch for 'Instagram' (specific decision):")
    results = ltm.search("Instagram", max_results=5)
    for r in results:
        print(f"  - [{r['node_type']}] {r['label']} (score: {r['relevance_score']:.2f})")

    # Store new knowledge
    print("\n\nStoring new knowledge...")
    new_node = ltm.store(
        node_type="decision",
        label="Test Decision",
        description="This is a test decision created by the test script.",
        created_by="test_script"
    )
    print(f"  Created: {new_node['label']} (ID: {new_node['id']})")

    return True


def test_knowledge_context(db, team):
    """Test KnowledgeContext building."""
    print_section("3. KnowledgeContext Building")

    bridge = MemoryBridge(team_id=team.id, db=db)

    # Get context for a task
    context = bridge.get_knowledge_context(
        task_description="Create a social media campaign for the holiday season",
        include_policies=True,
        include_entities=True,
        include_decisions=True,
        include_risks=True,
        max_per_type=3
    )

    print("Knowledge context built:")
    print(f"  Policies: {len(context.policies)}")
    for p in context.policies:
        print(f"    - {p['label']}")

    print(f"  Entities: {len(context.entities)}")
    for e in context.entities:
        print(f"    - {e['label']}")

    print(f"  Decisions: {len(context.decisions)}")
    for d in context.decisions:
        print(f"    - {d['label']}")

    print(f"  Risks: {len(context.risks)}")
    for r in context.risks:
        print(f"    - {r['label']}")

    # Convert to prompt section
    print("\n\nPrompt section:")
    print("-" * 40)
    prompt_section = context.to_prompt_section()
    print(prompt_section[:500] + "..." if len(prompt_section) > 500 else prompt_section)
    print("-" * 40)

    return context


def test_memory_bridge_full(db, team):
    """Test full MemoryBridge functionality."""
    print_section("4. MemoryBridge Full Integration")

    # Create bridge with short-term memory
    short_term = ShortTermMemory()
    short_term.add("task_goal", "Create holiday campaign")
    short_term.add("deadline", "2024-12-01")

    bridge = MemoryBridge(team_id=team.id, db=db, short_term=short_term)

    # Access short-term memory through bridge
    print("Short-term memory via bridge:")
    print(f"  task_goal: {bridge.get_short_term('task_goal')}")
    print(f"  deadline: {bridge.get_short_term('deadline')}")

    # Set new short-term value
    bridge.set_short_term("priority", "high")
    print(f"  priority: {bridge.get_short_term('priority')}")

    # Search knowledge
    print("\nKnowledge search via bridge:")
    results = bridge.search_knowledge("campaign", max_results=3)
    for r in results:
        print(f"  - {r['label']} ({r['node_type']})")

    # Build full agent context
    print("\n\nBuilding agent context...")
    agent_context = bridge.build_agent_context(
        agent_name="Content Creator",
        agent_role="Content Creator",
        task_name="Write Campaign Copy",
        task_description="Create engaging social media copy for the holiday campaign",
        previous_outputs={
            "Brand Strategist": "Focus on sustainability and quality. Target millennials who value eco-friendly products.",
            "Market Researcher": "Competitor analysis shows gap in eco-friendly messaging. Opportunity to differentiate."
        }
    )

    print("Agent context (first 800 chars):")
    print("-" * 40)
    print(agent_context[:800] + "..." if len(agent_context) > 800 else agent_context)
    print("-" * 40)

    return bridge


def test_learning_extraction(db, team):
    """Test learning extraction and storage."""
    print_section("5. Learning Extraction & Storage")

    bridge = MemoryBridge(team_id=team.id, db=db)

    # Simulate agent output
    agent_output = """
    Based on my analysis, I recommend focusing on Instagram and TikTok for this campaign.

    Key findings:
    1. Our target audience (millennials) spends 2+ hours daily on these platforms
    2. Short-form video content has 3x higher engagement than static images
    3. Sustainability messaging resonates strongly - 78% of target audience prefers eco-friendly brands

    Recommended approach:
    - Create 15-second reels showcasing product sustainability features
    - Partner with micro-influencers who focus on sustainable living
    - Use hashtags: #SustainableLiving #EcoFriendly #QualityMatters
    """

    print("Agent output to extract learnings from:")
    print(f"  Length: {len(agent_output)} chars")
    print(f"  Preview: {agent_output[:100]}...")

    # Extract and store learnings
    stored = bridge.extract_and_store_learnings(
        agent_name="Social Media Strategist",
        task_name="Platform Analysis",
        output=agent_output,
        auto_extract=True
    )

    print(f"\nStored learnings: {len(stored)}")
    for node in stored:
        print(f"  - [{node['node_type']}] {node['label']}")
        print(f"    Created by: {node['created_by']}")
        print(f"    Description: {node['description'][:100]}...")

    # Verify it's searchable
    print("\nVerifying stored learning is searchable...")
    results = bridge.search_knowledge("Platform Analysis", max_results=3)
    for r in results:
        print(f"  - {r['label']} (score: {r['relevance_score']:.2f})")

    return True


def test_empty_knowledge_graph(db, team):
    """Test behavior with limited knowledge."""
    print_section("6. Edge Cases")

    # Create a new team with no knowledge
    empty_team = Team(
        user_id=1,  # Use existing user
        name="Empty Team",
        description="A team with no knowledge nodes"
    )
    db.add(empty_team)
    db.commit()
    db.refresh(empty_team)

    bridge = MemoryBridge(team_id=empty_team.id, db=db)

    # Get context for empty team
    context = bridge.get_knowledge_context(
        task_description="Test task",
        include_policies=True,
        include_entities=True
    )

    print(f"Empty team context:")
    print(f"  is_empty: {context.is_empty()}")
    print(f"  policies: {len(context.policies)}")
    print(f"  entities: {len(context.entities)}")

    prompt_section = context.to_prompt_section()
    print(f"  prompt_section: '{prompt_section}'")

    # Cleanup
    db.delete(empty_team)
    db.commit()

    print("\nEmpty team handled gracefully!")

    return True


def cleanup_test_data(db):
    """Clean up test data."""
    print_section("7. Cleanup")

    db.query(KnowledgeNode).delete()
    db.query(Team).delete()
    db.query(User).delete()
    db.commit()

    print("Test data cleaned up.")


def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print("  MEMORY BRIDGE TEST")
    print("="*60)

    # Setup
    db = setup_test_db()

    try:
        # Create test data
        print_section("0. Setup Test Data")
        user, team, knowledge_nodes = create_test_data(db)

        # Run tests
        test_short_term_memory()
        test_long_term_memory(db, team)
        test_knowledge_context(db, team)
        test_memory_bridge_full(db, team)
        test_learning_extraction(db, team)
        test_empty_knowledge_graph(db, team)

        # Cleanup
        cleanup_test_data(db)

        print_section("ALL TESTS PASSED")
        print("The MemoryBridge provides:")
        print("  - ShortTermMemory: Per-operation key-value store")
        print("  - LongTermMemory: Team knowledge graph queries")
        print("  - KnowledgeContext: Aggregated knowledge for prompts")
        print("  - build_agent_context(): Full context string for agents")
        print("  - extract_and_store_learnings(): Auto-store insights")
        print("\nNext: Wire MemoryBridge into operations.py execution")

    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        cleanup_test_data(db)
        return False

    finally:
        db.close()
        # Remove test database
        if os.path.exists("./test_memory.db"):
            os.remove("./test_memory.db")
            print("\nTest database removed.")

    return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
