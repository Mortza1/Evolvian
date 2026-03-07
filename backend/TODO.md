# Evolvian Dissertation — Implementation TODO

## Context

**Research Question**: Does adding hierarchical team-based orchestration to a self-evolving multi-agent framework improve task performance on complex, multi-step problems compared to flat workflow orchestration?

**What we're building**: A hierarchical team orchestration layer that extends EvoAgentX's workflow layer. This is a **research implementation** — terminal-based, no frontend needed. All code lives in `backend/` and directly extends classes from `../evoAgentX/evoagentx/`.

**Three experimental configurations**:
- **Config A**: Vanilla EvoAgentX (flat workflow, baseline)
- **Config B**: Hierarchical EvoAgentX WITHOUT evolution (isolates hierarchy effect)
- **Config C**: Hierarchical EvoAgentX WITH evolution (TextGrad/AFlow + hierarchy)

**Four benchmarks**: HotPotQA (F1), GAIA (Accuracy), MATH (Solve Rate), MBPP (pass@1)

---

## Current State → Dissertation Gap

The existing Evolvian backend is a **web platform** (FastAPI + SQLAlchemy + SSE). It has its own ExecutionContext, EvolutionService, QualityEvaluator, ToolExecutor, etc. — but these are designed for a SaaS product, not for extending EvoAgentX's internals.

**For the dissertation, we need to**:
1. Work directly with EvoAgentX's classes (`WorkFlowGraph`, `Agent`, `AgentManager`, `WorkFlow`, etc.)
2. Add new classes inside/alongside the EvoAgentX framework (Team, HierarchicalWorkFlowGraph, etc.)
3. Use EvoAgentX's evaluation framework (`Evaluator`, `Benchmark`) for rigorous benchmarking
4. Use EvoAgentX's optimizers (`TextGradOptimizer`, `AFlowOptimizer`) for evolution experiments
5. Run everything from terminal — no web server needed

**What we can reuse from current backend**:
- LLM service patterns (OpenRouter integration)
- Understanding of agent prompting and tool execution
- Quality evaluation concepts
- General architecture knowledge

**What we build fresh**:
- All hierarchical classes extending EvoAgentX directly
- Benchmark harnesses using EvoAgentX's evaluation framework
- Team configurations per benchmark
- Terminal-based runner scripts

---

---

## Current Status (2026-02-27)

### ✅ Completed
| Phase | Items | Test Count |
|-------|-------|-----------|
| Phase 0.1 — Environment setup | All done | — |
| Phase 0.2.1 — HotPotQA baseline (Config A smoke test) | Done (F1=0.067, 5 examples) | — |
| Phase 1 — Team, DelegationPolicy, EscalationRule, HierarchicalAgent, HierarchicalAgentManager | All done | **43 passing** |
| Phase 2.1 — HierarchicalWorkFlowGraph | All done | **18 passing** |
| Phase 2.2-2.4 — SupervisorDecomposer, DelegationEngine, SupervisorReviewer | All done | **20 passing** |
| Phase 3.1 — HierarchicalWorkFlow (execution, escalation, cross-team handoff, trace) | All done | — |
| Phase 3.2 — Integration tests | 18 tests written + passing (in isolation) | **18 passing** |

**Total: 99 tests — all passing together in full suite** ✅

### 🔲 Up Next
- [x] ~~Fix asyncio issue in `test_supervisor.py`~~ → **all 99 tests pass together** ✅
- [x] Phase 4.1 — HotPotQA team configuration (`benchmarks/hotpotqa_teams.py`) ✅
- [x] Phase 4.2 — GAIA team configuration (`benchmarks/gaia_teams.py`) ✅
- [x] Phase 4.3 — MATH team configuration (`benchmarks/math_teams.py`) ✅
- [x] Phase 4.4 — MBPP team configuration (`benchmarks/mbpp_teams.py`) ✅
- [x] Phase 4.5 — Common benchmark runner (`benchmarks/base_runner.py`, `HierarchicalEvaluator`) ✅
- [x] Phase 5.1 — Config A evaluation harness (`evaluation/run_baseline.py`) ✅ (already done)
- [x] Phase 5.2 — Config B evaluation harness (`evaluation/run_hierarchical.py`) ✅
- [x] Phase 5.3 — Config C evaluation harness (`evaluation/run_hierarchical_evo.py`, `HierarchicalEvolutionOptimiser`) ✅
- [x] Phase 5.4 — Cost tracking (`scripts/cost_tracker.py`, `CostTracker`) ✅
- [x] `scripts/run_experiment.py` — wired Configs B + C, added `--costs` flag ✅
- [x] Phase 6 — Statistical comparison + tables (`evaluation/compare_results.py`) ✅

---

## Phase 0: Environment Setup & Baseline Reproduction
> **Goal**: Verify EvoAgentX works, reproduce published baselines, understand the codebase deeply.

### 0.1 — Set Up Development Environment
- [x] **0.1.1**: Create a clean Python virtual environment for the dissertation work
  ```
  cd backend/
  python -m venv .venv-dissertation
  source .venv-dissertation/bin/activate
  ```
- [x] **0.1.2**: Install EvoAgentX as an editable package
  ```
  cd ../evoAgentX
  pip install -e .
  ```
  Verify imports work: `python -c "from evoagentx.agents import Agent, CustomizeAgent; from evoagentx.workflow import WorkFlowGraph, WorkFlow; print('OK')"`
- [x] **0.1.3**: Install all benchmark dependencies (datasets, evaluation metrics)
  ```
  pip install datasets rouge-score # for HotPotQA
  pip install human-eval           # for MBPP/HumanEval
  ```
- [x] **0.1.4**: Configure LLM API keys in `.env`
  - Primary: OpenRouter (budget-friendly, supports GPT-4o-mini)
  - Set up `LiteLLMConfig` or `OpenRouterConfig` pointing to `gpt-4o-mini` (cheapest capable model for budget control)
  - Test with a simple agent call to verify LLM connectivity
- [x] **0.1.5**: Create the dissertation project structure inside `backend/`
  ```
  backend/
  ├── dissertation/                    # All dissertation code lives here
  │   ├── __init__.py
  │   ├── config.py                    # LLM configs, budget caps, model selection
  │   ├── hierarchy/                   # New hierarchical classes
  │   │   ├── __init__.py
  │   │   ├── team.py                  # Team, DelegationPolicy, EscalationRule
  │   │   ├── hierarchical_graph.py    # HierarchicalWorkFlowGraph
  │   │   ├── supervisor.py            # Supervisor decomposition/review logic
  │   │   └── execution.py             # Extended WorkFlow for hierarchical execution
  │   ├── benchmarks/                  # Benchmark team configs & runners
  │   │   ├── __init__.py
  │   │   ├── hotpotqa_teams.py        # HotPotQA team structure
  │   │   ├── gaia_teams.py            # GAIA multi-team structure
  │   │   ├── math_teams.py            # MATH team structure
  │   │   ├── mbpp_teams.py            # MBPP team structure
  │   │   └── base_runner.py           # Shared evaluation runner logic
  │   ├── evaluation/                  # Evaluation harnesses
  │   │   ├── __init__.py
  │   │   ├── run_baseline.py          # Config A: vanilla EvoAgentX
  │   │   ├── run_hierarchical.py      # Config B: hierarchy, no evolution
  │   │   ├── run_hierarchical_evo.py  # Config C: hierarchy + evolution
  │   │   └── compare_results.py       # Statistical comparison & tables
  │   ├── results/                     # Raw results storage (gitignored)
  │   │   └── .gitkeep
  │   ├── scripts/                     # CLI entry points
  │   │   ├── run_experiment.py        # Main CLI: python -m dissertation.scripts.run_experiment
  │   │   ├── reproduce_baseline.py    # Reproduce EvoAgentX published numbers
  │   │   └── cost_tracker.py          # Track API costs per experiment
  │   └── tests/                       # Unit tests for new classes
  │       ├── test_team.py
  │       ├── test_hierarchical_graph.py
  │       ├── test_delegation.py
  │       ├── test_escalation.py
  │       └── test_execution.py
  ```

### 0.2 — Reproduce EvoAgentX Baselines (Config A)
- [x] **0.2.1**: Run HotPotQA with vanilla EvoAgentX
  - Use EvoAgentX's existing `HotPotQA` benchmark class (`evoagentx/benchmark/hotpotqa.py`)
  - Use `Evaluator` class (`evoagentx/evaluators/evaluator.py`) with a flat `WorkFlowGraph`
  - 50 validation examples, 100 test examples
  - Record: F1, EM, accuracy, total API calls, total tokens, wall-clock time
  - **Implementation**: Create `backend/dissertation/scripts/reproduce_baseline.py`
    ```python
    from evoagentx.benchmark.hotpotqa import HotPotQA
    from evoagentx.evaluators.evaluator import Evaluator
    from evoagentx.workflow import WorkFlowGraph, WorkFlow
    from evoagentx.agents import CustomizeAgent, AgentManager
    from evoagentx.models.model_configs import OpenRouterConfig

    # 1. Load benchmark
    benchmark = HotPotQA()
    test_data = benchmark.get_test_data(sample_k=100, seed=42)

    # 2. Build flat workflow (single QA agent)
    # Follow EvoAgentX's published configuration

    # 3. Run evaluation
    evaluator = Evaluator()
    results = evaluator.evaluate(workflow_graph, benchmark, test_data)

    # 4. Save results to dissertation/results/baseline_hotpotqa.json
    ```
  - **Key**: Match published EvoAgentX numbers (±5%) to validate our setup
- [ ] **0.2.2**: Run GAIA baseline (if dataset accessible)
  - GAIA may require special dataset access — check availability first
  - If unavailable, note this and proceed with other benchmarks
- [ ] **0.2.3**: Run MATH baseline
  - Use `evoagentx/benchmark/math_benchmark.py`
  - Same protocol: 50 val, 100 test, record all metrics
- [ ] **0.2.4**: Run MBPP baseline
  - Use `evoagentx/benchmark/mbpp.py`
  - Same protocol
- [ ] **0.2.5**: Document all baseline numbers in `dissertation/results/baselines.json`
  - Format: `{benchmark: {metric: value, api_calls: N, tokens: N, time_s: N}}`
  - These are our Config A numbers for the final comparison table

### 0.3 — Deep Code Annotation
- [ ] **0.3.1**: Read and annotate EvoAgentX's execution loop
  - **File**: `evoagentx/workflow/workflow.py` — `WorkFlow.async_execute()` (line 61-109)
  - Understand: How `get_next_task()` schedules nodes, how agents execute, how state flows
  - Document: The exact points where we'll inject hierarchy logic
- [ ] **0.3.2**: Read and annotate the Agent execution path
  - **File**: `evoagentx/agents/agent.py` — `Agent.async_execute()` (line 168-229)
  - Understand: How actions are called, how context extraction works, how memory is used
  - This is critical for understanding how supervisor agents will call sub-agents
- [ ] **0.3.3**: Read and annotate the optimization pipeline
  - **Files**: `evoagentx/optimizers/textgrad_optimizer.py`, `aflow_optimizer.py`
  - Understand: What gets optimized (prompts? graph structure?), how evaluation feedback feeds back
  - Key question: How will TextGrad/AFlow handle the new hierarchical graph?

---

## Phase 1: Core Data Models (Team, Delegation, Escalation)
> **Goal**: Implement the foundational classes that define hierarchical teams.

### 1.1 — Implement Team Class
**File**: `backend/dissertation/hierarchy/team.py`

- [x] **1.1.1**: Define `DelegationPolicy` dataclass
  ```python
  from enum import Enum
  from pydantic import BaseModel, Field
  from typing import List, Optional

  class DelegationStrategy(str, Enum):
      ROUND_ROBIN = "round_robin"
      CAPABILITY_MATCH = "capability_match"  # Match subtask skills to worker skills
      LOAD_BALANCE = "load_balance"          # Assign to least-busy worker
      SUPERVISOR_DECIDES = "supervisor_decides"  # LLM decides per-task

  class DelegationPolicy(BaseModel):
      strategy: DelegationStrategy = DelegationStrategy.CAPABILITY_MATCH
      max_concurrent_per_worker: int = 1
      require_supervisor_decomposition: bool = True  # Supervisor must break task into subtasks
      allow_worker_to_worker: bool = False            # Workers can't delegate to each other
  ```
  - Test: Create policy, verify all strategies are valid enums
  - Test: Default values are sensible

- [x] **1.1.2**: Define `EscalationRule` dataclass
  ```python
  class EscalationAction(str, Enum):
      ESCALATE_TO_SUPERVISOR = "escalate_to_supervisor"
      RETRY_WITH_DIFFERENT_WORKER = "retry_with_different_worker"
      REQUEST_HUMAN_INPUT = "request_human_input"
      FAIL_TASK = "fail_task"

  class EscalationRule(BaseModel):
      condition: str          # e.g., "confidence < 0.6", "error_count > 2", "output_empty"
      action: EscalationAction = EscalationAction.ESCALATE_TO_SUPERVISOR
      max_retries: int = 2
  ```
  - The `condition` field will be evaluated by the supervisor LLM (not programmatically) — the supervisor receives the worker output + the condition text and decides if escalation is warranted
  - Test: Create rules, verify condition/action pairs

- [x] **1.1.3**: Define `ReviewMode` enum
  ```python
  class ReviewMode(str, Enum):
      NONE = "none"                              # No review, trust workers
      SUPERVISOR_REVIEWS_ALL = "supervisor_reviews_all"  # Review every output
      SUPERVISOR_REVIEWS_ON_FLAG = "supervisor_reviews_on_flag"  # Only if worker flags uncertainty
      PEER_REVIEW = "peer_review"                # Another worker reviews
  ```

- [x] **1.1.4**: Define `Team` class
  ```python
  from evoagentx.agents import Agent

  class Team(BaseModel):
      team_id: str
      name: str                                    # e.g., "Research Team"
      supervisor: Agent                             # The managing agent
      workers: List[Agent]                          # Agents that execute subtasks
      scope: List[str] = Field(default_factory=list)  # Task types this team handles
      delegation_policy: DelegationPolicy = Field(default_factory=DelegationPolicy)
      escalation_rules: List[EscalationRule] = Field(default_factory=list)
      review_mode: ReviewMode = ReviewMode.SUPERVISOR_REVIEWS_ALL
  ```
  - **Key design**: Team contains actual EvoAgentX `Agent` instances, not wrappers
  - Test: Create a team with 1 supervisor + 2 workers, verify all fields
  - Test: Team with empty workers list raises validation error
  - Test: Supervisor is a proper Agent instance

- [x] **1.1.5**: Write unit tests for all models
  **File**: `backend/dissertation/tests/test_team.py`
  - Test Team creation with all field combinations
  - Test DelegationPolicy with each strategy
  - Test EscalationRule condition/action validation
  - Test ReviewMode enum values

### 1.2 — Extend EvoAgentX Agent Class
**Approach**: We do NOT modify the evoAgentX source directly. Instead, we create a subclass.

- [x] **1.2.1**: Create `HierarchicalAgent` subclass of EvoAgentX's `Agent`
  **File**: `backend/dissertation/hierarchy/team.py` (same file as Team)
  ```python
  from evoagentx.agents import Agent

  class AgentRole(str, Enum):
      SUPERVISOR = "supervisor"
      WORKER = "worker"
      REVIEWER = "reviewer"
      SPECIALIST = "specialist"

  class HierarchicalAgent(Agent):
      """Agent with role and team awareness for hierarchical workflows."""
      role: AgentRole = AgentRole.WORKER
      team_id: Optional[str] = None
      authority_scope: List[str] = Field(default_factory=list)  # Task types this agent can handle
  ```
  - **Key**: Inherits ALL Agent functionality (LLM, actions, memory, etc.)
  - **Backward compatible**: Can be used anywhere a regular Agent is used
  - Test: HierarchicalAgent works with existing EvoAgentX WorkFlow
  - Test: Role and team_id are properly set
  - Test: Passes `isinstance(agent, Agent)` check

- [x] **1.2.2**: Create `HierarchicalAgentManager` extending `AgentManager`
  **File**: `backend/dissertation/hierarchy/team.py`
  ```python
  from evoagentx.agents import AgentManager

  class HierarchicalAgentManager(AgentManager):
      """AgentManager with team-aware methods."""
      teams: List[Team] = Field(default_factory=list)

      def get_team(self, team_id: str) -> Optional[Team]:
          """Get team by ID."""

      def get_supervisor(self, team_id: str) -> Optional[Agent]:
          """Get the supervisor agent for a team."""

      def get_workers(self, team_id: str) -> List[Agent]:
          """Get all worker agents for a team."""

      def assign_to_team(self, agent: Agent, team_id: str, role: AgentRole):
          """Assign an agent to a team with a specific role."""

      def get_agents_by_scope(self, task_type: str) -> List[Agent]:
          """Get all agents whose authority_scope includes this task type."""
  ```
  - Test: All new methods work correctly
  - Test: Existing AgentManager methods (list_agents, check_agents) still work
  - Test: Team assignment and lookup

### 1.3 — Write All Phase 1 Tests
- [x] **1.3.1**: `test_team.py` — Team, DelegationPolicy, EscalationRule, ReviewMode (43 tests, all passing)
- [x] **1.3.2**: Delegation strategy tests covered inside test_team.py
- [x] **1.3.3**: Escalation rule tests covered inside test_team.py

---

## Phase 2: Hierarchical Workflow Graph
> **Goal**: Build the core graph type that treats teams as first-class nodes.

### 2.1 — Implement HierarchicalWorkFlowGraph
**File**: `backend/dissertation/hierarchy/hierarchical_graph.py`

- [x] **2.1.1**: Define `InterTeamProtocol` enum
  ```python
  class InterTeamProtocol(str, Enum):
      SUPERVISOR_TO_SUPERVISOR = "supervisor_to_supervisor"  # Team A supervisor → Team B supervisor
      DIRECT_HANDOFF = "direct_handoff"                      # Last worker of A → first worker of B
      SHARED_CONTEXT = "shared_context"                      # All outputs available to all teams
  ```

- [x] **2.1.2**: Implement `HierarchicalWorkFlowGraph` extending `WorkFlowGraph`
  ```python
  from evoagentx.workflow import WorkFlowGraph

  class HierarchicalWorkFlowGraph(WorkFlowGraph):
      """
      Workflow graph that supports teams as first-class execution units.

      Instead of just individual agent nodes, this graph can contain Team nodes
      where a supervisor decomposes, delegates, reviews, and aggregates.
      """
      teams: List[Team] = Field(default_factory=list)
      team_graph: Dict[str, List[str]] = Field(default_factory=dict)  # team_id → [dependent_team_ids]
      inter_team_protocol: InterTeamProtocol = InterTeamProtocol.SUPERVISOR_TO_SUPERVISOR
      root_supervisor: Optional[Agent] = None  # Top-level coordinator across teams
  ```
  - **Critical**: Must be compatible with EvoAgentX's `WorkFlow.async_execute()` OR we override the execution method
  - **Approach**: Each Team becomes a "macro-node" in the graph. When `WorkFlow` reaches a team node, it runs the internal delegation-execution-review loop.
  - **Implementation detail**: Override `WorkFlowGraph.get_next_candidate_nodes()` to handle team-level scheduling

- [x] **2.1.3**: Implement team-node creation helpers
  ```python
  def add_team_node(self, team: Team, inputs: List[str], outputs: List[str]):
      """Add a team as a workflow node. The team's supervisor handles execution."""
      # Create a WorkFlowNode whose 'agents' field points to the team's supervisor
      # Store the team reference so the execution engine knows to run the full delegation loop

  def connect_teams(self, from_team_id: str, to_team_id: str):
      """Add a dependency edge between two teams."""
      # Update team_graph
      # Add corresponding WorkFlowEdge between the team nodes
  ```

- [x] **2.1.4**: Implement graph validation
  ```python
  def validate_hierarchy(self) -> bool:
      """Validate the hierarchical graph structure."""
      # Every team has exactly one supervisor
      # No circular team dependencies
      # All workers belong to exactly one team
      # Root supervisor (if set) is not also a team worker
      # All team scopes are covered by at least one worker
  ```

- [x] **2.1.5**: Write unit tests
  **File**: `backend/dissertation/tests/test_hierarchical_graph.py`
  - Test: Create a 1-team hierarchical graph
  - Test: Create a 2-team hierarchical graph with dependency
  - Test: Validation catches circular team dependencies
  - Test: Validation catches team without supervisor
  - Test: Graph serialization/deserialization works (for checkpoint/resume)

### 2.2 — Implement Supervisor Decomposition Logic
**File**: `backend/dissertation/hierarchy/supervisor.py`

- [x] **2.2.1**: Create `SupervisorDecomposer` class
  ```python
  class SupervisorDecomposer:
      """Handles the supervisor's task decomposition step.

      Given a task, uses the supervisor's LLM to break it into subtasks,
      each tagged with required skills/scope for delegation routing.
      """

      def __init__(self, supervisor: Agent, llm_config: LLMConfig):
          self.supervisor = supervisor

      async def decompose(self, task: str, available_workers: List[Agent]) -> List[Subtask]:
          """
          Supervisor decomposes a task into subtasks.

          Returns list of Subtask objects with:
          - description: What the worker should do
          - required_skills: Skills needed (for capability matching)
          - priority: Execution priority
          - dependencies: Which other subtasks must complete first
          """
          # Build prompt with:
          # 1. The task description
          # 2. Available workers and their skills/descriptions
          # 3. Few-shot examples of good decomposition
          # 4. Output format: JSON list of subtasks

          prompt = DECOMPOSITION_PROMPT.format(
              task=task,
              workers=self._format_workers(available_workers),
              examples=DECOMPOSITION_EXAMPLES
          )

          response = await self.supervisor.llm.async_generate(prompt)
          return self._parse_subtasks(response)
  ```
  - **Key design**: The decomposition prompt is part of the research contribution — iterate on it
  - Include 2-3 few-shot examples per benchmark in the prompt
  - Test: Decompose a HotPotQA question → should produce 2-3 subtasks
  - Test: Decompose a GAIA task → should produce 3-5 subtasks across domains

- [x] **2.2.2**: Define `Subtask` dataclass
  ```python
  @dataclass
  class Subtask:
      description: str
      required_skills: List[str]
      priority: int = 0                  # Higher = more important
      dependencies: List[str] = field(default_factory=list)  # IDs of subtasks that must complete first
      assigned_worker: Optional[str] = None  # Filled by delegation engine
      status: str = "pending"
      result: Optional[str] = None
  ```

- [x] **2.2.3**: Create decomposition prompts (generic prompts in supervisor.py; benchmark-specific prompts are Phase 4)
  **File**: `backend/dissertation/hierarchy/prompts.py`
  - `DECOMPOSITION_PROMPT_HOTPOTQA` — examples of multi-hop question decomposition
  - `DECOMPOSITION_PROMPT_GAIA` — examples of multi-step task planning
  - `DECOMPOSITION_PROMPT_MATH` — examples of mathematical problem decomposition
  - `DECOMPOSITION_PROMPT_MBPP` — examples of coding task decomposition
  - These prompts are a **key tunable** — TextGrad can optimize them in Config C

### 2.3 — Implement Delegation Engine
**File**: `backend/dissertation/hierarchy/supervisor.py`

- [x] **2.3.1**: Create `DelegationEngine` class
  ```python
  class DelegationEngine:
      """Routes subtasks to workers based on DelegationPolicy."""

      def __init__(self, policy: DelegationPolicy, workers: List[Agent]):
          self.policy = policy
          self.workers = workers
          self._assignment_counts = {w.name: 0 for w in workers}

      def assign(self, subtask: Subtask) -> Agent:
          """Assign a subtask to the best worker."""
          if self.policy.strategy == DelegationStrategy.CAPABILITY_MATCH:
              return self._capability_match(subtask)
          elif self.policy.strategy == DelegationStrategy.ROUND_ROBIN:
              return self._round_robin()
          elif self.policy.strategy == DelegationStrategy.LOAD_BALANCE:
              return self._load_balance()
          elif self.policy.strategy == DelegationStrategy.SUPERVISOR_DECIDES:
              return self._supervisor_decides(subtask)

      def _capability_match(self, subtask: Subtask) -> Agent:
          """Match subtask required_skills to worker authority_scope/description."""
          # Score each worker by overlap between subtask.required_skills and worker capabilities
          # Return highest-scoring worker

      def _round_robin(self) -> Agent:
          """Simple round-robin assignment."""

      def _load_balance(self) -> Agent:
          """Assign to worker with fewest current assignments."""
  ```
  - Test: Capability match assigns research subtask to research worker
  - Test: Round robin cycles through workers evenly
  - Test: Load balance picks least-busy worker

### 2.4 — Implement Supervisor Review Logic
**File**: `backend/dissertation/hierarchy/supervisor.py`

- [x] **2.4.1**: Create `SupervisorReviewer` class
  ```python
  class SupervisorReviewer:
      """Handles the supervisor's review step after workers complete subtasks."""

      async def review(
          self,
          supervisor: Agent,
          original_task: str,
          subtask_results: List[SubtaskResult],
          review_mode: ReviewMode
      ) -> ReviewDecision:
          """
          Supervisor reviews worker outputs.

          Returns ReviewDecision:
          - approved: bool — all outputs are acceptable
          - feedback: Dict[subtask_id, str] — per-subtask feedback
          - revisions_needed: List[str] — subtask IDs that need revision
          - final_output: Optional[str] — aggregated final answer (if approved)
          """
          if review_mode == ReviewMode.NONE:
              return ReviewDecision(approved=True, final_output=self._aggregate(subtask_results))

          # Build review prompt with:
          # 1. Original task
          # 2. Each subtask + its result
          # 3. Quality criteria
          # 4. Ask supervisor to: approve, request revision, or revise themselves

          prompt = REVIEW_PROMPT.format(
              task=original_task,
              results=self._format_results(subtask_results),
              criteria=QUALITY_CRITERIA
          )

          response = await supervisor.llm.async_generate(prompt)
          return self._parse_review(response)
  ```
  - Test: Supervisor approves good outputs
  - Test: Supervisor rejects low-quality output and provides revision feedback
  - Test: Supervisor aggregates approved outputs into final answer

- [x] **2.4.2**: Define `ReviewDecision` and `SubtaskResult`
  ```python
  @dataclass
  class SubtaskResult:
      subtask_id: str
      worker_name: str
      output: str
      confidence: float  # Worker self-reported confidence (if available)

  @dataclass
  class ReviewDecision:
      approved: bool
      feedback: Dict[str, str] = field(default_factory=dict)
      revisions_needed: List[str] = field(default_factory=list)
      final_output: Optional[str] = None
  ```

---

## Phase 3: Hierarchical Execution Engine
> **Goal**: Make the hierarchical graph actually executable end-to-end.

### 3.1 — Extend WorkFlow for Hierarchical Execution
**File**: `backend/dissertation/hierarchy/execution.py`

- [x] **3.1.1**: Create `HierarchicalWorkFlow` extending EvoAgentX's `WorkFlow`
  ```python
  from evoagentx.workflow import WorkFlow

  class HierarchicalWorkFlow(WorkFlow):
      """Extended WorkFlow that knows how to execute HierarchicalWorkFlowGraph.

      When it encounters a team node, instead of just calling a single agent,
      it runs the full supervisor decompose → delegate → execute → review loop.
      """

      async def _execute_team_node(self, team: Team, task_input: str) -> str:
          """Execute a team node: the full hierarchical delegation cycle."""

          # Step 1: Supervisor decomposes task
          decomposer = SupervisorDecomposer(team.supervisor, ...)
          subtasks = await decomposer.decompose(task_input, team.workers)

          # Step 2: Delegate subtasks to workers
          engine = DelegationEngine(team.delegation_policy, team.workers)
          assignments = {st: engine.assign(st) for st in subtasks}

          # Step 3: Workers execute subtasks
          results = []
          for subtask, worker in assignments.items():
              result = await self._execute_worker_subtask(worker, subtask)

              # Step 3.5: Check escalation rules
              if self._should_escalate(result, team.escalation_rules):
                  result = await self._handle_escalation(
                      team, subtask, result, team.escalation_rules
                  )

              results.append(SubtaskResult(
                  subtask_id=subtask.id,
                  worker_name=worker.name,
                  output=result,
                  confidence=self._extract_confidence(result)
              ))

          # Step 4: Supervisor reviews
          reviewer = SupervisorReviewer()
          review = await reviewer.review(
              team.supervisor, task_input, results, team.review_mode
          )

          # Step 5: Handle revisions if needed (max 2 revision rounds)
          revision_count = 0
          while not review.approved and revision_count < 2:
              for subtask_id in review.revisions_needed:
                  # Re-delegate with feedback
                  ...
              review = await reviewer.review(...)
              revision_count += 1

          return review.final_output
  ```
  - **Critical**: Must integrate with EvoAgentX's existing execution flow
  - Override `_async_execute_task_by_agents()` to detect team nodes and route to `_execute_team_node()`

- [x] **3.1.2**: Implement worker subtask execution
  ```python
  async def _execute_worker_subtask(self, worker: Agent, subtask: Subtask) -> str:
      """Execute a single subtask with a worker agent."""
      # Use the worker's existing execute() method from EvoAgentX
      # Build a proper Action or use CustomizeAgent's prompt-based execution
      # Track execution time, tokens, cost for overhead analysis
  ```

- [x] **3.1.3**: Implement escalation handling
  ```python
  async def _handle_escalation(
      self, team: Team, subtask: Subtask,
      worker_result: str, rules: List[EscalationRule]
  ) -> str:
      """Handle an escalation event."""
      for rule in rules:
          if self._evaluate_condition(rule.condition, worker_result):
              if rule.action == EscalationAction.ESCALATE_TO_SUPERVISOR:
                  # Supervisor takes over the subtask directly
                  return await self._supervisor_direct_execute(team.supervisor, subtask, worker_result)
              elif rule.action == EscalationAction.RETRY_WITH_DIFFERENT_WORKER:
                  # Pick a different worker and retry
                  ...
              elif rule.action == EscalationAction.FAIL_TASK:
                  raise EscalationError(f"Task failed: {rule.condition}")
  ```

- [x] **3.1.4**: Implement cross-team handoff
  ```python
  async def _cross_team_handoff(
      self, from_team: Team, to_team: Team,
      from_output: str, protocol: InterTeamProtocol
  ) -> str:
      """Hand off results from one team to the next."""
      if protocol == InterTeamProtocol.SUPERVISOR_TO_SUPERVISOR:
          # from_team.supervisor's output → to_team.supervisor as input
          return from_output  # Simple: just pass the text
      elif protocol == InterTeamProtocol.SHARED_CONTEXT:
          # All outputs available in shared context
          # Accumulate in environment dict
          ...
  ```

- [x] **3.1.5**: Add comprehensive execution logging (ExecutionTrace in execution.py)
  ```python
  class ExecutionTrace:
      """Records every event in a hierarchical execution for analysis."""
      events: List[Dict] = []

      def log_decomposition(self, supervisor: str, task: str, subtasks: List[Subtask]):
      def log_delegation(self, subtask: str, worker: str, strategy: str):
      def log_execution(self, worker: str, subtask: str, result: str, time_ms: int, tokens: int):
      def log_escalation(self, worker: str, reason: str, action: str):
      def log_review(self, supervisor: str, decision: ReviewDecision):
      def log_handoff(self, from_team: str, to_team: str, protocol: str):

      def to_dict(self) -> Dict:
          """Full trace as JSON for analysis and dissertation figures."""

      def summary(self) -> Dict:
          """Aggregate stats: total_api_calls, total_tokens, total_time_ms, escalation_count, revision_count."""
  ```
  - This trace is **essential for the dissertation**: we need to report overhead (API calls, tokens, time)

### 3.2 — Integration Tests
**File**: `backend/dissertation/tests/test_execution.py` — 18 tests written using MockBaseLLM + SequenceLLM stubs.

- [x] **3.2.1**: End-to-end test: 1-team hierarchical workflow on a single HotPotQA question (7 tests passing)
- [x] **3.2.2**: End-to-end test: 2-team pipeline on a GAIA-like task (2 tests passing after naming fix)
- [x] **3.2.3**: Test escalation path end-to-end (3 tests passing)
- [x] **3.2.4**: Test revision loop (3 tests: 2 passing, 1 in progress — see Known Issues below)

> **Resolved**: Cross-suite asyncio event loop conflict fixed — replaced `asyncio.get_event_loop().run_until_complete()` with `asyncio.run()` in `test_supervisor.py`. All 99 tests pass together.

---

## Phase 4: Benchmark-Specific Team Configurations
> **Goal**: Design and implement the exact team structure for each benchmark.

### 4.1 — HotPotQA Team Configuration
**File**: `backend/dissertation/benchmarks/hotpotqa_teams.py`

- [x] **4.1.1**: Implement HotPotQA team structure
  ```python
  def build_hotpotqa_team(llm_config: LLMConfig) -> HierarchicalWorkFlowGraph:
      """
      HotPotQA Team Structure:
      - Supervisor: Research Coordinator
        Receives multi-hop question, decomposes into sub-questions,
        reviews sub-answers, produces final answer.
      - Worker 1: Retriever Agent
        Searches for evidence relevant to each sub-question.
        Skills: information retrieval, context extraction
      - Worker 2: Reasoning Agent
        Synthesizes evidence into an answer for each sub-question.
        Skills: logical reasoning, evidence synthesis

      Delegation: capability_match
      Review: supervisor_reviews_all
      Escalation: if confidence < 0.5, escalate to supervisor
      """
  ```
  - Define supervisor system prompt emphasizing question decomposition
  - Define retriever system prompt emphasizing evidence extraction
  - Define reasoner system prompt emphasizing evidence-based reasoning
  - Include few-shot examples in decomposition prompt
  - **Collate function**: Format HotPotQA example as input (question + context)
  - **Postprocess function**: Extract final answer from supervisor's aggregated output

### 4.2 — GAIA Team Configuration
**File**: `backend/dissertation/benchmarks/gaia_teams.py`

- [x] **4.2.1**: Implement GAIA multi-team structure
  ```python
  def build_gaia_teams(llm_config: LLMConfig) -> HierarchicalWorkFlowGraph:
      """
      GAIA Multi-Team Structure:
      - Root Supervisor: Task Planner
        Analyzes the complex task, creates multi-step plan,
        coordinates between teams, produces final answer.

      - Team 1 (Research):
        - Supervisor: Research Lead
        - Worker 1: Web Navigator — browses web, extracts info
        - Worker 2: Data Extractor — parses documents, extracts structured data

      - Team 2 (Analysis):
        - Supervisor: Analysis Lead
        - Worker 1: Data Analyst — performs calculations, data analysis
        - Worker 2: File Processor — handles file operations, format conversions

      Inter-team: supervisor_to_supervisor
      Team 1 → Team 2 (research outputs feed into analysis)
      Root supervisor aggregates all team outputs.
      """
  ```
  - This is the most complex structure — 2 teams + root supervisor
  - Most likely to show hierarchy benefit (complex, multi-domain tasks)

### 4.3 — MATH Team Configuration
**File**: `backend/dissertation/benchmarks/math_teams.py`

- [x] **4.3.1**: Implement MATH team structure
  ```python
  def build_math_team(llm_config: LLMConfig) -> HierarchicalWorkFlowGraph:
      """
      MATH Team Structure:
      - Supervisor: Math Strategist
        Reads problem, decides solution approach, delegates steps,
        makes final decision based on solver + verifier feedback.
      - Worker 1: Solver Agent
        Executes the mathematical steps.
      - Worker 2: Verifier Agent
        Checks each step for errors (acts as reviewer).

      Delegation: supervisor_decides (strategist picks approach)
      Review: supervisor_reviews_all
      Escalation: if verifier finds error, escalate to supervisor
      """
  ```

### 4.4 — MBPP Team Configuration
**File**: `backend/dissertation/benchmarks/mbpp_teams.py`

- [x] **4.4.1**: Implement MBPP team structure
  ```python
  def build_mbpp_team(llm_config: LLMConfig) -> HierarchicalWorkFlowGraph:
      """
      MBPP Team Structure:
      - Supervisor: Architect Agent
        Reads spec, designs approach, delegates implementation + testing,
        reviews test results, may request revision.
      - Worker 1: Coder Agent
        Writes the Python implementation.
      - Worker 2: Tester Agent
        Writes tests and validates the code.

      Delegation: supervisor_decides
      Review: supervisor_reviews_all
      Escalation: if tests fail, supervisor requests coder revision with test feedback
      """
  ```

### 4.5 — Common Benchmark Runner
**File**: `backend/dissertation/benchmarks/base_runner.py`

- [x] **4.5.1**: Create reusable benchmark evaluation runner
  ```python
  class BenchmarkRunner:
      """Runs a single benchmark with a given configuration."""

      def __init__(
          self,
          benchmark_name: str,           # "hotpotqa", "gaia", "math", "mbpp"
          config_type: str,              # "A" (baseline), "B" (hierarchical), "C" (hierarchical+evo)
          llm_config: LLMConfig,
          sample_k_val: int = 50,        # Validation sample size
          sample_k_test: int = 100,      # Test sample size
          num_runs: int = 3,             # Number of repeated runs
          seed: int = 42
      ):

      def run(self) -> ExperimentResult:
          """Run the full experiment: num_runs repetitions, record all metrics."""
          results = []
          for run_i in range(self.num_runs):
              # Load benchmark
              # Build workflow (flat or hierarchical based on config_type)
              # Create evaluator
              # Run evaluation
              # Record: metric, api_calls, tokens, time, execution_traces
              results.append(single_run_result)

          return ExperimentResult(
              benchmark=self.benchmark_name,
              config=self.config_type,
              runs=results,
              mean_metric=np.mean([r.metric for r in results]),
              std_metric=np.std([r.metric for r in results]),
              total_api_calls=sum(r.api_calls for r in results),
              total_tokens=sum(r.tokens for r in results)
          )
  ```

---

## Phase 5: Evaluation Harnesses (Configs A, B, C)
> **Goal**: Build the scripts that run each experimental configuration.

### 5.1 — Config A: Vanilla EvoAgentX Baseline
**File**: `backend/dissertation/evaluation/run_baseline.py`

- [ ] **5.1.1**: Implement baseline runner for each benchmark
  - Uses EvoAgentX's flat `WorkFlowGraph` with a single or sequential agent pipeline
  - No hierarchy, no teams — standard EvoAgentX execution
  - Matches EvoAgentX paper's published configuration as closely as possible
  - Saves results to `dissertation/results/config_a/{benchmark}_{run_i}.json`

### 5.2 — Config B: Hierarchical WITHOUT Evolution
**File**: `backend/dissertation/evaluation/run_hierarchical.py`

- [ ] **5.2.1**: Implement hierarchical runner (no evolution)
  - Uses `HierarchicalWorkFlowGraph` with the team structures from Phase 4
  - Uses `HierarchicalWorkFlow` for execution
  - NO TextGrad or AFlow optimization — fixed prompts
  - This isolates the effect of hierarchy alone
  - Saves results to `dissertation/results/config_b/{benchmark}_{run_i}.json`

### 5.3 — Config C: Hierarchical WITH Evolution
**File**: `backend/dissertation/evaluation/run_hierarchical_evo.py`

- [ ] **5.3.1**: Integrate TextGrad optimization with hierarchical workflows
  - TextGrad can optimize: supervisor decomposition prompts, worker system prompts, review criteria
  - **Key question**: EvoAgentX's `TextGradOptimizer` wraps agents as `TextGradAgent` objects — need to ensure it works with `HierarchicalAgent` and the decomposition/review prompts
  - May need to create custom `TextGradVariable` for the supervisor decomposition prompt
  - **Implementation approach**:
    ```python
    # The optimizer sees the hierarchical graph as a workflow with optimizable prompts
    # Each supervisor's decomposition prompt is a Variable
    # Each worker's system prompt is a Variable
    # Each review prompt is a Variable
    # TextGrad computes text gradients and updates these prompts
    ```

- [ ] **5.3.2**: Integrate AFlow optimization with hierarchical workflows
  - AFlow optimizes the graph structure itself — can it modify team composition?
  - **Implementation approach**:
    - Treat team configurations as AFlow operators
    - AFlow can: add/remove workers, change delegation strategy, modify review mode
    - This shows evolution has more "knobs to turn" with hierarchy (supports H3)

- [ ] **5.3.3**: Run Config C experiments
  - Same benchmarks, same sample sizes
  - Use same number of optimization iterations as EvoAgentX paper
  - Track: optimization rounds, prompt changes, graph mutations
  - Saves results to `dissertation/results/config_c/{benchmark}_{run_i}.json`

### 5.4 — Cost Tracking
**File**: `backend/dissertation/scripts/cost_tracker.py`

- [ ] **5.4.1**: Implement API cost tracking
  ```python
  class CostTracker:
      """Tracks all LLM API costs across experiments."""

      total_calls: int = 0
      total_tokens: int = 0
      total_cost_usd: float = 0.0
      budget_cap_usd: float = 50.0  # Adjustable budget cap

      def log_call(self, model: str, input_tokens: int, output_tokens: int):
          """Log a single API call with token counts."""
          cost = self._compute_cost(model, input_tokens, output_tokens)
          self.total_cost_usd += cost
          if self.total_cost_usd > self.budget_cap_usd:
              raise BudgetExceededError(f"Budget cap ${self.budget_cap_usd} exceeded!")

      def report(self) -> Dict:
          """Generate cost report for the dissertation overhead analysis."""
  ```
  - Wrap LLM calls to intercept and track costs
  - Essential for Table 2 in dissertation (overhead analysis)

---

## Phase 6: Results Analysis & Comparison
> **Goal**: Statistical analysis, comparison tables, and dissertation figures.

### 6.1 — Statistical Comparison
**File**: `backend/dissertation/evaluation/compare_results.py`

- [ ] **6.1.1**: Load all results from `dissertation/results/`
- [ ] **6.1.2**: Compute mean and std dev for each config × benchmark
- [ ] **6.1.3**: Run statistical significance tests
  - Paired t-test (or Wilcoxon signed-rank if non-normal) for A vs B, A vs C, B vs C
  - Report p-values, mark significance (* p<0.05, ** p<0.01)
- [ ] **6.1.4**: Generate comparison tables (Table 1: performance, Table 2: overhead)
  ```
  | Benchmark    | Config A (Baseline) | Config B (Hierarchy) | Config C (Hier+Evo) | B vs A Δ    | C vs A Δ    |
  |-------------|--------------------|--------------------|--------------------| ----------- | ----------- |
  | HotPotQA F1 | ___                | ___±___            | ___±___            | +/- ___%    | +/- ___%    |
  | GAIA L1 Acc | ___                | ___±___            | ___±___            | +/- ___%    | +/- ___%    |
  | ...         |                    |                    |                    |             |             |
  ```
- [ ] **6.1.5**: Generate overhead tables
  ```
  | Benchmark | Config A Calls | Config B Calls | Config C Calls | Overhead B vs A | Overhead C vs A |
  ```

### 6.2 — Visualization (Optional but Useful)
- [ ] **6.2.1**: Bar charts comparing configs per benchmark (matplotlib)
- [ ] **6.2.2**: Radar chart showing multi-dimensional comparison
- [ ] **6.2.3**: Execution trace visualization (tree diagram of delegation)

---

## Phase 7: Demo & Documentation
> **Goal**: Build a terminal/Streamlit demo showing the system in action.

### 7.1 — Terminal Demo
**File**: `backend/dissertation/scripts/run_experiment.py`

- [ ] **7.1.1**: Create main CLI entry point
  ```bash
  # Run a single benchmark with a specific config
  python -m dissertation.scripts.run_experiment \
      --benchmark hotpotqa \
      --config B \
      --sample-k 10 \
      --runs 1 \
      --verbose

  # Run all experiments
  python -m dissertation.scripts.run_experiment --all

  # Compare results
  python -m dissertation.scripts.run_experiment --compare
  ```
  - Prints progress to terminal
  - Shows execution traces in verbose mode
  - Saves results to JSON

### 7.2 — Streamlit Demo (Optional)
- [ ] **7.2.1**: Build simple Streamlit app showing:
  - Input: task description
  - Output: hierarchical execution trace (tree view)
  - Side-by-side: flat vs hierarchical execution
  - Metrics dashboard: accuracy, API calls, tokens, time

### 7.3 — Demo Video
- [ ] **7.3.1**: Record 3-5 minute demo video
  - Show: task input → supervisor decomposition → worker execution → review → output
  - Compare: flat execution vs hierarchical for the same task
  - Show: benchmark results comparison

---

## Phase 8: Dissertation Writing Support
> **Goal**: Generate data and figures for the dissertation chapters.

### 8.1 — Technical Chapter Data
- [ ] **8.1.1**: Architecture diagrams (can describe for manual drawing)
  - Class hierarchy diagram (Team, HierarchicalWorkFlowGraph, etc.)
  - Execution flow diagram (decompose → delegate → execute → review → handoff)
  - System architecture diagram (EvoAgentX layers + new hierarchy layer)
- [ ] **8.1.2**: Code listings for key algorithms
  - Supervisor decomposition algorithm
  - Delegation routing algorithm
  - Escalation handling algorithm
  - Review + revision loop

### 8.2 — Evaluation Chapter Data
- [ ] **8.2.1**: All comparison tables (generated by Phase 6)
- [ ] **8.2.2**: Analysis of where hierarchy helped vs hurt
- [ ] **8.2.3**: Ablation study: impact of each hierarchy component
  - Decomposition only (no review) vs full hierarchy
  - Review only (no decomposition) vs full hierarchy
  - Escalation enabled vs disabled

---

## Implementation Priority Order

**Do first (highest impact for dissertation)**:
1. Phase 0 (environment + baselines) — can't start without this
2. Phase 1 (data models) — foundation for everything
3. Phase 2 (hierarchical graph + supervisor logic) — core contribution
4. Phase 3 (execution engine) — makes it runnable
5. Phase 4.1 (HotPotQA teams) — first benchmark to prove concept

**Do next (prove the thesis)**:
6. Phase 5.1-5.2 (Config A + B evaluation) — core comparison
7. Phase 4.2 (GAIA teams) — strongest expected result
8. Phase 6.1-6.4 (statistical analysis) — dissertation tables

**Do if time allows**:
9. Phase 4.3-4.4 (MATH + MBPP teams) — additional evidence
10. Phase 5.3 (Config C with evolution) — supports H3
11. Phase 7 (demo) — nice to have
12. Phase 8 (ablation study) — strengthens findings

**Budget priorities** (if API costs are a concern):
- Use GPT-4o-mini throughout (cheapest capable model)
- Run HotPotQA + GAIA first (most likely to show improvement)
- MATH + MBPP are nice-to-have — two strong results beat four weak ones
- Reduce sample sizes if needed: 30 val / 50 test minimum

---

## Quick Reference: Key EvoAgentX Files to Extend

| What | EvoAgentX File | Our Extension |
|------|---------------|---------------|
| Agent base class | `evoagentx/agents/agent.py` | `HierarchicalAgent` in `hierarchy/team.py` |
| Agent manager | `evoagentx/agents/agent_manager.py` | `HierarchicalAgentManager` in `hierarchy/team.py` |
| Workflow graph | `evoagentx/workflow/workflow_graph.py` | `HierarchicalWorkFlowGraph` in `hierarchy/hierarchical_graph.py` |
| Workflow executor | `evoagentx/workflow/workflow.py` | `HierarchicalWorkFlow` in `hierarchy/execution.py` |
| Evaluator | `evoagentx/evaluators/evaluator.py` | Use directly, pass our graph |
| TextGrad optimizer | `evoagentx/optimizers/textgrad_optimizer.py` | Extend to handle hierarchy prompts |
| AFlow optimizer | `evoagentx/optimizers/aflow_optimizer.py` | Extend to handle team structure mutations |
| HotPotQA benchmark | `evoagentx/benchmark/hotpotqa.py` | Use directly |
| MATH benchmark | `evoagentx/benchmark/math_benchmark.py` | Use directly |
| MBPP benchmark | `evoagentx/benchmark/mbpp.py` | Use directly |
| LLM config | `evoagentx/models/model_configs.py` | Use `OpenRouterConfig` or `LiteLLMConfig` |

---

*Last Updated: 2026-02-27*
*Scope: Dissertation Phase 1 only (backend, terminal-based, no frontend)*
