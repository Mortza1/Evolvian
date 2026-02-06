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
- [x] Wire ToolExecutor into agent execution loop (Phase 1.2) - DONE 2026-02-06
- [ ] Add more tools: email_sender, slack_sender, image_generator, database_query

### 1.2 Agent Execution - Context-Aware Agents

**Status**: ✅ MOSTLY COMPLETE

Agents now receive full context and can use real tools during execution.

**Tasks**:
- [x] Agent prompt includes: previous node outputs, knowledge context, available tools
- [x] Agent can emit tool calls in structured format (`<tool_call>` XML)
- [x] Agent output parsed for tool_calls (parse_tool_calls_from_response)
- [x] Agent state properly recorded in `ExecutionContext.agent_states`
- [x] Agents can chain - Node B sees Node A's full output
- [ ] Agent output parsed for: assumptions, learnings (structured extraction)
- [ ] Agent self-reflection / quality self-check before returning output

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

**Status**: ✅ CORE COMPLETE

Evo now queries EvolutionService when designing workflows and uses historical performance data to inform prompt design.

**Implemented**:
- `core/utils.py` — Shared `infer_task_type()` utility (extracted from operations.py)
- `routers/evo.py` — `_build_evolution_context()` queries stats, best workflow, and suggestions
- `evo_service.py` — `EVOLUTION_CONTEXT_PROMPT` template + `_format_evolution_context()` method
- `analyze_task()` and `suggest_workflow()` accept `evolution_context` param, inject into LLM prompts
- All 3 evo endpoints (`/analyze`, `/workflow`, `/quick-task`) wired to pass evolution context
- `evolution_context` field added to `EvoTaskAnalysisResponse` and `EvoWorkflowResponse` schemas
- Frontend: "Evolution-Informed Design" banner in TaskCreationFlow.tsx (shows past execution count + avg quality)

**Tasks**:
- [x] When Evo designs a workflow, query EvolutionService for similar past executions
- [x] Suggest proven workflows/agents to Evo before it designs from scratch
- [x] Show evolution stats in UI (evolution-informed banner with past execution count and avg quality)
- [ ] "Use this team again" - save successful team composition for task type
- [ ] Auto-select best workflow for recurring task types

### 1.4 Quality Feedback - Close the Loop (Hybrid Approach)

**Status**: ✅ COMPLETE

Evolution needs quality signals. Using a **3-layer hybrid scoring system**:

**Layer 1: Proxy Metrics (automated, immediate)** — `QualityEvaluator.compute_proxy_score()`
- Output length, execution time, tool usage count, node completion rate
- Cheap, always available, but weak signal

**Layer 2: LLM-as-Judge (automated, post-execution)** — `QualityEvaluator.evaluate_output()`
- Separate LLM call evaluates output quality on dimensions: relevance, completeness,
  specificity, actionability, coherence
- Returns 0-1 score + short rationale
- Runs automatically after each execution — no user action needed

**Layer 3: User Ratings (manual, optional, strongest signal)** — `POST /operations/{id}/rate`
- 1-5 stars + text feedback via API
- Stored in WorkflowExecution
- When available, recalculates hybrid score

**Combined fitness score** (`QualityEvaluator.compute_hybrid_score()`):
```
If user_rating exists:
  quality = 0.6 * user_rating_normalized + 0.3 * llm_judge_score + 0.1 * proxy_score
Else:
  quality = 0.7 * llm_judge_score + 0.3 * proxy_score
```

**Tasks**:
- [x] Create `QualityEvaluator` service with `evaluate_output()` (LLM-as-judge) - DONE 2026-02-06
- [x] Add `llm_judge_score`, `llm_judge_rationale`, `proxy_score` fields to WorkflowExecution - DONE 2026-02-06
- [x] Call QualityEvaluator automatically after execution completes in operations.py - DONE 2026-02-06
- [x] `user_rating` (1-5) and `user_feedback` (text) fields already exist in WorkflowExecution
- [x] API endpoint: POST /operations/{id}/rate (accepts rating + feedback) - DONE 2026-02-06
- [x] Update EvolutionService fitness calculation to use hybrid scoring - DONE 2026-02-06
- [x] Frontend: "Rate this output" UI after operation completes (WarRoomLive.tsx) - DONE 2026-02-06
- [ ] Track which agents/workflows get consistently good ratings

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
- [x] ExecutionEvaluator - automated quality scoring (done as QualityEvaluator)
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
- `core/tools/` - Tool system (done)
- `core/runtime/quality_evaluator.py` - QualityEvaluator (done)
- `routers/operations.py` - Execution endpoint + rating API

**Frontend Core**:
- `web/components/operations/WarRoomLive.tsx` - Execution theatre + rating UI
- `web/lib/services/workflows/workflow.service.ts` - API client (incl. rateOperation)
- `web/components/operations/` - Operation UI
- `web/lib/api.ts` - Base API client

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Base Infrastructure | ✅ Done | 100% |
| ExecutionContext | ✅ Done | 100% |
| MemoryBridge | ✅ Done | 100% |
| EvolutionService | ✅ Done | 100% |
| **Tool System** | ✅ Done | 90% |
| **Context-Aware Agents** | ✅ Mostly Done | 85% |
| **Team Reuse** | ✅ Core Done | 75% |
| **Quality Feedback** | ✅ Done | 95% |
| Developer Portal | ❌ Deferred | 0% |
| Marketplace | ❌ Deferred | 0% |

**Overall Base Completion: ~90%**

Tools are wired in, quality feedback loop is closed end-to-end. Agents use real tools, outputs are auto-evaluated by LLM-as-judge, users can rate outputs via the Execution Theatre UI, and evolution uses hybrid scoring. Evo now queries past performance when designing workflows and shows evolution context in the UI. Remaining Phase 1 items: agent self-reflection (1.2), "use this team again" UX (1.3), and tracking consistently good agents/workflows (1.4).

**Note**: New DB columns (`proxy_score`, `llm_judge_score`, `llm_judge_rationale`) need `ALTER TABLE` on existing SQLite DBs. Run the migration or recreate the DB. Server restart required after code changes.

---

*Last Updated: 2026-02-06*

---

## Recent Changes

**2026-02-06**: Implemented Team Reuse / Evolution Feedback Loop (Phase 1.3)
- Created `core/utils.py` with shared `infer_task_type()` (extracted from operations.py)
- Added `_build_evolution_context()` to evo router — queries EvolutionService for stats, best workflow, suggestions
- Added `EVOLUTION_CONTEXT_PROMPT` template + `_format_evolution_context()` to EvoService
- Updated `analyze_task()` and `suggest_workflow()` to accept and inject evolution context into LLM prompts
- All 3 evo endpoints (`/analyze`, `/workflow`, `/quick-task`) now pass evolution data
- Added `evolution_context` field to `EvoTaskAnalysisResponse` and `EvoWorkflowResponse` schemas
- Frontend: "Evolution-Informed Design" indigo banner in TaskCreationFlow.tsx
- Fully backward compatible — no evolution data = identical behavior to before

**2026-02-06**: Implemented Quality Feedback System (Phase 1.4) — Full Stack
- Created `QualityEvaluator` service (`core/runtime/quality_evaluator.py`)
- 3-layer hybrid scoring: proxy metrics + LLM-as-judge + user ratings
- LLM-as-judge evaluates on 5 dimensions (relevance, completeness, specificity, coherence, quality)
- Auto-runs after every execution — no user action needed for evolution to work
- Added `proxy_score`, `llm_judge_score`, `llm_judge_rationale` fields to WorkflowExecution
- POST `/operations/{id}/rate` endpoint for user ratings (1-5 stars + feedback)
- Updated EvolutionService to use hybrid quality scores throughout (selection, stats, comparison)
- Frontend: Interactive star rating UI in WarRoomLive.tsx (Execution Theatre)
  - 5-star hover + click rating, optional feedback textarea, submit to API
  - Shows updated quality score % after submission
- Added `rateOperation()` to `workflow.service.ts`
- All 22 existing tests pass

**2026-02-06**: Wired Real Tool Execution into Agent Loop (Phase 1.1 + 1.2)
- Replaced 42 lines of simulated tool usage with real tool execution
- Multi-turn tool loop (max 5 iterations) when tools are installed
- Agent prompts now include tool descriptions with `<tool_call>` XML format
- Falls back to `simple_chat()` when no tools installed (backward compatible)
- `InstalledTool.total_calls` / `total_cost` updated after each tool use
- `ToolExecutor._record_execution()` auto-creates ToolState in ExecutionContext
- Added 22 tests covering helpers, DB loading, multi-turn loop, backward compat
- Improved vault file viewer: full-screen overlay with rendered markdown

**2025-02-05**: Implemented Tool System (Phase 1.1)
- Created `core/tools/` module with EvolvianTool base class
- Implemented ToolRegistry for managing available tools
- Implemented ToolExecutor for running tools within ExecutionContext
- Built 4 working tools: web_search, web_scrape, code_executor, file_reader
- Tools output OpenAI-compatible function schemas for LLM integration
- Code executor has security sandbox (blocked dangerous imports/operations)
