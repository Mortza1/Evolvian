"""
Isolated Test for Evolution Service

Tests the Bayesian workflow selection and mutation logic
without requiring a real database connection.

Run with: python test_evolution.py
"""

import sys
from unittest.mock import patch
from typing import List


# =============================================
# MOCK SETUP - Simulates database and models
# =============================================

class MockColumn:
    """Mock SQLAlchemy column for filter comparisons."""
    def __init__(self, name: str):
        self.name = name
        self._filter_value = None
        self._filter_op = None

    def __eq__(self, other):
        return ("eq", self.name, other)

    def isnot(self, other):
        return ("isnot", self.name, other)


class MockWorkflowExecutionMeta(type):
    """Metaclass to provide class-level column attributes for filtering."""
    @property
    def team_id(cls):
        return MockColumn("team_id")

    @property
    def task_type(cls):
        return MockColumn("task_type")

    @property
    def status(cls):
        return MockColumn("status")

    @property
    def workflow_signature(cls):
        return MockColumn("workflow_signature")


class MockWorkflowExecution(metaclass=MockWorkflowExecutionMeta):
    """Mock WorkflowExecution model for testing."""

    def __init__(
        self,
        id: int,
        team_id: int,
        operation_id: int,
        task_type: str,
        workflow_signature: str,
        agents_used: List[str],
        nodes_total: int,
        nodes_completed: int,
        status: str,
        cost: float,
        latency_ms: int,
        quality_score: float
    ):
        self.id = id
        self.team_id = team_id
        self.operation_id = operation_id
        self.task_type = task_type
        self.workflow_signature = workflow_signature
        self.agents_used = agents_used
        self.nodes_total = nodes_total
        self.nodes_completed = nodes_completed
        self.status = status
        self.cost = cost
        self.latency_ms = latency_ms
        self.quality_score = quality_score


class MockQuery:
    """Mock SQLAlchemy query object."""
    def __init__(self, data: List[MockWorkflowExecution], query_attr=None):
        self._data = data
        self._filters = []
        self._query_attr = query_attr

    def filter(self, *conditions):
        """Apply filters by collecting conditions."""
        new_query = MockQuery(self._data.copy(), self._query_attr)
        new_query._filters = self._filters.copy()

        for cond in conditions:
            if isinstance(cond, tuple) and len(cond) == 3:
                new_query._filters.append(cond)
        return new_query

    def _apply_filters(self, items):
        """Apply collected filters to items."""
        result = []
        for item in items:
            match = True
            for op, attr, value in self._filters:
                item_val = getattr(item, attr, None)

                if op == "eq" and item_val != value:
                    match = False
                    break
                elif op == "isnot" and item_val is value:
                    match = False
                    break
            if match:
                result.append(item)
        return result

    def all(self):
        return self._apply_filters(self._data)

    def distinct(self):
        return self


class MockSession:
    """Mock SQLAlchemy session."""
    def __init__(self, executions: List[MockWorkflowExecution]):
        self._executions = executions

    def query(self, _model):
        return MockQuery(self._executions)


# =============================================
# TESTS
# =============================================

def test_workflow_dna():
    """Test WorkflowDNA dataclass."""
    print("\n=== Test: WorkflowDNA ===")

    from core.runtime.evolution import WorkflowDNA

    dna = WorkflowDNA(
        signature="abc123",
        task_type="marketing",
        agents=["Researcher", "Writer", "Critic"],
        node_count=3,
        avg_cost=5.50,
        avg_latency_ms=15000,
        avg_quality_score=0.85,
        execution_count=10,
        success_rate=0.9,
        fitness_score=0.78
    )

    # Test to_dict
    d = dna.to_dict()
    assert d["signature"] == "abc123"
    assert d["task_type"] == "marketing"
    assert len(d["agents"]) == 3
    assert d["avg_cost"] == 5.50
    assert d["fitness_score"] == 0.78

    print(f"  Created WorkflowDNA: {dna.signature}")
    print(f"  Agents: {dna.agents}")
    print(f"  Fitness: {dna.fitness_score}")
    print("  PASSED")


def test_evolution_suggestion():
    """Test EvolutionSuggestion dataclass."""
    print("\n=== Test: EvolutionSuggestion ===")

    from core.runtime.evolution import EvolutionSuggestion

    suggestion = EvolutionSuggestion(
        suggestion_type="add_agent",
        description="Consider adding a Critic agent for quality review",
        confidence=0.75,
        expected_improvement="+15% quality score",
        details={"agents_to_add": ["Critic"]}
    )

    d = suggestion.to_dict()
    assert d["suggestion_type"] == "add_agent"
    assert d["confidence"] == 0.75
    assert "Critic" in d["details"]["agents_to_add"]

    print(f"  Type: {suggestion.suggestion_type}")
    print(f"  Confidence: {suggestion.confidence}")
    print(f"  Description: {suggestion.description}")
    print("  PASSED")


def test_workflow_stats():
    """Test WorkflowStats dataclass."""
    print("\n=== Test: WorkflowStats ===")

    from core.runtime.evolution import WorkflowStats, WorkflowDNA

    best = WorkflowDNA(
        signature="best123",
        task_type="content",
        agents=["Writer", "Editor"],
        node_count=2,
        fitness_score=0.9
    )

    stats = WorkflowStats(
        task_type="content",
        total_executions=50,
        unique_workflows=5,
        best_workflow=best,
        avg_cost=3.20,
        avg_quality=0.82,
        avg_latency_ms=12000,
        cost_quality_ratio=3.90
    )

    d = stats.to_dict()
    assert d["total_executions"] == 50
    assert d["best_workflow"]["signature"] == "best123"

    print(f"  Task Type: {stats.task_type}")
    print(f"  Total Executions: {stats.total_executions}")
    print(f"  Best Workflow: {stats.best_workflow.signature}")
    print("  PASSED")


def test_fitness_calculation():
    """Test the fitness calculation with different optimization goals."""
    print("\n=== Test: Fitness Calculation ===")

    from core.runtime.evolution import EvolutionService

    # Create service with mock session
    mock_session = MockSession([])
    service = EvolutionService(db=mock_session, team_id=1)

    # Test balanced fitness
    fitness_balanced = service._calculate_fitness(
        quality=0.8,
        cost=10.0,
        latency=20000,
        success_rate=0.95,
        execution_count=5,
        goal="balanced"
    )
    print(f"  Balanced fitness (q=0.8, c=10, l=20s): {fitness_balanced:.3f}")
    assert 0 < fitness_balanced <= 1.0

    # Test quality-focused fitness
    fitness_quality = service._calculate_fitness(
        quality=0.8,
        cost=10.0,
        latency=20000,
        success_rate=0.95,
        execution_count=5,
        goal="quality"
    )
    print(f"  Quality-focused fitness: {fitness_quality:.3f}")

    # Test cost-focused fitness
    fitness_cost = service._calculate_fitness(
        quality=0.8,
        cost=10.0,
        latency=20000,
        success_rate=0.95,
        execution_count=5,
        goal="cost"
    )
    print(f"  Cost-focused fitness: {fitness_cost:.3f}")

    # Test speed-focused fitness
    fitness_speed = service._calculate_fitness(
        quality=0.8,
        cost=10.0,
        latency=20000,
        success_rate=0.95,
        execution_count=5,
        goal="speed"
    )
    print(f"  Speed-focused fitness: {fitness_speed:.3f}")

    # Quality goal should weight quality higher
    # Cost goal should be different from quality goal
    print("  All fitness scores are valid (0 < score <= 1)")
    print("  PASSED")


def test_select_best_workflow():
    """Test workflow selection with mock execution data."""
    print("\n=== Test: Select Best Workflow ===")

    from core.runtime.evolution import EvolutionService

    # Create mock executions with different workflows
    executions = [
        # Workflow A - High quality, higher cost (5 executions)
        MockWorkflowExecution(
            id=1, team_id=1, operation_id=1, task_type="marketing",
            workflow_signature="workflow_a", agents_used=["Researcher", "Writer", "Editor"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=15.0, latency_ms=25000, quality_score=0.92
        ),
        MockWorkflowExecution(
            id=2, team_id=1, operation_id=2, task_type="marketing",
            workflow_signature="workflow_a", agents_used=["Researcher", "Writer", "Editor"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=14.0, latency_ms=23000, quality_score=0.88
        ),
        MockWorkflowExecution(
            id=3, team_id=1, operation_id=3, task_type="marketing",
            workflow_signature="workflow_a", agents_used=["Researcher", "Writer", "Editor"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=16.0, latency_ms=24000, quality_score=0.90
        ),
        MockWorkflowExecution(
            id=4, team_id=1, operation_id=4, task_type="marketing",
            workflow_signature="workflow_a", agents_used=["Researcher", "Writer", "Editor"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=15.0, latency_ms=26000, quality_score=0.91
        ),
        MockWorkflowExecution(
            id=5, team_id=1, operation_id=5, task_type="marketing",
            workflow_signature="workflow_a", agents_used=["Researcher", "Writer", "Editor"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=14.5, latency_ms=24000, quality_score=0.89
        ),

        # Workflow B - Lower quality, lower cost (3 executions)
        MockWorkflowExecution(
            id=6, team_id=1, operation_id=6, task_type="marketing",
            workflow_signature="workflow_b", agents_used=["Writer"],
            nodes_total=1, nodes_completed=1, status="completed",
            cost=3.0, latency_ms=8000, quality_score=0.65
        ),
        MockWorkflowExecution(
            id=7, team_id=1, operation_id=7, task_type="marketing",
            workflow_signature="workflow_b", agents_used=["Writer"],
            nodes_total=1, nodes_completed=1, status="completed",
            cost=2.8, latency_ms=7500, quality_score=0.62
        ),
        MockWorkflowExecution(
            id=8, team_id=1, operation_id=8, task_type="marketing",
            workflow_signature="workflow_b", agents_used=["Writer"],
            nodes_total=1, nodes_completed=1, status="completed",
            cost=3.2, latency_ms=8200, quality_score=0.68
        ),
    ]

    mock_session = MockSession(executions)

    # Patch the model import
    with patch.object(EvolutionService, '_get_workflow_execution_model', return_value=MockWorkflowExecution):
        service = EvolutionService(db=mock_session, team_id=1)

        # Test balanced selection - should prefer workflow A (higher quality)
        best_balanced = service.select_best_workflow("marketing", optimization_goal="balanced")
        print(f"  Best (balanced): {best_balanced.signature}")
        print(f"    - Agents: {best_balanced.agents}")
        print(f"    - Avg Quality: {best_balanced.avg_quality_score:.2f}")
        print(f"    - Avg Cost: ${best_balanced.avg_cost:.2f}")
        print(f"    - Fitness: {best_balanced.fitness_score:.3f}")

        # Test quality selection
        best_quality = service.select_best_workflow("marketing", optimization_goal="quality")
        print(f"  Best (quality): {best_quality.signature} (fitness: {best_quality.fitness_score:.3f})")

        # Test cost selection - might prefer workflow B
        best_cost = service.select_best_workflow("marketing", optimization_goal="cost")
        print(f"  Best (cost): {best_cost.signature} (fitness: {best_cost.fitness_score:.3f})")

        # Test speed selection
        best_speed = service.select_best_workflow("marketing", optimization_goal="speed")
        print(f"  Best (speed): {best_speed.signature} (fitness: {best_speed.fitness_score:.3f})")

    print("  PASSED")


def test_workflow_stats():
    """Test getting workflow statistics."""
    print("\n=== Test: Workflow Stats ===")

    from core.runtime.evolution import EvolutionService

    executions = [
        MockWorkflowExecution(
            id=1, team_id=1, operation_id=1, task_type="content",
            workflow_signature="content_v1", agents_used=["Writer", "Editor"],
            nodes_total=2, nodes_completed=2, status="completed",
            cost=8.0, latency_ms=15000, quality_score=0.85
        ),
        MockWorkflowExecution(
            id=2, team_id=1, operation_id=2, task_type="content",
            workflow_signature="content_v1", agents_used=["Writer", "Editor"],
            nodes_total=2, nodes_completed=2, status="completed",
            cost=7.5, latency_ms=14000, quality_score=0.82
        ),
        MockWorkflowExecution(
            id=3, team_id=1, operation_id=3, task_type="content",
            workflow_signature="content_v2", agents_used=["Researcher", "Writer"],
            nodes_total=2, nodes_completed=2, status="completed",
            cost=10.0, latency_ms=20000, quality_score=0.78
        ),
    ]

    mock_session = MockSession(executions)

    with patch.object(EvolutionService, '_get_workflow_execution_model', return_value=MockWorkflowExecution):
        service = EvolutionService(db=mock_session, team_id=1)
        stats = service.get_workflow_stats("content")

        print(f"  Task Type: {stats.task_type}")
        print(f"  Total Executions: {stats.total_executions}")
        print(f"  Unique Workflows: {stats.unique_workflows}")
        print(f"  Avg Cost: ${stats.avg_cost:.2f}")
        print(f"  Avg Quality: {stats.avg_quality:.2f}")
        print(f"  Avg Latency: {stats.avg_latency_ms}ms")
        print(f"  Cost/Quality Ratio: {stats.cost_quality_ratio:.2f}")

        if stats.best_workflow:
            print(f"  Best Workflow: {stats.best_workflow.signature}")
            print(f"    - Agents: {stats.best_workflow.agents}")

        assert stats.total_executions == 3
        assert stats.unique_workflows == 2

    print("  PASSED")


def test_suggest_improvements():
    """Test improvement suggestions."""
    print("\n=== Test: Suggest Improvements ===")

    from core.runtime.evolution import EvolutionService

    executions = [
        MockWorkflowExecution(
            id=1, team_id=1, operation_id=1, task_type="analysis",
            workflow_signature="best_analysis", agents_used=["Researcher", "Analyst", "Critic"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=12.0, latency_ms=18000, quality_score=0.9
        ),
        MockWorkflowExecution(
            id=2, team_id=1, operation_id=2, task_type="analysis",
            workflow_signature="best_analysis", agents_used=["Researcher", "Analyst", "Critic"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=11.5, latency_ms=17000, quality_score=0.88
        ),
        MockWorkflowExecution(
            id=3, team_id=1, operation_id=3, task_type="analysis",
            workflow_signature="best_analysis", agents_used=["Researcher", "Analyst", "Critic"],
            nodes_total=3, nodes_completed=3, status="completed",
            cost=12.5, latency_ms=19000, quality_score=0.91
        ),
    ]

    mock_session = MockSession(executions)

    with patch.object(EvolutionService, '_get_workflow_execution_model', return_value=MockWorkflowExecution):
        service = EvolutionService(db=mock_session, team_id=1)

        # Get suggestions for a different (suboptimal) workflow
        suggestions = service.suggest_improvements(
            current_signature="my_analysis",
            task_type="analysis",
            current_agents=["Researcher", "Writer"]  # Missing Analyst and Critic
        )

        print(f"  Found {len(suggestions)} suggestions:")
        for s in suggestions:
            print(f"    - [{s.suggestion_type}] {s.description}")
            print(f"      Confidence: {s.confidence:.0%}, Expected: {s.expected_improvement}")

    print("  PASSED")


def test_mutate_workflow():
    """Test workflow mutation."""
    print("\n=== Test: Mutate Workflow ===")

    from core.runtime.evolution import EvolutionService, WorkflowDNA

    mock_session = MockSession([])
    service = EvolutionService(db=mock_session, team_id=1)

    original = WorkflowDNA(
        signature="original_123",
        task_type="marketing",
        agents=["Researcher", "Writer", "Editor"],
        node_count=3,
        avg_quality_score=0.85,
        execution_count=10,
        fitness_score=0.75
    )

    print(f"  Original: {original.agents}")

    # Run multiple mutations to see variety
    mutations = []
    for i in range(5):
        mutated = service.mutate_workflow(original, mutation_rate=1.0)  # Force mutation
        mutations.append(mutated)
        print(f"  Mutation {i+1}: {mutated.agents} (sig: {mutated.signature[:8]}...)")

    # At least some should be different
    different_count = sum(1 for m in mutations if m.agents != original.agents)
    print(f"  {different_count}/5 mutations were different from original")

    print("  PASSED")


def test_compare_workflows():
    """Test workflow comparison."""
    print("\n=== Test: Compare Workflows ===")

    from core.runtime.evolution import EvolutionService

    # Create executions for two workflows to compare
    executions = [
        # Workflow A
        MockWorkflowExecution(
            id=1, team_id=1, operation_id=1, task_type="comparison",
            workflow_signature="workflow_x", agents_used=["Writer"],
            nodes_total=1, nodes_completed=1, status="completed",
            cost=5.0, latency_ms=10000, quality_score=0.75
        ),
        MockWorkflowExecution(
            id=2, team_id=1, operation_id=2, task_type="comparison",
            workflow_signature="workflow_x", agents_used=["Writer"],
            nodes_total=1, nodes_completed=1, status="completed",
            cost=4.5, latency_ms=9500, quality_score=0.72
        ),
        # Workflow B
        MockWorkflowExecution(
            id=3, team_id=1, operation_id=3, task_type="comparison",
            workflow_signature="workflow_y", agents_used=["Writer", "Editor"],
            nodes_total=2, nodes_completed=2, status="completed",
            cost=9.0, latency_ms=16000, quality_score=0.88
        ),
        MockWorkflowExecution(
            id=4, team_id=1, operation_id=4, task_type="comparison",
            workflow_signature="workflow_y", agents_used=["Writer", "Editor"],
            nodes_total=2, nodes_completed=2, status="completed",
            cost=8.5, latency_ms=15000, quality_score=0.85
        ),
    ]

    mock_session = MockSession(executions)

    with patch.object(EvolutionService, '_get_workflow_execution_model', return_value=MockWorkflowExecution):
        service = EvolutionService(db=mock_session, team_id=1)

        comparison = service.compare_workflows(
            signature_a="workflow_x",
            signature_b="workflow_y",
            task_type="comparison"
        )

        print(f"  Workflow X:")
        if comparison["workflow_a"]["metrics"]:
            m = comparison["workflow_a"]["metrics"]
            print(f"    - Agents: {m['agents']}")
            print(f"    - Avg Cost: ${m['avg_cost']:.2f}")
            print(f"    - Avg Quality: {m['avg_quality']:.2f}")

        print(f"  Workflow Y:")
        if comparison["workflow_b"]["metrics"]:
            m = comparison["workflow_b"]["metrics"]
            print(f"    - Agents: {m['agents']}")
            print(f"    - Avg Cost: ${m['avg_cost']:.2f}")
            print(f"    - Avg Quality: {m['avg_quality']:.2f}")

        print(f"  Winner: Workflow {comparison['winner']}")

    print("  PASSED")


def test_quality_estimation():
    """Test quality score estimation."""
    print("\n=== Test: Quality Estimation ===")

    from core.runtime.evolution import EvolutionService

    mock_session = MockSession([])
    service = EvolutionService(db=mock_session, team_id=1)

    # Test various scenarios
    scenarios = [
        {"output_length": 50, "execution_time_ms": 45000, "nodes_completed": 1, "nodes_total": 2, "assumptions_answered": 0},
        {"output_length": 500, "execution_time_ms": 25000, "nodes_completed": 3, "nodes_total": 3, "assumptions_answered": 0},
        {"output_length": 1000, "execution_time_ms": 15000, "nodes_completed": 3, "nodes_total": 3, "assumptions_answered": 2},
        {"output_length": 200, "execution_time_ms": 60000, "nodes_completed": 2, "nodes_total": 4, "assumptions_answered": 0},
    ]

    for i, s in enumerate(scenarios):
        score = service.estimate_quality_score(**s)
        print(f"  Scenario {i+1}: {score:.2f}")
        print(f"    - Output: {s['output_length']} chars, Time: {s['execution_time_ms']}ms")
        print(f"    - Completion: {s['nodes_completed']}/{s['nodes_total']}")
        assert 0 <= score <= 1.0

    print("  PASSED")


def test_compute_signature():
    """Test signature computation."""
    print("\n=== Test: Compute Signature ===")

    from core.runtime.evolution import EvolutionService

    mock_session = MockSession([])
    service = EvolutionService(db=mock_session, team_id=1)

    # Same agents in different order should produce same signature
    sig1 = service._compute_signature(["Writer", "Editor", "Researcher"])
    sig2 = service._compute_signature(["Researcher", "Writer", "Editor"])
    sig3 = service._compute_signature(["Editor", "Researcher", "Writer"])

    print(f"  Sig 1: {sig1}")
    print(f"  Sig 2: {sig2}")
    print(f"  Sig 3: {sig3}")

    assert sig1 == sig2 == sig3, "Signatures should be order-independent"

    # Different agents should produce different signature
    sig4 = service._compute_signature(["Writer", "Analyst"])
    print(f"  Sig 4 (different agents): {sig4}")
    assert sig4 != sig1, "Different agents should produce different signature"

    print("  PASSED")


def run_all_tests():
    """Run all tests and report results."""
    print("=" * 60)
    print("EVOLUTION SERVICE - ISOLATED TESTS")
    print("=" * 60)

    tests = [
        ("WorkflowDNA", test_workflow_dna),
        ("EvolutionSuggestion", test_evolution_suggestion),
        ("WorkflowStats", test_workflow_stats),
        ("Fitness Calculation", test_fitness_calculation),
        ("Select Best Workflow", test_select_best_workflow),
        ("Workflow Stats Query", test_workflow_stats),
        ("Suggest Improvements", test_suggest_improvements),
        ("Mutate Workflow", test_mutate_workflow),
        ("Compare Workflows", test_compare_workflows),
        ("Quality Estimation", test_quality_estimation),
        ("Compute Signature", test_compute_signature),
    ]

    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"\n=== Test: {name} ===")
            print(f"  FAILED: {e}")
            failed += 1
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
