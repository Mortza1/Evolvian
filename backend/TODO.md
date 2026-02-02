# Evolvian Backend - Implementation Status & TODO

## Overview
This document tracks the implementation status of the Evolvian backend.
The platform uses a hierarchical AI workforce model with Evo as the COO.

**Architecture**: Modular FastAPI with separate routers per domain.

---

## Architecture Assessment (Honest Status)

### What We Have
- ✅ Product layer (teams, agents, marketplace, UI)
- ✅ Workflow abstraction (WorkflowBuilder, WorkflowExecutor)
- ✅ Evo orchestration (analyze, workflow design, chat)
- ✅ SSE execution theatre (real-time streaming)
- ✅ Assumptions inbox (agents ask instead of hallucinate)
- ✅ Knowledge graph CRUD (nodes, edges, basic query)
- ⚠️ EvoAgentX partially integrated (LLM only, not workflows/tools/memory)

### What's Missing (The Real Gaps)
- ✅ **Real cognition loop** - ExecutionContext wired, agents see previous outputs
- ❌ **Real memory usage** - knowledge graph exists but agents don't query it
- 🔄 **Real evolution** - WorkflowExecution records saved, needs selection logic
- ❌ **Real tool grounding** - tools are CRUD, not executable by agents
- ❌ **Real agent identity persistence** - agents are prompts, not characters

### The Problem
Evolvian currently **looks** like an AI company, but it doesn't **think** like one yet.

The vertical intelligence pipeline is thin:
```
Current:  Task → LLM → output (with UI around it)

Needed:   Task → Evo reasoning → Workflow graph → Agent execution
          → Tool usage → Memory read/write → Evaluation → Evolution
          → Next task is better
```

**Priority Shift**: Stop adding horizontal features. Deepen the vertical chain.

---

## CRITICAL - Phase A: Runtime Kernel (Priority: HIGHEST)

The missing "brainstem" - one module that owns execution semantics.

### New Module Structure
```
core/runtime/
    __init__.py
    context.py      # ExecutionContext - stateful execution
    kernel.py       # RuntimeKernel - orchestrates everything
    evaluator.py    # ExecutionEvaluator - quality/cost metrics
    memory_bridge.py # MemoryBridge - connects agents to memory
```

### ExecutionContext (context.py) - DONE
Every operation must run inside a context. This is why agents feel stateless.

- [x] `ExecutionContext` class with:
  - `operation_id`, `team_id`
  - `memory: dict` - operation-scoped state
  - `agent_states: dict` - outputs from each agent
  - `tool_states: list` - tool execution results
  - `metrics: ExecutionMetrics` - cost, latency, quality tracking
  - `assumptions: list` - questions asked during execution
  - `knowledge_context: list` - relevant knowledge nodes
  - `node_metrics: dict` - per-node performance tracking
  - `workflow_signature: str` - workflow DNA hash

- [x] Supporting dataclasses: `AgentState`, `ToolState`, `NodeMetrics`, `ExecutionMetrics`
- [x] Context passed to every agent execution (wired into operations.py)
- [x] Context persists across pause/resume (checkpoint serialization)
- [x] Context serializable for checkpointing (`to_checkpoint()`, `from_checkpoint()`)
- [x] Workflow DNA signature computation (`compute_workflow_signature()`)
- [x] Test file: `test_runtime.py` demonstrates all capabilities
- [x] Test file: `test_operations_context.py` verifies integration

### RuntimeKernel (kernel.py)
Single entry point for all execution. Replaces scattered logic in routers/services.

- [ ] `RuntimeKernel` class responsibilities:
  - Create ExecutionContext
  - Attach memory (short-term + long-term)
  - Attach tools (from InstalledTool)
  - Run EvoAgentX workflow
  - Collect metrics
  - Emit SSE events
  - Store execution data
  - Trigger evolution hooks

- [ ] Move execution logic from `routers/operations.py` into kernel
- [ ] Kernel is the only place "intelligence happens"

### ExecutionEvaluator (evaluator.py)
- [ ] `ExecutionEvaluator` class:
  - Calculate quality_score from outputs
  - Track cost per node, per agent
  - Track latency per node
  - Compare against historical benchmarks
  - Generate improvement suggestions

### MemoryBridge (memory_bridge.py)
- [ ] `MemoryBridge` class:
  - `get_short_term(operation_id)` - EvoAgentX ShortTermMemory
  - `get_long_term(team_id)` - Wraps KnowledgeGraph
  - `inject_context(agent, context)` - Prepare agent with memory

---

## CRITICAL - Phase B: Deep EvoAgentX Integration (Priority: HIGHEST)

Stop treating EvoAgentX as optional. It should be the cognitive VM.

### Workflow Adapter (Replace Current Executor)

Current flow:
```
WorkflowBuilder → EvolvianWorkflow → Executor → Agents
```

Target flow:
```
WorkflowBuilder → EvoAgentX WorkFlowGraph → WorkFlow → Evolvian runtime hooks
```

- [ ] Create `core/runtime/workflow_adapter.py`:
  ```python
  from evoagentx.workflow import WorkFlow

  class EvolvianWorkFlowAdapter(WorkFlow):
      def __init__(self, graph, context: ExecutionContext):
          super().__init__(graph=graph)
          self.context = context

      def execute_node(self, node):
          agent = resolve_evolvian_agent(node)
          return agent.execute(self.context, node.inputs)
  ```

- [ ] EvoAgentX controls orchestration, Evolvian controls semantics
- [ ] Preserve SSE streaming through adapter hooks

### Tool Adapter (Map InstalledTool → EvoAgentX Tool)

Create `core/tools/adapter.py`:

- [ ] `EvolvianTool(Tool)` class:
  ```python
  from evoagentx.tools import Tool

  class EvolvianTool(Tool):
      def __init__(self, installed_tool):
          self.name = installed_tool.name
          self.config = installed_tool.config

      def run(self, input):
          return execute_tool_logic(self.config, input)
  ```

- [ ] `ToolRegistry` - maps team tools to EvoAgentX toolkit
- [ ] Dynamic tool injection: `agent.tools = [EvolvianTool(t) for t in team_tools]`
- [ ] Tool execution tracking (calls, costs, errors)

### Agent Execution Update

Modify `EvolvianAgent.execute()` to be context-aware:

- [ ] Agent receives: context, memory, past outputs, assumptions, tools
- [ ] Agent writes to: context.agent_states, context.metrics
- [ ] Agent can query: context.knowledge_context
- [ ] Agent can raise: assumptions (instead of hallucinating)

```python
def execute(self, context: ExecutionContext, inputs):
    prompt = self.build_prompt(context, inputs)
    output = llm.generate(prompt)
    context.agent_states[self.name] = output
    return output
```

---

## CRITICAL - Phase C: Memory Integration (Priority: HIGH)

Stop treating knowledge graph as CRUD. Make agents use it.

### Short-Term Memory (Per Operation)
- [ ] Hook into EvoAgentX `ShortTermMemory`
- [ ] Auto-populate with:
  - `task_goal` - the operation objective
  - `previous_outputs` - context.agent_states
  - `assumptions_answered` - resolved questions
  - `tool_results` - from context.tool_states
- [ ] Pass to agents via MemoryBridge

### Long-Term Memory (Per Team)
- [ ] Create `EvolvianLongTermMemory` wrapper (DO NOT use EvoAgentX LongTermMemory directly)
  ```python
  class EvolvianLongTermMemory:
      def retrieve(self, query: str, team_id: int) -> List[KnowledgeNode]:
          return knowledge_service.search(team_id, query)

      def store(self, node: KnowledgeNode):
          return knowledge_service.create(node)
  ```
- [ ] Inject into EvoAgentX execution
- [ ] Auto-extract entities from operation outputs → knowledge nodes
- [ ] This is how Evolvian absorbs EvoAgentX instead of being swallowed by it

---

## CRITICAL - Phase D: Evolution Engine (Priority: HIGH)

If evolution is postponed, Evolvian will never become Evolvian.

### WorkflowExecution Model (Required for Evolution) - DONE

Not just logging - this is the dataset for evolution.

- [x] Add to `models.py`:
  ```python
  class WorkflowExecution(Base):
      id: int
      operation_id: int
      workflow_signature: str  # Hash of graph + agents + prompts
      team_composition: JSON   # Which agents were used
      agents_used: JSON        # Simple list of agent names
      cost: float
      latency_ms: int
      tokens_used: int
      quality_score: float     # 0.0 - 1.0
      user_rating: int         # 1-5 stars
      user_feedback: str       # Free-form feedback
      node_metrics: JSON       # Per-node performance
      assumptions_raised: int
      assumptions_answered: int
      context_snapshot: JSON   # Full ExecutionContext for replay
      created_at: datetime
  ```

### Workflow DNA Concept - PARTIAL

- [x] Define workflow signature in `ExecutionContext.compute_workflow_signature()`:
  ```python
  workflow_dna = {
      "agents": ["researcher", "analyst", "writer"],
      "prompts": {"researcher": "...", ...},
      "tools": {"researcher": ["search"], ...}
  }
  ```
- [x] Hash DNA for comparison (SHA256, first 16 chars)
- [x] Store with WorkflowExecution (via `workflow_signature` field)
- [ ] Auto-compute signature during workflow execution

### Minimal Evolution Logic (Bayesian, Not Genetic)

Start simple. Forget AFlow for now.

- [ ] `select_best_workflow(task_type)`:
  ```python
  def select_best_workflow(task_type: str) -> WorkflowDNA:
      workflows = db.get_workflows(task_type)
      return max(workflows, key=lambda w: w.quality_score / w.cost)
  ```

- [ ] `mutate_workflow(workflow_dna)`:
  ```python
  def mutate(workflow_dna):
      if random() < 0.3:
          workflow_dna["agents"].append("critic_agent")
      return workflow_dna
  ```

- [ ] Track which mutations improve quality_score
- [ ] Auto-suggest workflow improvements based on data

### Agent Evolution (Make Agents Characters, Not Templates)

- [ ] Agents must have:
  - Personality drift (based on feedback)
  - Specialization drift (based on tasks completed)
  - Prompt evolution (successful prompts reinforced)

- [ ] `evolve_agent_prompt(agent, feedback)`:
  ```python
  agent.prompt = evolve_prompt(agent.prompt, feedback)
  ```

- [ ] Store evolution events in `agent.evolution_history`
- [ ] This is where Evolvian becomes psychologically compelling

### Performance Ontology

The core question: **How does Evolvian know it improved?**

- [ ] Define quality metrics:
  - Task completion rate
  - User satisfaction score
  - Cost efficiency (quality / cost)
  - Speed (quality / latency)
  - Assumption accuracy (assumptions that helped vs confused)

- [ ] Store baselines per task_type
- [ ] Compare new executions against baselines
- [ ] Auto-flag regressions

---

## DONE - Implemented & Working

### Authentication System
- [x] `POST /api/auth/signup` - User registration
- [x] `POST /api/auth/login` - User login with JWT
- [x] `POST /api/auth/logout` - Clear auth cookie
- [x] `GET /api/auth/me` - Get current user
- [x] `GET /api/auth/verify` - Verify token validity

### Team Management
- [x] `POST /api/teams` - Create team
- [x] `GET /api/teams` - List user's teams
- [x] `GET /api/teams/{team_id}` - Get team details
- [x] `PUT /api/teams/{team_id}` - Update team
- [x] `DELETE /api/teams/{team_id}` - Delete team

### Agent Management (Basic CRUD)
- [x] `POST /api/agents` - Create agent
- [x] `GET /api/teams/{team_id}/agents` - List team agents
- [x] `GET /api/agents/{agent_id}` - Get agent details
- [x] `PUT /api/agents/{agent_id}` - Update agent
- [x] `DELETE /api/agents/{agent_id}` - Delete agent

### Chat System
- [x] `POST /api/chat/completion` - Full chat completion
- [x] `POST /api/chat/simple` - Simple single-turn chat
- [x] `POST /api/chat/manager` - Team-context aware chat
- [x] `GET /api/chat/history/{team_id}` - Get chat history

### Evo AI COO Service
- [x] `POST /api/evo/chat` - Chat with Evo
- [x] `POST /api/evo/analyze` - Analyze task → subtasks
- [x] `POST /api/evo/workflow` - Design workflow from analysis
- [x] `POST /api/evo/quick-task` - Combined analyze + workflow

### Operations/Tasks
- [x] `POST /api/operations` - Create operation
- [x] `GET /api/operations?team_id=X` - List team operations
- [x] `GET /api/operations/{operation_id}` - Get operation details
- [x] `PATCH /api/operations/{operation_id}` - Update operation
- [x] `DELETE /api/operations/{operation_id}` - Delete operation
- [x] `POST /api/operations/{id}/execute` - Start workflow execution (SSE)
- [x] `GET /api/operations/{id}/status` - Get execution status
- [x] `POST /api/operations/{id}/pause` - Pause execution
- [x] `POST /api/operations/{id}/resume` - Resume execution
- [x] `POST /api/operations/{id}/cancel` - Cancel execution

### Knowledge Graph / Neural Vault
- [x] `POST /api/knowledge/nodes` - Create knowledge node
- [x] `GET /api/knowledge/nodes?team_id=X` - List nodes for team
- [x] `GET /api/knowledge/nodes/{node_id}` - Get node details
- [x] `PUT /api/knowledge/nodes/{node_id}` - Update node
- [x] `DELETE /api/knowledge/nodes/{node_id}` - Delete node
- [x] `POST /api/knowledge/edges` - Create edge between nodes
- [x] `GET /api/knowledge/graph/{team_id}` - Get full graph for team
- [x] `POST /api/knowledge/query` - RAG query (keyword search, embeddings TODO)

### Tool Marketplace
- [x] `GET /api/tools/catalog` - Get available tools catalog
- [x] `GET /api/tools/installed?team_id=X` - List installed tools
- [x] `POST /api/tools/install` - Install tool for team
- [x] `DELETE /api/tools/{tool_id}/uninstall` - Uninstall tool
- [x] `PUT /api/tools/{tool_id}/configure` - Configure tool settings
- [x] `POST /api/tools/{tool_id}/assign` - Assign tool to agents

### Agent Marketplace
- [x] `GET /api/marketplace/agents` - Browse available agents
- [x] `GET /api/marketplace/agents/{template_id}` - Get agent template
- [x] `POST /api/marketplace/agents/hire` - Hire agent to team
- [x] `GET /api/marketplace/categories` - Get agent categories

### User Preferences
- [x] `GET /api/user/preferences` - Get user preferences
- [x] `PUT /api/user/preferences` - Update preferences
- [x] `GET /api/user/objectives` - Get saved objectives
- [x] `POST /api/user/objectives` - Save objective

### Assumptions Inbox
- [x] `GET /api/assumptions?team_id=X` - List pending assumptions
- [x] `GET /api/assumptions/{id}` - Get assumption details
- [x] `POST /api/assumptions` - Create assumption
- [x] `POST /api/assumptions/{id}/answer` - User answers question
- [x] `POST /api/assumptions/{id}/dismiss` - Dismiss assumption
- [x] `GET /api/assumptions/pending/count` - Badge count for UI

### Core Agent Layer
- [x] `EvolvianAgent` - Wraps EvoAgentX Agent with metadata
- [x] `AgentMetadata` - Role, specialty, level, XP, evolution tracking
- [x] `AgentCapabilities` - Skills, tools, actions
- [x] `AgentRegistry` - Template storage, instance management
- [x] `AgentService` - High-level operations, DB sync
- [x] Built-in agent templates (4 branding agents)

### Workflow Layer
- [x] `WorkflowNode` - Single step with status, inputs/outputs, dependencies
- [x] `WorkflowGraph` - DAG of nodes with dependency tracking
- [x] `EvolvianWorkflow` - Workflow execution wrapper
- [x] `WorkflowBuilder` - Task → workflow decomposition via LLM
- [x] `WorkflowExecutor` - Sequential execution with agent assignment
- [x] `AsyncWorkflowExecutor` - Parallel execution of independent nodes
- [x] `ExecutionResult` - Structured execution output
- [x] `ExecutionRegistry` - Pause/resume/cancel state management

### Execution Theatre
- [x] Real-time SSE streaming from backend
- [x] Live activity log with tool usage
- [x] Node progress visualization
- [x] Agent XP tracking
- [x] LLM call status and output preview

### Frontend Integration
- [x] Agent service layer (types, API client, React hooks)
- [x] Workflow service layer (types, API client, React hooks)
- [x] All major components use backend APIs

---

## DEFERRED - Phase E: Files & Storage (Priority: LOW)

Defer until runtime kernel is complete.

### File Vault
- [ ] `POST /api/files/upload` - Upload file
- [ ] `GET /api/files?team_id=X` - List team files
- [ ] `GET /api/files/{file_id}` - Get file metadata
- [ ] `GET /api/files/{file_id}/download` - Download file
- [ ] `DELETE /api/files/{file_id}` - Delete file
- [ ] `POST /api/files/{file_id}/index` - Index file for RAG

---

## DEFERRED - Phase F: Marketplace Publishing (Priority: LOW)

Creator economy features. Defer until core intelligence works.

### Agent Publishing
- [ ] `POST /api/marketplace/agents/publish` - Publish agent
- [ ] `PUT /api/marketplace/agents/{id}` - Update listing
- [ ] `DELETE /api/marketplace/agents/{id}` - Remove listing
- [ ] `GET /api/marketplace/agents/{id}/analytics` - Usage stats

### Tool Publishing
- [ ] `POST /api/marketplace/tools/publish` - Publish tool
- [ ] Similar CRUD for tool marketplace

### Payment Integration
- [ ] Stripe integration for payouts
- [ ] Per-task pricing calculation
- [ ] Creator commission tracking

---

## Database Models Status

### Implemented (in models.py)
- [x] User - Core user accounts
- [x] Team - User's workspaces
- [x] Agent - AI agents in team
- [x] Operation - Tasks/workflows
- [x] KnowledgeNode - Knowledge graph entities
- [x] InstalledTool - Team's installed tools
- [x] ChatMessage - Conversation history
- [x] Assumption - Clarifying questions from agents
- [x] UserPreference - User settings
- [x] UserObjective - Saved user objectives

### Needed (Critical for Evolution)
- [x] **WorkflowExecution** - Execution metrics and history (DONE - added to models.py)
- [ ] **AgentFeedback** - User feedback on agents

### Needed (Deferred)
- [ ] File - File vault entries
- [ ] MarketplaceAgent - Published agent listings
- [ ] MarketplaceTool - Published tool listings

---

## EvoAgentX Integration Strategy (Revised)

**Goal**: Collapse EvoAgentX into Evolvian, not vice versa.

Target architecture:
```
Evolvian Runtime Kernel
  └── EvoAgentX Engine (embedded)
        ├── WorkFlow (via EvolvianWorkFlowAdapter)
        ├── Agent (via EvolvianAgent)
        ├── Tools (via EvolvianTool adapter)
        └── Memory (via EvolvianLongTermMemory wrapper)
```

If we don't control this, Evolvian becomes just a UI on top of EvoAgentX.

### Integration Phases
1. ✅ **Phase 1**: Use EvoAgentX LLM models only (done - OpenRouter)
2. ✅ **Phase 2**: Build Runtime Kernel with ExecutionContext
   - ✅ ExecutionContext class implemented
   - ✅ WorkflowExecution model added
   - ✅ Context wired into operations.py
   - ✅ Previous agent outputs available for chaining
   - ✅ WorkflowExecution saved after each operation
   - ⏳ RuntimeKernel (full orchestration - optional refactor)
3. ⏳ **Phase 3**: Replace executor with EvolvianWorkFlowAdapter
4. ⏳ **Phase 4**: Map InstalledTool → EvoAgentX Tool
5. ⏳ **Phase 5**: Bridge Memory (short-term + long-term)
6. ⏳ **Phase 6**: Add evolution with WorkflowExecution data

---

## Backend File Structure (Updated)

```
backend/
├── main.py              # App entry, router registration, CORS
├── database.py          # SQLAlchemy engine & session
├── models.py            # All database models
├── schemas.py           # Pydantic request/response schemas
├── auth.py              # JWT authentication logic
├── llm_service.py       # OpenRouter LLM integration
├── evo_service.py       # Evo AI COO service
├── TODO.md              # This file
│
├── core/
│   ├── __init__.py
│   │
│   ├── runtime/         # The Execution Kernel
│   │   ├── __init__.py  # ✅ Module exports
│   │   ├── context.py   # ✅ ExecutionContext (DONE)
│   │   ├── kernel.py    # ⏳ RuntimeKernel (TODO)
│   │   ├── evaluator.py # ⏳ ExecutionEvaluator (TODO)
│   │   ├── memory_bridge.py # ⏳ MemoryBridge (TODO)
│   │   └── workflow_adapter.py # ⏳ EvolvianWorkFlowAdapter (TODO)
│   │
│   ├── tools/           # NEW - Tool Integration
│   │   ├── __init__.py
│   │   └── adapter.py   # EvolvianTool adapter
│   │
│   ├── agents/          # Agent domain
│   │   ├── __init__.py
│   │   ├── base.py      # EvolvianAgent (update for context)
│   │   ├── registry.py  # AgentRegistry, AGENT_REGISTRY
│   │   └── service.py   # AgentService
│   │
│   └── workflows/       # Workflow domain
│       ├── __init__.py
│       ├── base.py      # WorkflowNode, WorkflowGraph
│       ├── builder.py   # WorkflowBuilder
│       ├── executor.py  # (Legacy - migrate to kernel)
│       └── execution_state.py # Pause/resume state
│
└── routers/             # API routers (thin layer over kernel)
    ├── __init__.py
    ├── auth.py
    ├── teams.py
    ├── agents.py
    ├── chat.py
    ├── operations.py    # Delegates to RuntimeKernel
    ├── evo.py
    ├── knowledge.py
    ├── tools.py
    ├── marketplace.py
    ├── assumptions.py
    └── users.py
```

---

## Quick Start

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Frontend
cd web
npm run dev
```

---

## Current Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **LLM**: OpenRouter (DeepSeek, Llama 3.3, others)
- **Frontend**: Next.js 16 + React 19 + Tailwind
- **Agent Framework**: EvoAgentX (deep integration in progress)

---

*Last Updated: 2026-02-02 (ExecutionContext wired into operations.py)*
