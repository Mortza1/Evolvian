# Evolvian - Implementation Status & Roadmap

## Vision

**Evolvian** is a multi-agent task execution platform that:
1. Executes tasks using multiple AI agents with distinct roles
2. Coordinates agent outputs through workflows
3. Improves future performance based on past runs (evolution)
4. Reuses evolved teams for similar tasks

**Key Distinction from EvoAgentX**: Evo (the COO) designs the workflow and selects agents - we don't auto-generate agents. Teams are composed, evolved, and reused.

**Future**: Community-made agents, tool marketplace, developer portal. But first - complete the base.

---

## Current State (What Works)

### Fully Functional
- ✅ User auth, teams, basic CRUD
- ✅ Evo analyzes tasks → creates workflow DAG
- ✅ Workflow execution with SSE streaming (real-time UI updates)
- ✅ Agent registry with templates (marketplace hiring works)
- ✅ ExecutionContext holds state across nodes
- ✅ MemoryBridge connects agents to knowledge graph
- ✅ EvolutionService with Bayesian workflow selection
- ✅ WorkflowExecution records saved for evolution
- ✅ Assumptions inbox (agents ask instead of hallucinate)
- ✅ Frontend: workflow creation, execution theatre, output display

### The Base Works
You can:
1. Describe a task to Evo
2. Evo creates a workflow with agent assignments
3. Execute the workflow
4. See real-time progress and outputs

**But it's shallow** - agents are just LLM prompts, tools aren't executable, and evolution doesn't feed back into workflow design yet.

---

## Phase 1: Complete the Base (CURRENT PRIORITY)

The goal: Make Evolvian actually intelligent, not just look intelligent.

### 1.1 Tool System - Make Tools Executable by Agents

**Status**: ✅ CORE COMPLETE

Tool infrastructure is built. Agents can now call tools that actually execute.

**Implemented** (`core/tools/`):

```
core/tools/
├── __init__.py          # ✅ Module exports
├── base.py              # ✅ EvolvianTool, ToolResult, ToolParameter
├── registry.py          # ✅ ToolRegistry, get_tool_registry()
├── executor.py          # ✅ ToolExecutor, parse_tool_calls_from_response()
└── adapters/
    ├── __init__.py      # ✅
    ├── web_search.py    # ✅ DuckDuckGo search (no API key needed)
    ├── web_scrape.py    # ✅ Fetch & extract web page content
    ├── code_executor.py # ✅ Sandboxed Python execution
    └── file_reader.py   # ✅ Read from Neural Vault
```

**Completed Tasks**:
- [x] Define `EvolvianTool` base class with execute interface
- [x] Create `ToolRegistry` to manage available tools per team
- [x] Create `ToolExecutor` that runs tools and tracks results in context
- [x] Implement core tools: web_search, web_scrape, code_executor, file_reader
- [x] Store tool results in `ExecutionContext.tool_states`
- [x] Track tool costs (cost_per_call on each tool)
- [x] Tool schemas in OpenAI function-calling format

**Remaining Tasks**:
- [ ] Wire ToolExecutor into agent execution loop (Phase 1.2)
- [ ] Add more tools: email_sender, slack_sender, image_generator, database_query

### 1.2 Agent Execution - Context-Aware Agents

**Status**: ⚠️ PARTIAL

Agents receive context but don't fully use it. Need to:

**Tasks**:
- [ ] Agent prompt includes: previous node outputs, knowledge context, available tools
- [ ] Agent can emit tool calls in structured format
- [ ] Agent output parsed for: main_output, tool_calls, assumptions, learnings
- [ ] Agent state properly recorded in `ExecutionContext.agent_states`
- [ ] Agents can chain - Node B sees Node A's full output

**Agent Execution Flow**:
```
1. Build prompt with context (previous outputs, knowledge, tools)
2. Call LLM
3. Parse response for tool calls
4. Execute tools if needed
5. Continue or return final output
6. Store state in ExecutionContext
```

### 1.3 Team Reuse - Evolution Feedback Loop

**Status**: ⚠️ PARTIAL (EvolutionService exists but not integrated into workflow design)

**Current**: EvolutionService can select best workflows, but Evo doesn't use this when designing new workflows.

**Tasks**:
- [ ] When Evo designs a workflow, query EvolutionService for similar past executions
- [ ] Suggest proven workflows/agents to Evo before it designs from scratch
- [ ] "Use this team again" - save successful team composition for task type
- [ ] Show evolution stats in UI (this workflow performed X% better than average)
- [ ] Auto-select best workflow for recurring task types

### 1.4 Quality Feedback - Close the Loop

**Status**: ❌ NOT STARTED

Evolution needs quality signals. Currently `quality_score` is estimated, not measured.

**Tasks**:
- [ ] Add "Rate this output" UI after operation completes (1-5 stars + feedback)
- [ ] Store `user_rating` and `user_feedback` in WorkflowExecution
- [ ] Use real ratings in EvolutionService fitness calculation
- [ ] Track which agents/workflows get consistently good ratings
- [ ] Surface "top performing" workflows in UI

---

## Phase 2: Developer Features (DEFERRED)

After the base works, enable developers to create custom agents and tools.

### 2.1 Agent Creation Portal

**Status**: ❌ NOT STARTED

A developer section in the UI to create custom agents.

**Features**:
- [ ] Agent designer: name, role, specialty, prompt template
- [ ] Test agent in sandbox before deploying
- [ ] Version control for agent prompts
- [ ] Assign tools/capabilities to custom agents
- [ ] Private agents (team-only) vs public (marketplace)

**Location**: Settings → Developer → Create Agent

### 2.2 Tool Creation Portal

**Status**: ❌ NOT STARTED

Let developers define custom tools.

**Features**:
- [ ] Tool designer: name, description, parameter schema
- [ ] Tool types: API endpoint, code snippet, webhook
- [ ] Test tool execution
- [ ] Assign to agents

### 2.3 Team Templates

**Status**: ❌ NOT STARTED

Save entire team compositions as templates.

**Features**:
- [ ] "Save this team as template"
- [ ] Template includes: agents, their tools, workflow patterns
- [ ] Reuse template for new projects
- [ ] Share templates (later - marketplace)

---

## Phase 3: Marketplace & Community (DEFERRED)

Full creator economy. Only after Phases 1-2 are solid.

### 3.1 Agent Marketplace

- [ ] Publish custom agents to marketplace
- [ ] Browse community agents by category
- [ ] Ratings and reviews
- [ ] Usage analytics for creators
- [ ] Revenue sharing (paid agents)

### 3.2 Tool Marketplace

- [ ] Publish custom tools
- [ ] Tool categories (search, code, data, integration)
- [ ] API key management for tools
- [ ] Usage-based pricing

### 3.3 Workflow Marketplace

- [ ] Publish proven workflows
- [ ] "Workflow recipes" for common tasks
- [ ] Import workflows with required agents/tools

---

## Technical Debt & Improvements

### Should Fix Soon
- [ ] RuntimeKernel - consolidate execution logic (currently scattered in operations.py)
- [ ] Better error handling in workflow execution
- [ ] Proper logging throughout execution pipeline
- [ ] Database migrations (currently recreating DB)

### Can Wait
- [ ] ExecutionEvaluator - automated quality scoring
- [ ] File vault with RAG indexing
- [ ] Embeddings for knowledge graph search
- [ ] Horizontal scaling (multiple workers)

---

## Architecture Reference

### Current Flow
```
User describes task
    ↓
Evo analyzes → creates workflow DAG
    ↓
User confirms, starts execution
    ↓
WorkflowExecutor runs nodes sequentially
    ↓
Each node: agent prompt → LLM → output
    ↓
SSE streams progress to frontend
    ↓
WorkflowExecution saved for evolution
```

### Target Flow (Phase 1 Complete)
```
User describes task
    ↓
Evo checks EvolutionService for proven workflows  ← NEW
    ↓
Evo designs workflow (using proven patterns)      ← IMPROVED
    ↓
WorkflowExecutor runs nodes
    ↓
Each node:
  - Build prompt with context + tools            ← NEW
  - Agent calls LLM
  - Parse for tool calls                         ← NEW
  - Execute tools, continue until done           ← NEW
  - Store full state in ExecutionContext
    ↓
User rates output                                 ← NEW
    ↓
WorkflowExecution saved with real quality score
    ↓
EvolutionService learns, improves next run       ← IMPROVED
```

### Key Files

**Backend Core**:
- `core/runtime/context.py` - ExecutionContext (done)
- `core/runtime/evolution.py` - EvolutionService (done)
- `core/runtime/memory_bridge.py` - MemoryBridge (done)
- `core/tools/` - Tool system (TODO)
- `routers/operations.py` - Execution endpoint

**Frontend Core**:
- `web/src/components/operations/` - Operation UI
- `web/src/components/workflow/` - Workflow visualization
- `web/src/lib/api.ts` - API client

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Base Infrastructure | ✅ Done | 100% |
| ExecutionContext | ✅ Done | 100% |
| MemoryBridge | ✅ Done | 100% |
| EvolutionService | ✅ Done | 100% |
| **Tool System** | ✅ Core Done | 80% |
| **Context-Aware Agents** | ⚠️ Partial | 30% |
| **Team Reuse** | ⚠️ Partial | 20% |
| **Quality Feedback** | ❌ Not Started | 0% |
| Developer Portal | ❌ Deferred | 0% |
| Marketplace | ❌ Deferred | 0% |

**Overall Base Completion: ~60%**

Tools now have executable implementations. Next step: wire tools into agent execution so agents can actually call them during workflow runs.

---

*Last Updated: 2025-02-05*

---

## Recent Changes

**2025-02-05**: Implemented Tool System (Phase 1.1)
- Created `core/tools/` module with EvolvianTool base class
- Implemented ToolRegistry for managing available tools
- Implemented ToolExecutor for running tools within ExecutionContext
- Built 4 working tools: web_search, web_scrape, code_executor, file_reader
- Tools output OpenAI-compatible function schemas for LLM integration
- Code executor has security sandbox (blocked dangerous imports/operations)
