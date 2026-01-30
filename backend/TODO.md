# Evolvian Backend - Implementation Status & TODO

## Overview
This document tracks the implementation status of the Evolvian backend APIs.
The platform uses a hierarchical AI workforce model with Evo as the COO.

**Architecture**: Modular FastAPI with separate routers per domain (see File Structure below).

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

---

## DONE - Phase 1: Basic CRUD (Completed)

### Knowledge Graph / Neural Vault
- [x] `POST /api/knowledge/nodes` - Create knowledge node
- [x] `GET /api/knowledge/nodes?team_id=X` - List nodes for team
- [x] `GET /api/knowledge/nodes/{node_id}` - Get node details
- [x] `PUT /api/knowledge/nodes/{node_id}` - Update node
- [x] `DELETE /api/knowledge/nodes/{node_id}` - Delete node
- [x] `POST /api/knowledge/edges` - Create edge between nodes
- [x] `GET /api/knowledge/graph/{team_id}` - Get full graph for team
- [x] `POST /api/knowledge/query` - RAG query against graph (simple keyword search, embeddings TODO)

### Tool Marketplace (Store)
- [x] `GET /api/tools/catalog` - Get available tools catalog (static for now)
- [x] `GET /api/tools/installed?team_id=X` - List installed tools
- [x] `POST /api/tools/install` - Install tool for team
- [x] `DELETE /api/tools/{tool_id}/uninstall` - Uninstall tool
- [x] `PUT /api/tools/{tool_id}/configure` - Configure tool settings
- [x] `POST /api/tools/{tool_id}/assign` - Assign tool to agents

### Agent Marketplace
- [x] `GET /api/marketplace/agents` - Browse available agents (static templates)
- [x] `GET /api/marketplace/agents/{template_id}` - Get agent template details
- [x] `POST /api/marketplace/agents/hire` - Hire agent to team from template
- [x] `GET /api/marketplace/categories` - Get agent categories

### User Preferences
- [x] `GET /api/user/preferences` - Get user preferences
- [x] `PUT /api/user/preferences` - Update preferences
- [x] `GET /api/user/objectives` - Get saved objectives
- [x] `POST /api/user/objectives` - Save objective

---

## DONE - Phase 2: Assumptions Inbox (Completed)

Core Evolvian feature - agents ask clarifying questions instead of hallucinating.

- [x] `GET /api/assumptions?team_id=X` - List pending assumptions
- [x] `GET /api/assumptions/{id}` - Get assumption details
- [x] `POST /api/assumptions` - Create assumption (agent asks question)
- [x] `POST /api/assumptions/{id}/answer` - User answers question
- [x] `POST /api/assumptions/{id}/dismiss` - Dismiss assumption
- [x] `GET /api/assumptions/pending/count` - Badge count for UI

---

## IN PROGRESS - Phase 3: Agent Execution (Priority: HIGH)

Connect to EvoAgentX framework for actual agent execution.

### Core Agent Layer (DONE)
- [x] `EvolvianAgent` - Wraps EvoAgentX Agent with Evolvian metadata
- [x] `AgentMetadata` - Role, specialty, level, XP, evolution tracking
- [x] `AgentCapabilities` - Skills, tools, actions
- [x] `AgentRegistry` - Template storage, instance management, factory
- [x] `AgentService` - High-level operations, DB sync
- [x] Built-in agent templates (6 agents)
- [x] Simple execution via llm_service
- [x] Full EvoAgentX execution (optional, needs deps)

### Workflow Layer (DONE)
- [x] `WorkflowNode` - Single step with status, inputs/outputs, dependencies
- [x] `WorkflowGraph` - DAG of nodes with dependency tracking
- [x] `EvolvianWorkflow` - Workflow execution wrapper
- [x] `WorkflowBuilder` - Evo's brain: task → workflow decomposition via LLM
- [x] `WorkflowExecutor` - Sequential execution with agent assignment
- [x] `AsyncWorkflowExecutor` - Parallel execution of independent nodes
- [x] `ExecutionResult` - Structured execution output

### Workflow API Endpoints (TODO)
- [ ] `POST /api/operations/{id}/execute` - Start workflow execution
- [ ] `GET /api/operations/{id}/status` - Get execution status
- [ ] `POST /api/operations/{id}/pause` - Pause execution
- [ ] `POST /api/operations/{id}/resume` - Resume execution
- [ ] `POST /api/operations/{id}/cancel` - Cancel execution
- [ ] WebSocket `/ws/operations/{id}` - Real-time execution updates

### Remaining EvoAgentX Integration (TODO)
- [x] Bridge Evolvian Agent model → EvoAgentX Agent class
- [x] Connect WorkFlowGraph to operations (via WorkflowBuilder)
- [ ] Map team tools → EvoAgentX Toolkit
- [ ] Implement agent short-term memory per operation
- [ ] Implement long-term memory per team (knowledge graph)

---

## TODO - Phase 4: Evolution & Learning (Priority: MEDIUM)

The "self-optimizing" part of Evolvian.

### Agent Evolution
- [ ] `POST /api/agents/{id}/feedback` - Submit feedback on agent
- [ ] `GET /api/agents/{id}/evolution` - Get evolution history
- [ ] Track XP and level progression
- [ ] Trigger specialization updates based on tasks
- [ ] Implement AFlow-style workflow optimization

### Workflow Optimization
- [ ] Store benchmark data per workflow type
- [ ] Auto-tune prompts based on feedback
- [ ] Track cost/quality metrics
- [ ] Suggest workflow improvements

---

## TODO - Phase 5: Files & Storage (Priority: MEDIUM)

### File Vault
- [ ] `POST /api/files/upload` - Upload file
- [ ] `GET /api/files?team_id=X` - List team files
- [ ] `GET /api/files/{file_id}` - Get file metadata
- [ ] `GET /api/files/{file_id}/download` - Download file
- [ ] `DELETE /api/files/{file_id}` - Delete file
- [ ] `POST /api/files/{file_id}/index` - Index file for RAG

---

## TODO - Phase 6: Marketplace Publishing (Priority: LOW)

Creator economy features.

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

### Needed
- [ ] File - File vault entries
- [ ] MarketplaceAgent - Published agent listings (for creator economy)
- [ ] MarketplaceTool - Published tool listings (for creator economy)
- [ ] AgentFeedback - User feedback on agents
- [ ] WorkflowExecution - Execution state/history

---

## Integration Notes

### EvoAgentX Integration Points

The EvoAgentX framework (in `/evoAgentX/`) provides:

1. **Agent Classes** (`evoagentx/agents/`)
   - `Agent` - Base LLM-powered agent
   - `ActionAgent` - Custom function wrapper
   - `AgentManager` - Agent lifecycle
   - `TaskPlanner` - Goal → subtasks
   - `AgentGenerator` - Auto-create agents

2. **Workflow System** (`evoagentx/workflow/`)
   - `WorkFlowGenerator` - Goal → workflow DAG
   - `WorkFlow` - Execution engine
   - `WorkFlowGraph` - DAG structure

3. **Tools** (`evoagentx/tools/`)
   - 35+ tools: search, file, browser, database, code execution

4. **Memory** (`evoagentx/memory/`)
   - `ShortTermMemory` - Per-workflow
   - `LongTermMemory` - Persistent RAG

5. **Optimizers** (`evoagentx/optimizers/`)
   - `AFlowOptimizer` - Evolutionary workflow optimization

### Integration Strategy

1. **Phase 1**: Use EvoAgentX LLM models only (done - OpenRouter)
2. **Phase 2**: Add workflow execution via WorkFlow class
3. **Phase 3**: Connect tools to InstalledTool model
4. **Phase 4**: Use LongTermMemory for knowledge graph
5. **Phase 5**: Add AFlow optimization for workflows

---

## DONE - Frontend Dynamic Integration (Completed)

Connected frontend components to backend APIs via service layer.

### Agent Service Layer (web/lib/services/agents/)
- [x] `types.ts` - TypeScript interfaces (Agent, AgentTemplate, HiredAgent, etc.)
- [x] `agent.service.ts` - API client (getMarketplaceAgents, hireAgent, getTeamAgents, etc.)
- [x] `useAgents.ts` - React hooks (useMarketplace, useTeamAgents, useAgents)
- [x] `index.ts` - Module exports

### Workflow Service Layer (web/lib/services/workflows/)
- [x] `types.ts` - TypeScript interfaces (WorkflowNode, WorkflowGraph, ExecutionResult, etc.)
- [x] `workflow.service.ts` - API client (analyzeTask, buildWorkflow, executeWorkflow, etc.)
- [x] `useWorkflows.ts` - React hooks (useBuildWorkflow, useExecuteWorkflow, useWorkflowGraph)
- [x] `index.ts` - Module exports

### Updated Components
- [x] `TalentHubView.tsx` - Uses useMarketplace() hook for agent marketplace
- [x] `OfficeView.tsx` - Uses useTeamAgents() hook for hired agents display
- [x] `AgentEvolutionModal.tsx` - Uses agentService.submitFeedback() API
- [x] `AgentSuggestionCards.tsx` - Uses useTeamAgents() + agentService.hireAgent()
- [x] `InboxView.tsx` - Uses useTeamAgents() for specialist contacts
- [x] `WorkflowVisualizer.tsx` - Updated to use WorkflowDesign/WorkflowGraph types
- [x] `tasks.ts` - Updated with TaskWorkflowNode type and proper mapping

### Not Updated (Self-contained)
- [ ] `ManagerMarketplaceModal.tsx` - Uses hardcoded manager data (acceptable for demo)
- [ ] `SpecialistRecruitment.tsx` - Uses hardcoded specialist data (acceptable for demo)

---

## Current Tech Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **LLM**: OpenRouter (DeepSeek, others)
- **Frontend**: Next.js 16 + React 19 + Tailwind
- **Agent Framework**: EvoAgentX (to be integrated)

---

## Backend File Structure

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
├── core/                # EvoAgentX primitives (extracted)
│   ├── __init__.py
│   ├── agents/          # Agent domain
│   │   ├── __init__.py
│   │   ├── base.py      # EvolvianAgent, AgentMetadata, AgentCapabilities
│   │   ├── registry.py  # AgentRegistry, AgentTemplate, AGENT_REGISTRY
│   │   └── service.py   # AgentService, agent_service singleton
│   │
│   └── workflows/       # Workflow domain
│       ├── __init__.py
│       ├── base.py      # WorkflowNode, WorkflowGraph, EvolvianWorkflow
│       ├── builder.py   # WorkflowBuilder (Evo's task decomposition brain)
│       └── executor.py  # WorkflowExecutor, AsyncWorkflowExecutor
│
└── routers/             # Modular API routers
    ├── __init__.py      # Router exports
    ├── auth.py          # /api/auth/* endpoints
    ├── teams.py         # /api/teams/* endpoints
    ├── agents.py        # /api/agents/* endpoints
    ├── chat.py          # /api/chat/* endpoints
    ├── operations.py    # /api/operations/* endpoints
    ├── evo.py           # /api/evo/* endpoints
    ├── knowledge.py     # /api/knowledge/* endpoints
    ├── tools.py         # /api/tools/* endpoints
    ├── marketplace.py   # /api/marketplace/* endpoints
    ├── assumptions.py   # /api/assumptions/* endpoints
    └── users.py         # /api/user/* endpoints
```

---

## Frontend File Structure (Key Files)

```
web/
├── lib/
│   ├── tasks.ts                 # Task/operation API client
│   └── services/
│       ├── api/
│       │   └── client.ts        # Base API client (fetch wrapper)
│       ├── agents/              # Agent service module
│       │   ├── index.ts         # Module exports
│       │   ├── types.ts         # TypeScript interfaces
│       │   ├── agent.service.ts # API methods
│       │   └── useAgents.ts     # React hooks
│       └── workflows/           # Workflow service module
│           ├── index.ts         # Module exports
│           ├── types.ts         # WorkflowNode, WorkflowGraph, ExecutionResult
│           ├── workflow.service.ts  # analyzeTask, buildWorkflow, executeWorkflow
│           └── useWorkflows.ts  # useBuildWorkflow, useExecuteWorkflow hooks
│
└── components/
    ├── dashboard/views/
    │   ├── TalentHubView.tsx    # Agent marketplace (useMarketplace)
    │   └── OfficeView.tsx       # Hired agents (useTeamAgents)
    ├── inbox/
    │   ├── InboxView.tsx        # Specialist chat (useTeamAgents)
    │   └── AgentSuggestionCards.tsx  # Hire suggestions
    ├── office/
    │   └── AgentEvolutionModal.tsx   # Agent evolution UI
    └── operations/
        ├── WorkflowVisualizer.tsx    # Workflow plan display
        ├── LiveOffice.tsx            # Real-time execution view
        └── WarRoomLive.tsx           # Live execution theater
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

*Last Updated: 2026-01-30*
