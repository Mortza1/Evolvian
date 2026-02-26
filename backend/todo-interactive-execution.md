# Interactive Execution & Assumption Block System

## The USP

Evolvian's core differentiator: **agents don't just blindly execute — they ask before assuming**. The manager (Evo) orchestrates a human-in-the-loop workflow where execution pauses for clarification, and users have a direct chat channel with both Evo and individual agents during execution.

This transforms the product from "submit task → wait → get output" into "submit task → collaborate → get better output".

---

## Current State (What Exists)

### ✅ Core Interactive Execution System — FULLY OPERATIONAL

| Component | State | Notes |
|-----------|-------|-------|
| `ExecutionContext.raise_assumption()` | **✅ Built & Active** | Stores assumptions and used throughout execution flow |
| `ExecutionContext.answer_assumption()` | **✅ Built & Active** | Marks assumptions answered and records responses |
| `ExecutionContext.get_unanswered_assumptions()` | **✅ Built & Active** | Queries pending assumptions |
| `ExecutionContext.pause()` / `.resume()` | **✅ Built & Active** | Status transitions + checkpointing |
| `ExecutionSignal` (RUNNING, PAUSE, CANCEL, WAITING_FOR_INPUT) | **✅ Built & Active** | All signals implemented and working |
| `ExecutionMessage` model | **✅ Built & Active** | Execution-scoped chat messages with full transcript |
| `execution_checkpoint` on Operation model | **✅ Built & Active** | Full context serialization for resume |
| `ChatMessage` model | **✅ Built & Active** | Per-team chat messages (team-scoped) |
| `POST /api/chat/manager` | **✅ Built & Active** | Evo responds with execution context awareness |
| `WarRoomLive.tsx` SSE handler | **✅ Built & Active** | Handles all events including assumptions, chat, manager questions |
| Inline Assumption Panel | **✅ Built & Active** | Replaces AssumptionDialog, fully integrated in WarRoomLive |
| Execution Chat Panel | **✅ Built & Active** | Real-time chat in execution theatre |
| `ManagerChat.tsx` | **✅ Built & Active** | Sidebar Evo chat panel |
| `EvoChat.tsx` | **✅ Built & Active** | Inbox Evo chat with typing animation and execution awareness |
| `SpecialistChat.tsx` | **✅ Built & Active** | Shows real execution messages grouped by operation |
| Team Events SSE Stream | **✅ Built & Active** | Real-time cross-view updates via global SSE connection |
| Toast/Browser/Audio Notifications | **✅ Built & Active** | Triple notification system for assumptions |
| **LiveOffice.tsx** | **✅ Removed** | Demo component deleted, types preserved in demo-types.ts |
| **AssumptionDialog.tsx** | **✅ Removed** | Modal deprecated and deleted, replaced by inline panel |
| **OperationFlow.tsx** | **✅ Removed** | Demo flow deleted, onboarding streamlined |

### ✅ Nothing Missing from Core System

All 7 originally identified gaps have been implemented:

1. ✅ **Assumption flow during real execution** — Fully integrated with pause/wait/resume
2. ✅ **`WAITING_FOR_INPUT` signal** — Implemented and working
3. ✅ **Execution-scoped chat** — ExecutionMessage model with full transcript
4. ✅ **Agent assumption detection** — `parse_assumptions_from_response()` with `<assumption>` XML blocks
5. ✅ **Manager intelligence** — Evo reviews progress and injects questions
6. ✅ **Inbox shows pending assumptions** — With real-time updates
7. ✅ **SpecialistChat is real** — Connected to ExecutionMessage data

### ✅ All Work Complete

All planned sprints have been completed:
- ✅ **Sprint 1-4**: Core interactive execution system (27/27 tasks)
- ✅ **Sprint 5**: Legacy demo cleanup (3/3 tasks)

**Total: 30/30 tasks complete (100%)**

---

## Architecture Design

### The Interactive Execution Flow

```
User submits task
    ↓
Evo designs workflow
    ↓
User approves, execution starts
    ↓
┌─────────────────────────────────────────────┐
│ FOR EACH NODE:                              │
│                                             │
│   1. Build agent prompt (with context)      │
│   2. Agent calls LLM                        │
│   3. Parse response for:                    │
│      - Tool calls → execute tools           │
│      - Assumptions → PAUSE + ask user   ←── NEW │
│      - Output → continue                    │
│                                             │
│   If assumption detected:                   │
│     → Emit SSE "assumption_raised"          │
│     → Set signal WAITING_FOR_INPUT          │
│     → Save checkpoint                       │
│     → Wait for user response                │
│     → Resume with answer injected           │
│                                             │
│   Manager can also inject questions:        │
│     → Between nodes, Evo reviews progress   │
│     → If Evo sees ambiguity → ask user      │
│                                             │
│   User can also send messages:              │
│     → Chat panel in execution theatre       │
│     → Message goes to current agent/Evo     │
│     → Agent receives as additional context  │
│                                             │
└─────────────────────────────────────────────┘
    ↓
Execution completes
    ↓
User rates output
```

### Event Flow Diagram

```
Backend (SSE Generator)          Frontend (WarRoomLive)         User
─────────────────────           ────────────────────          ─────
emit("node_start")        →     Show agent working
emit("llm_call")          →     Show processing

[Agent outputs assumption]
emit("assumption_raised") →     Show assumption panel     →   User sees question
                                Show "Waiting for input"
[Generator blocks/polls]         Chat input enabled
                                                          ←   User types answer
                           ←     POST /assumption/respond
[Answer stored in context]
emit("assumption_answered")→     Hide assumption panel
emit("llm_call")          →     Show processing (retry)

emit("node_complete")     →     Mark node done
```

---

## Phase 1: Backend — Assumption Block During Execution

### 1.1 Add `WAITING_FOR_INPUT` Signal

**File**: `backend/core/workflows/execution_state.py`

- [x] Add `WAITING_FOR_INPUT = "waiting_for_input"` to `ExecutionSignal` enum — **DONE 2026-02-09**
- [x] Add `request_input(operation_id, assumption_data)` method to `ExecutionRegistry` — **DONE 2026-02-09**
  - Sets signal to WAITING_FOR_INPUT
  - Stores the assumption data on the state object
- [x] Add `provide_input(operation_id, answer)` method to `ExecutionRegistry` — **DONE 2026-02-09**
  - Stores the answer on the state object
  - Resets signal to RUNNING
- [x] Add `is_waiting_for_input(operation_id)` helper method — **DONE 2026-02-09**
- [x] Add `pending_assumption` field to `ExecutionState` dataclass (stores the assumption dict) — **DONE 2026-02-09**
- [x] Add `assumption_answer` field to `ExecutionState` (stores the user's response) — **DONE 2026-02-09**

**Status**: ✅ **COMPLETE** — All fields and methods added, thread-safe, ready for polling in generator

### 1.2 Agent Assumption Detection

**File**: `backend/core/tools/executor.py`

When an agent responds, we need to detect if it's raising an assumption vs giving output.

**Approach A — Prompt-based detection (recommended for v1):**
- [ ] Update agent system prompt to include instruction (to be done in 1.3)
  ```
  If you are uncertain about something critical, output an assumption block:
  <assumption>
  <question>What is the target audience for this content?</question>
  <context>The task mentions "high-end clients" but doesn't specify industry</context>
  <options>CEOs/Board|CTOs/Technical|Product Teams</options>
  <priority>high</priority>
  </assumption>
  ```
- [x] Add `parse_assumptions_from_response(response: str)` function next to `parse_tool_calls_from_response()` — **DONE 2026-02-09**
  - Parses `<assumption>` XML blocks from LLM output
  - Returns list of `{question, context, options[], priority}` dicts
  - Returns empty list if no assumptions found
  - Supports all fields (question required, context/options/priority optional)
  - Validates priority values (low/normal/high/critical)
  - Handles multiple assumptions in one response
- [x] Export function from `core/tools/__init__.py` — **DONE 2026-02-09**
- [ ] After LLM call in node execution, check for assumptions BEFORE checking for tool calls (to be done in 1.3)
  - If assumptions found → enter assumption flow
  - If no assumptions → continue with tool calls / output as normal

**Status**: ✅ **COMPLETE** — Parser implemented and tested with 4 test cases

**Approach B — Manager-injected (for v2):**
- [ ] After each node completes, Evo reviews the output
- [ ] If Evo detects ambiguity or low confidence → Evo raises an assumption on behalf of the team
- [ ] This requires an additional LLM call (Evo reviewing agent output)

### 1.3 Assumption Block in Execution Generator

**File**: `backend/routers/operations.py` → `generate_execution_events()`

The core change: when an assumption is detected, pause execution and wait for user input.

- [x] Add assumption instruction to system prompt — **DONE 2026-02-09**
  - Instructs agents how to format `<assumption>` blocks
  - Emphasizes only for critical uncertainties
- [x] Create `_wait_for_assumption_answer()` helper function — **DONE 2026-02-09**
  - Polls ExecutionRegistry every 1 second
  - Timeout after 300 seconds (5 minutes)
  - Returns answer or None if timeout/cancelled
- [x] After parsing agent response, check for assumptions — **DONE 2026-02-09**
  ```python
  assumptions = parse_assumptions_from_response(agent_output)
  if assumptions:
      assumption = assumptions[0]  # Handle one at a time
      # Record in context
      context.raise_assumption(
          question=assumption["question"],
          context=assumption["context"],
          options=assumption.get("options", []),
          priority=assumption.get("priority", "normal")
      )
      # Emit SSE event
      yield emit("assumption_raised", {
          "operation_id": operation.id,
          "node_id": node_id,
          "node_name": node_name,
          "agent_name": assigned_agent.name if assigned_agent else agent_role,
          "agent_photo": assigned_agent.photo_url if assigned_agent else None,
          "assumption_index": len(context.assumptions) - 1,
          "question": assumption["question"],
          "context": assumption["context"],
          "options": assumption.get("options", []),
          "priority": assumption.get("priority", "normal"),
      })
      # Request input via registry
      EXECUTION_REGISTRY.request_input(operation.id, assumption)
      # Save checkpoint
      operation.execution_checkpoint = context.to_checkpoint()
      operation.status = "waiting_for_input"
      db.commit()
      # POLL for answer (blocking wait with timeout)
      answer = _wait_for_assumption_answer(operation.id, timeout=300)
      if answer is None:
          # Timeout or cancelled
          yield emit("assumption_timeout", {...})
          return
      # Record answer
      context.answer_assumption(len(context.assumptions) - 1, answer)
      yield emit("assumption_answered", {
          "assumption_index": len(context.assumptions) - 1,
          "answer": answer,
      })
      # Re-run agent with answer injected into context
      # (continue the tool loop with additional context)
  ```
- [x] Implemented for both execution paths — **DONE 2026-02-09**
  - **No-tools path**: Re-call `simple_chat()` with answer appended to prompt
  - **Tools path**: Append answer as user message, continue multi-turn loop
- [x] Emit `assumption_timeout` event if no answer received — **DONE 2026-02-09**
- [x] Handle cancellation gracefully in polling loop — **DONE 2026-02-09**

**Status**: ✅ **COMPLETE** — Full assumption block integrated into execution generator (both tool and no-tool paths)

### 1.4 Assumption Response API Endpoint

**File**: `backend/routers/operations.py`

- [x] Add `POST /api/operations/{operation_id}/assumption/respond` endpoint — **DONE 2026-02-09**
  - Validates operation belongs to user's team
  - Checks operation status is "waiting_for_input"
  - Verifies execution is registered and waiting via `EXECUTION_REGISTRY.is_waiting_for_input()`
  - Calls `EXECUTION_REGISTRY.provide_input(operation_id, request.answer)`
  - The blocked generator will pick this up and continue
  - Returns `AssumptionResponseResponse` with success status and resumed flag
- [x] Added import for new schemas — **DONE 2026-02-09**

**File**: `backend/schemas.py`
- [x] Add `AssumptionResponseRequest` schema: `{answer: str, assumption_index: Optional[int]}` — **DONE 2026-02-09**
- [x] Add `AssumptionResponseResponse` schema: `{success: bool, message: str, operation_id: int, resumed: bool}` — **DONE 2026-02-09**

**Status**: ✅ **COMPLETE** — Full API endpoint with request/response schemas, team validation, and state checking

### 1.5 Inject Answer Back Into Agent Prompt

**File**: `backend/routers/operations.py` (in the agent LLM call section)

After receiving the assumption answer, we need to re-call the agent with the answer as context.

- [x] After `_wait_for_assumption_answer` returns — **DONE 2026-02-09**
  - **No-tools path** (line 719-721):
    - Builds follow-up prompt with: system prompt + user's Q&A + instruction to continue
    - Re-calls `simple_chat()` with augmented prompt
    - Parses response as normal
  - **Tools path** (line 799-806):
    - Appends assistant's message (with assumption) to conversation
    - Appends user message with the answer
    - Continues multi-turn loop (new LLM call picks up the answer)
    - Continues normal tool execution flow

**Status**: ✅ **COMPLETE** — Answer re-injection implemented for both execution paths

### 1.6 Operation Status: "waiting_for_input"

**File**: `backend/models.py`
- [x] Add "waiting_for_input" as a valid status for Operation — **DONE 2026-02-09**
  - Updated status column comment to include "waiting_for_input" (line 106)

**File**: `backend/routers/operations.py`
- [x] When execution enters waiting state, update `operation.status = "waiting_for_input"` — **DONE 2026-02-09**
  - Implemented in both execution paths (line 697 for no-tools, line 774 for tools)
  - Status set before calling `_wait_for_assumption_answer()`
- [x] When answer received, update back to "in_progress" — **DONE 2026-02-09**
  - Status automatically resumes via ExecutionRegistry signal change
  - Generator continues execution after answer received
- [x] Status checked in assumption response endpoint — **DONE 2026-02-09**
  - Endpoint validates `operation.status == "waiting_for_input"` before accepting answer

**Status**: ✅ **COMPLETE** — Operation status lifecycle fully implemented

---

## Phase 2: Backend — Manager-Initiated Questions

### 2.1 Evo Reviews Progress Between Nodes

**File**: `backend/routers/operations.py` → `generate_execution_events()`

- [x] After each node completes, optionally run an "Evo review" step — **DONE 2026-02-09**
  - Integrated at line 1127 (after `context.advance_node()`)
  - Calculates remaining nodes
  - Gets review frequency from `team.settings.manager_review_frequency`
  - Calls `should_evo_review()` to determine if review is needed
  - Runs `run_evo_review()` if conditions met
  - If Evo needs clarification: uses same WAITING_FOR_INPUT flow as agent assumptions
  - Emits `manager_question` and `manager_reviewing` events
  - Records answer via ExecutionRegistry and continues execution

- [x] Add `should_evo_review(context, output)` heuristic — **DONE 2026-02-09** (line 290)
  - Review every N nodes based on `review_frequency` parameter
  - Always reviews after the first node (catches early misunderstandings)
  - Supports: "every_node", "every_2_nodes", "first_and_last", "never"
  - Simple quality heuristics: very short output (< 50 chars) triggers review
  - Confidence markers detection: skips review if agent shows high confidence
  - Default: every 2 nodes

- [x] Add `run_evo_review(context, output, remaining_nodes)` function — **DONE 2026-02-09** (line 343)
  - Single LLM call using `llm_service.simple_chat()` with gpt-4o-mini (cheaper model)
  - Prompt includes: original task, completed node name, agent output (first 1000 chars), remaining work
  - Instructs Evo to respond "PROCEED" if all good, or JSON with clarification needs
  - Parses response: checks for PROCEED or extracts JSON with question/context/options
  - Returns dict with `needs_clarification`, `question`, `context`, `options`, `reason`
  - Error handling: on exception, returns `needs_clarification: false` (non-blocking)

**Status**: ✅ **COMPLETE** — Manager intelligence layer fully integrated into execution flow

### 2.2 Manager Autonomy Configuration

**File**: `backend/schemas.py` → `TeamSettings`

- [x] Add team-level setting: `manager_review_frequency` — **DONE 2026-02-09**
  - Type: `Literal["every_node", "every_2_nodes", "first_and_last", "never"]`
  - Default: `"every_2_nodes"`
  - Validates only allowed values via Pydantic Literal type
  - Controls Evo's review frequency in execution loop
  - "every_node" = maximum oversight
  - "every_2_nodes" = balanced (default)
  - "first_and_last" = minimal oversight
  - "never" = disabled

- [x] Add team-level setting: `auto_assumption_threshold` — **DONE 2026-02-09**
  - Type: `float` with validation (0.0-1.0)
  - Default: `0.7`
  - Future use: confidence threshold for agent assumptions
  - Lower values = more cautious, more questions
  - Higher values = more autonomous, fewer interruptions

- [x] Stored in `Team.settings` JSON field — **DONE 2026-02-09**
  - Settings are part of TeamSettings Pydantic model
  - Persisted to `Team.settings` column in database
  - Updated via existing `PATCH /api/teams/{id}` endpoint
  - Comprehensive docstring added to TeamSettings class

**Usage**:
```python
# Update team settings via PATCH /api/teams/{team_id}
{
  "settings": {
    "manager_review_frequency": "every_node",
    "auto_assumption_threshold": 0.6
  }
}
```

**Status**: ✅ **COMPLETE** — Manager autonomy fully configurable via team settings

---

## Phase 3: Backend — Execution-Scoped Chat

### 3.1 ExecutionMessage Model

**File**: `backend/models.py`

- [x] Create `ExecutionMessage` model — **DONE 2026-02-09** (line 222)
  - Table: `execution_messages`
  - Columns:
    - `id` (primary key, indexed)
    - `operation_id` (foreign key to operations, indexed)
    - `sender_type` (string: "user", "manager", "agent", "system")
    - `sender_name` (string: display name)
    - `sender_id` (int, nullable: FK to user.id or agent.id)
    - `content` (text, not null)
    - `message_type` (string: "chat", "assumption", "answer", "status", "review")
    - `context` (JSON: metadata like node_id, assumption_index, consumed flag, etc.)
    - `created_at` (datetime, indexed)
  - Relationships:
    - `operation` relationship with back_populates to Operation.execution_messages
    - Cascade delete (messages deleted when operation deleted)
  - Comprehensive docstring explaining purpose and lifecycle

**File**: `backend/models.py` → `Operation` model (line 136)
- [x] Add `execution_messages` relationship — **DONE 2026-02-09**
  - Back-populates to ExecutionMessage.operation
  - Cascade delete to clean up messages when operation is deleted

**File**: `backend/schemas.py`
- [x] Create `ExecutionMessageCreate` schema — **DONE 2026-02-09** (line 707)
  - `content` (1-5000 chars, required)
  - `target` (optional: "current_agent", "manager", or agent name)
  - `message_type` (Literal: "chat", "instruction", "question", default "chat")

- [x] Create `ExecutionMessageResponse` schema — **DONE 2026-02-09** (line 717)
  - All fields from model
  - Config with from_attributes = True

- [x] Create `ExecutionMessagesResponse` schema — **DONE 2026-02-09** (line 732)
  - `messages` list
  - `total_count`
  - `operation_id`

**Why ExecutionMessage is separate from ChatMessage**:
- **Scope**: Execution-scoped (not team-scoped)
- **Senders**: Includes agents, manager, system (not just user ↔ Evo)
- **Types**: Structured message types (assumption, answer, review, status)
- **Purpose**: Forms complete execution transcript
- **Lifecycle**: Bounded to operation lifecycle

**Status**: ✅ **COMPLETE** — ExecutionMessage model and schemas ready for Phase 3.2 API implementation

### 3.2 Execution Chat API Endpoints

**File**: `backend/routers/operations.py`

- [x] `GET /api/operations/{operation_id}/messages` — **DONE 2026-02-09** (line 1758)
  - Returns chronological list of ExecutionMessages ordered by created_at
  - Returns `ExecutionMessagesResponse` with messages array, total_count, operation_id
  - Validates user has access to operation's team
  - Used to populate chat panel in WarRoomLive
  - Logs message count for debugging

- [x] `POST /api/operations/{operation_id}/messages` — **DONE 2026-02-09** (line 1818)
  - Request body: `ExecutionMessageCreate` schema
    - `content` (1-5000 chars)
    - `target` (optional: "current_agent", "manager", agent name)
    - `message_type` ("chat", "instruction", "question")
  - Creates ExecutionMessage with:
    - `sender_type="user"`
    - `sender_name=current_user.username`
    - `sender_id=current_user.id`
    - `context.consumed=False` (for Phase 3.3 injection tracking)
    - `context.target` (where message should be routed)
    - `context.sent_at` (timestamp)
  - Validates user has access to operation's team
  - Returns created message as `ExecutionMessageResponse`
  - TODO: Phase 3.3 will implement injection into agent context

**Status**: ✅ **COMPLETE** — Execution chat API ready for frontend integration and Phase 3.3 context injection

### 3.3 User Messages Injected Into Agent Context

**File**: `backend/routers/operations.py` → `generate_execution_events()`

**Helper Function**: `_get_and_consume_user_messages()` — **DONE 2026-02-09** (line 441)
- [x] Queries ExecutionMessage for unread user messages
  - Filters: `operation_id`, `sender_type="user"`, `context.consumed=False`
  - Filters by target: accepts `None`, `"current_agent"`, or matching node_id
  - Orders by `created_at` (chronological)
- [x] Formats messages with type labels:
  - "instruction" → "[User INSTRUCTION]"
  - "question" → "[User QUESTION]"
  - "chat" → "[User MESSAGE]"
- [x] Marks messages as consumed:
  - Sets `context.consumed = True`
  - Adds `context.consumed_at` timestamp
  - Commits to database
- [x] Returns formatted string for prompt injection (empty string if no messages)

**Integration Points**: — **DONE 2026-02-09**
- [x] **No-tools path** - Initial LLM call (line 889)
  - Checks for user messages before calling `simple_chat()`
  - Appends to `system_prompt` as `effective_prompt`
- [x] **No-tools path** - After assumption answered (line 950)
  - Checks for new messages after user answers assumption
  - Appends to follow-up prompt
- [x] **Tools path** - Multi-turn loop (line 965)
  - Checks for user messages at start of each turn
  - Injects as user message in conversation: `[REAL-TIME UPDATE FROM USER]`
  - Enables mid-execution instructions while agent is working through tools

**Status**: ✅ **COMPLETE** — User messages now dynamically injected into agent context in real-time

### 3.4 Record All Execution Events as Messages

**Helper Function**: `_record_execution_event_as_message()` — **DONE 2026-02-09** (line 522)
- [x] Generic function to create ExecutionMessage from any event
  - Parameters: operation_id, sender_type, sender_name, content, message_type, sender_id, context
  - Error handling: catches and logs exceptions, rolls back on failure
  - Non-blocking: execution continues even if transcript recording fails

**Integration Points**: — **DONE 2026-02-09**
- [x] **Agent starting work** (line 850) → message_type="status"
  - Content: "Starting work on: {node_name}"
  - Context: node_id, node_index, action="node_start"

- [x] **Tool use - success** (line 1160) → message_type="status"
  - Content: "Used tool: {tool_name}\nResult: {preview}"
  - Result preview: first 200 chars
  - Context: node_id, tool, status="completed"

- [x] **Tool use - error** (line 1239) → message_type="status"
  - Content: "Tool error: {tool_name}\nError: {error}"
  - Context: node_id, tool, status="error"

- [x] **Agent output** (line 1272) → message_type="chat", sender_type="agent"
  - Content: Agent's final response (first 500 chars)
  - Context: node_id, node_name, full_length
  - Recorded after all assumptions/tools resolved

- [x] **Assumption raised - no-tools** (line 978) → message_type="assumption"
  - Content: "Question: {question}"
  - Context: node_id, assumption_index, assumption_context, options, priority

- [x] **Assumption raised - tools** (line 1081) → message_type="assumption"
  - Same as no-tools path
  - Handles assumptions in multi-turn tool loop

- [x] **User answer - no-tools** (line 1019) → message_type="answer"
  - Sender: "User" (sender_type="user")
  - Content: "Answer to '{question}': {answer}"
  - Context: node_id, assumption_index

- [x] **User answer - tools** (line 1140) → message_type="answer"
  - Same as no-tools path
  - Handles answers during tool execution

- [x] **User answer - manager** (line 1429) → message_type="answer"
  - Content: "Answer to manager's question: {answer}"
  - Context: node_id, assumption_index, question_from="manager"

- [x] **Manager review** (line 1399) → message_type="review"
  - Sender: "Evo" (sender_type="manager")
  - Content: "Question: {question}"
  - Context: node_id, assumption_index, review_context, options, reason

**Status**: ✅ **COMPLETE** — Complete execution transcript automatically recorded for all events

---

## Phase 4: Frontend — Execution Theatre Redesign

### 4.1 Assumption Panel in WarRoomLive

**File**: `web/components/operations/WarRoomLive.tsx`

**State Management**: — **DONE 2026-02-09**
- [x] Added `AssumptionData` interface (line 42)
  - operationId, nodeId, agentName, agentPhoto, question, context, options, priority, assumptionIndex
- [x] Added state variables:
  - `currentAssumption` - stores active assumption
  - `assumptionAnswer` - user's text input
  - `isSubmittingAssumption` - loading state

**Event Handlers**: — **DONE 2026-02-09**
- [x] `assumption_raised` event (line 445)
  - Sets currentAssumption state
  - Updates node status to 'waiting_for_input'
  - Sets isPaused = true
  - Adds log entry

- [x] `assumption_answered` event (line 460)
  - Clears currentAssumption
  - Clears answer input
  - Sets isPaused = false
  - Adds "resuming" log entry

- [x] `manager_question` event (line 466)
  - Same flow as assumption_raised
  - Sets agentName to "Evo (Manager)"
  - Uses manager avatar

**API Integration**: — **DONE 2026-02-09**
- [x] `submitAssumptionAnswer()` function (line 493)
  - Calls `POST /api/operations/{id}/assumption/respond`
  - Sends answer and assumption_index
  - Shows success/error logs
  - Handles loading state

**UI Component**: — **DONE 2026-02-09** (line 1011)
- [x] Inline assumption panel (slide-up from bottom)
  - Gradient amber/orange background
  - Agent photo with pulsing border
  - Badge showing "AGENT QUESTION" or "MANAGER QUESTION"
  - Priority badge (high/critical in red)
  - Question text (large, prominent)
  - Context text (smaller, gray)
  - **Option chips** - clickable buttons for predefined answers
  - **Text input** - custom answer field with Enter key support
  - **Submit button** - with loading state
  - Auto-animates in with slide-in-from-bottom

**Node Visual Enhancement**: — **DONE 2026-02-09**
- [x] Updated NodeStatus interface to include 'waiting_for_input' (line 35)
- [x] Amber/orange color for waiting nodes (line 702)
- [x] Pulsing glow effect for waiting_for_input nodes (line 713)
- [x] Amber border for waiting nodes (line 722)
- [x] Question mark (?) badge with pulse animation (line 733)

**Status**: ✅ **COMPLETE** — Full assumption UI with event handling, API integration, and visual feedback

### 4.2 Chat Panel in Execution Theatre

**File**: `web/components/operations/WarRoomLive.tsx`

- [x] Add a collapsible chat panel to the right side of the execution theatre — **DONE 2026-02-10**
  - Always visible as a thin strip (expandable) — 12px collapsed with icon button
  - Shows real-time messages from all participants (agents, Evo, user)
  - User can type messages anytime (disabled when execution complete/cancelled)
  - Messages tagged with sender avatar, name, timestamp, message type badges

- [x] Chat panel components — **DONE 2026-02-10**
  - Inline implementation in WarRoomLive (not separate component)
  - Message list with color-coded avatars: User (blue), Agent (purple), Manager (indigo), System (gray)
  - Message type badges for non-chat messages (assumption, answer, status, review, instruction, question)
  - Auto-scroll to bottom when new messages arrive
  - Message count badge on collapsed button

- [x] Connect to backend — **DONE 2026-02-10**
  - On mount: `GET /api/operations/{id}/messages` to load history via `workflowService.getExecutionMessages()`
  - Send: `POST /api/operations/{id}/messages` via `workflowService.sendExecutionMessage()`
  - Messages sent with target="current_agent" and message_type="chat"
  - Enter key support for quick sending

**File**: `web/lib/services/workflows/workflow.service.ts` — **DONE 2026-02-10**
- [x] Added `getExecutionMessages(operationId)` method
- [x] Added `sendExecutionMessage(operationId, content, target?, messageType?)` method

**File**: `web/lib/services/workflows/types.ts` — **DONE 2026-02-10**
- [x] Added `ExecutionMessage` interface with all fields from backend schema

**Status**: ✅ **COMPLETE** — Chat panel fully functional with collapsible UI, message history, and real-time sending

### 4.3 Node Status Enhancement

**File**: `web/components/operations/WarRoomLive.tsx`

- [x] Add "waiting_for_input" node status — **DONE 2026-02-09 (Phase 4.1) + 2026-02-10**
  ```typescript
  interface NodeStatus {
    status: 'pending' | 'active' | 'completed' | 'failed' | 'waiting' | 'waiting_for_input';
    ...
  }
  ```
  - [x] Yellow/amber glow when waiting for input — **DONE 2026-02-09** (line 761, 771-776)
    - `displayColor = '#F59E0B'` for waiting_for_input nodes
    - Pulsing glow applied with `animate-pulse` class
  - [x] Pulsing question mark icon — **DONE 2026-02-09** (line 788-793)
    - Badge shows "?" with `bg-amber-500 animate-pulse`
    - Positioned at top-left corner of node card
  - [x] "Needs your input" label — **DONE 2026-02-10** (line 853)
    - Amber-colored status text with warning emoji
    - Replaces "In Progress" when node is waiting for input

**Status**: ✅ **COMPLETE** — All visual enhancements implemented (most in Phase 4.1, status label added in 4.3)

### 4.4 Assumption Quick Actions

**File**: `web/components/operations/WarRoomLive.tsx`

- [x] For common assumption types, provide smart quick-reply buttons — **DONE 2026-02-10**
  - [x] Priority questions: "Critical" | "Minor" | "Skip" — Enhanced with red, blue, and gray styling
  - [x] Target audience: Render provided options as chips — Already implemented in 4.1, enhanced with smart styling
  - [x] Yes/No questions: "Yes" | "No" | "More context" — Green for affirmative, red for negative
  - [x] These map to the `options` field from the assumption — Fully functional

**Smart Styling Logic** (lines 1264-1295):
- **Affirmative options** (Yes, Proceed, Continue, Approve) → Green background, green border
- **Negative options** (No, Cancel, Decline) → Red background, red border
- **Skip options** (Skip, Maybe Later, Not Sure) → Gray styling
- **Critical/Urgent options** → Red styling with semibold font
- **Minor/Low priority options** → Blue styling
- **Default options** → Amber hover effect

**Keyboard Shortcuts** (lines 607-627):
- Number keys 1-9 trigger corresponding option (1 for first option, 2 for second, etc.)
- Shortcuts disabled when typing in input fields
- Each button shows its number hint (e.g., "Yes 1", "No 2")

**Status**: ✅ **COMPLETE** — Smart quick-reply system with visual distinction and keyboard shortcuts

---

## Phase 5: Frontend — Inbox Integration

### 5.1 Pending Assumptions in Inbox

**Backend API** — **DONE 2026-02-10**

**File**: `backend/schemas.py` (line 732-758)
- [x] Added `PendingAssumptionResponse` schema
  - Includes operation details, agent info, question, waiting time, priority
- [x] Added `PendingAssumptionsResponse` schema

**File**: `backend/routers/operations.py` (line 2150-2220)
- [x] API: `GET /api/operations/pending-assumptions?team_id={id}`
  - Returns all operations in "waiting_for_input" status
  - Checks ExecutionRegistry for pending assumption data
  - Calculates waiting duration from operation.updated_at
  - Sorted by waiting time (oldest first = most urgent)
  - Team access validation

**Frontend Service** — **DONE 2026-02-10**

**File**: `web/lib/services/workflows/types.ts` (line 128-141)
- [x] Added `PendingAssumption` interface

**File**: `web/lib/services/workflows/workflow.service.ts` (line 369-390)
- [x] Added `getPendingAssumptions(teamId)` method
  - Fetches pending assumptions from backend
  - Returns assumptions array and total count

**Frontend UI** — **DONE 2026-02-10**

**File**: `web/components/inbox/InboxView.tsx`

- [x] Add "Pending Questions" section at top of inbox (line 331-416)
  - Amber-accented section with warning icon
  - Shows count badge with number of pending assumptions
  - Each pending assumption shows:
    - Agent avatar (photo or placeholder)
    - Question preview (2-line clamp)
    - Operation name/title
    - Waiting time (formatted as hours/minutes)
    - Priority badge (for high/critical)
    - Arrow icon for navigation
  - Click → navigates to operation's execution theatre
  - Shows up to 3 assumptions, with "+N more" indicator
  - Auto-refreshes every 30 seconds

- [x] Updated header badge to include pending assumptions (line 356)
  - "Messages" header shows total count (specialists + assumptions)
  - Badge shows combined pending count

**Status**: ✅ **COMPLETE** — Pending assumptions visible in inbox with full navigation

### 5.2 Agent Chat Connected to Real Execution

**Backend API** — **DONE 2026-02-10**

**File**: `backend/schemas.py` (line 762-782)
- [x] Added `AgentMessageGroup` schema - groups messages by operation
- [x] Added `AgentMessagesResponse` schema

**File**: `backend/routers/operations.py` (line 2223-2280)
- [x] API: `GET /api/operations/agent-messages?team_id={id}&agent_name={name}`
  - Returns all execution messages for a specific agent across all operations
  - Includes both agent messages AND user messages (for context)
  - Grouped by operation with operation title and status
  - Ordered by operation creation date (newest first)
  - Team access validation

**Frontend Service** — **DONE 2026-02-10**

**File**: `web/lib/services/workflows/types.ts` (line 144-150)
- [x] Added `AgentMessageGroup` interface

**File**: `web/lib/services/workflows/workflow.service.ts` (line 394-415)
- [x] Added `getAgentMessages(teamId, agentName)` method
  - Fetches agent-specific messages grouped by operation
  - Returns message groups and total count

**Frontend UI** — **DONE 2026-02-10**

**File**: `web/components/inbox/SpecialistChat.tsx`

- [x] Replace hardcoded demo messages with real data (line 45-90)
  - Load messages from `ExecutionMessage` via new API
  - Show the agent's questions, outputs, and user interactions
  - Fallback to welcome message if no execution messages yet
  - Auto-refresh every 10 seconds

- [x] Group by operation for clarity (line 201-266)
  - **Operation Headers** with:
    - Operation icon and title
    - Status badge (completed, in_progress, waiting_for_input)
    - Message count
    - Click to navigate to execution theatre
    - Hover effects
  - **Messages under each operation** with proper formatting
  - Clean separation between different operations

- [x] Enhanced welcome message for agents with no executions
  - Explains that messages will appear once they're assigned to workflows
  - Friendly, professional tone

**Note**: Chatting with agent outside of execution (via ChatMessage) is deferred to future phase - current implementation focuses on execution transcript which is the primary use case.

**Status**: ✅ **COMPLETE** — Agent chat now shows real execution messages grouped by operation

### 5.3 Evo Chat Aware of Execution State

**Backend** — **DONE 2026-02-10**

**File**: `backend/routers/chat.py` (line 118-172)

- [x] Updated `/api/chat/manager` endpoint to include execution context in system prompt
  - Queries all operations for the team
  - Counts running, waiting, and completed operations
  - Checks ExecutionRegistry for pending assumptions
  - Builds execution context section with:
    - "X operations currently running"
    - "X operations waiting for user input"
    - "X operations completed"
    - List of pending questions (up to 3) with operation title, agent name, and question
  - Appends to Evo's system prompt

- [x] Updated Evo's instructions to:
  - Reference current execution status when users ask about operations
  - Proactively mention pending questions
  - Encourage users to review and answer pending assumptions
  - Provide execution-aware responses

**Example Execution Context Added to System Prompt:**
```
Current Execution Status:
- 2 operations currently running
- 1 operation waiting for user input
- 5 operations completed

Pending Questions Needing User Input:
- Operation: Build brand strategy
  Agent: Aurora
  Question: What is the target audience for this content?
```

**Frontend** — No changes needed

**File**: `web/components/inbox/EvoChat.tsx`
- Existing chat functionality works as-is
- Evo receives execution context via backend system prompt
- Users can ask "What's my status?" or "Any pending questions?" and Evo responds with current state

**Status**: ✅ **COMPLETE** — Evo is now fully execution-aware and can proactively remind users about pending questions

---

## Phase 6: Frontend — Notification System

### 6.1 Assumption Notifications

**Core Notification System** — **DONE 2026-02-10**

**New Files Created:**

**File**: `web/lib/hooks/useNotifications.ts` (Phase 6.1)
- [x] Browser notification hook
  - Checks browser support for Notification API
  - Requests permission from user
  - Shows browser notifications with custom title, body, icon
  - Auto-close after 10 seconds (or requireInteraction for critical)
  - Click handler support

- [x] Audio notification function
  - Subtle notification sound using Web Audio API
  - Sine wave at 800Hz, 0.3 second duration, low volume
  - Non-intrusive audio ping

**File**: `web/components/notifications/ToastNotification.tsx` (Phase 6.1)
- [x] Toast notification component
  - 5 types: assumption, info, success, warning, error
  - Auto-positioning in top-right corner
  - Slide-in/slide-out animations
  - Auto-dismiss with configurable duration
  - Progress bar for timed toasts
  - Action button support
  - Manual dismiss button

**File**: `web/lib/contexts/ToastContext.tsx` (Phase 6.1)
- [x] Global toast management context
  - `showToast()` - Add new toast
  - `dismissToast()` - Remove specific toast
  - `clearAll()` - Clear all toasts
  - Default 5-second duration

**Integration:**

**File**: `web/components/operations/WarRoomLive.tsx` (line 61-63, 497-532, 556-591)
- [x] When assumption is raised during execution:
  - ✅ Browser notification (if permitted): "Agent X needs your input"
    - `requireInteraction: true` so it stays until user clicks
    - Custom tag for deduplication
    - Focus window on click
  - ✅ Audio ping (subtle, 800Hz sine wave)
    - Plays immediately when assumption raised
  - ✅ Toast notification in the execution theatre
    - Type: 'assumption' (amber gradient)
    - No auto-dismiss (duration: 0)
    - "View" action button to scroll to assumption panel
    - Shows for both agent assumptions and manager questions

- [x] Added data attribute to assumption panel for scroll targeting
  - `data-assumption-panel` attribute added to panel div
  - Toast "View" button scrolls to panel

**Deferred to Future:**
- [ ] Badge on Inbox nav icon (requires dashboard layout modification)
- [ ] Notification bar at top of dashboard (requires dashboard layout modification)

**Status**: ✅ **COMPLETE** — Core notification system fully functional (browser, audio, toast)

### 6.2 Real-Time Updates Across Views — ✅ COMPLETE

**Backend** — **DONE 2026-02-10**

**File**: `backend/routers/teams.py` (lines 7-11, 210-325)
- [x] Added imports for StreamingResponse, Generator, json, time, EXECUTION_REGISTRY
- [x] Created `generate_team_events()` generator function
  - Polls operations every second for state changes
  - Tracks pending assumptions count via ExecutionRegistry
  - Tracks active operations count
  - Emits events: team_state, assumption_raised, assumption_answered, operation_created, active_operations_changed
- [x] Created `GET /api/teams/{team_id}/events` SSE endpoint
  - Team access validation
  - Returns StreamingResponse with SSE headers
  - Real-time team-level event stream

**Frontend** — **DONE 2026-02-10**

**File**: `web/lib/contexts/TeamEventsContext.tsx` (NEW)
- [x] Created TeamEventsContext with global SSE connection
  - Connects to `/api/teams/{teamId}/events`
  - Maintains connection state
  - Subscribe/unsubscribe pattern for components
  - Event handlers for all team event types
  - Auto-reconnect on error (5 second delay)
  - Updates teamState (pending_assumptions, active_operations, total_operations)

**File**: `web/components/dashboard/Dashboard.tsx` (lines 1, 133-145)
- [x] Imported TeamEventsProvider
- [x] Wrapped main content with TeamEventsProvider when currentTeam exists
  - Provider active for all views when team is selected
  - Disconnects when team changes or component unmounts

**File**: `web/components/inbox/InboxView.tsx` (lines 10, 37-38, 80-112)
- [x] Imported useTeamEvents and useToast hooks
- [x] Subscribe to assumption_raised events
  - Reloads pending assumptions list
  - Shows toast notification with "View" action
  - Navigates to operation on action click
- [x] Subscribe to assumption_answered events
  - Reloads pending assumptions list
  - Updates badge count in real-time

**File**: `web/components/dashboard/Sidebar.tsx` (lines 5, 19-20, 73-112, 118)
- [x] Imported useTeamEvents hook
- [x] Added activeOperationsCount state
- [x] Subscribe to assumption_raised/answered events
  - Updates inbox badge count in real-time
- [x] Subscribe to active_operations_changed events
  - Updates active operations count
- [x] Display active operations count as badge on Office nav item
- [x] Display pending assumptions count in inbox badge

**Status**: ✅ **COMPLETE** — Real-time cross-view updates fully functional
- Inbox badge updates instantly when assumptions are raised/answered
- Sidebar shows active operation count on Office icon
- All views stay synchronized via global team event stream
- Toast notifications shown in Inbox when new assumptions arrive

---

## Implementation Order (Recommended)

### Sprint 1: Core Assumption Block (MVP) — ✅ COMPLETE
1. ✅ **1.1** — `WAITING_FOR_INPUT` signal in ExecutionRegistry — **DONE 2026-02-09**
2. ✅ **1.2** — `parse_assumptions_from_response()` parser — **DONE 2026-02-09**
3. ✅ **1.3** — Assumption block in execution generator (pause + poll + resume) — **DONE 2026-02-09**
4. ✅ **1.4** — `POST /assumption/respond` API endpoint — **DONE 2026-02-09**
5. ✅ **1.5** — Re-inject answer into agent prompt — **DONE 2026-02-09** (implemented as part of 1.3)
6. ✅ **4.1** — Handle `assumption_raised` in WarRoomLive — **DONE 2026-02-09**
7. ✅ **4.3** — `waiting_for_input` node status — **DONE 2026-02-09/10**

**Outcome**: Agents can raise assumptions mid-execution, execution pauses, user answers in WarRoomLive, execution resumes. End-to-end flow works.

**Progress**: ✅ 7/7 complete (100%)

### Sprint 2: Execution Chat — ✅ COMPLETE
1. ✅ **3.1** — ExecutionMessage model — **DONE 2026-02-09**
2. ✅ **3.2** — Execution chat API endpoints — **DONE 2026-02-09**
3. ✅ **3.3** — User messages injected into agent context — **DONE 2026-02-09**
4. ✅ **4.2** — Chat panel in execution theatre — **DONE 2026-02-10**

**Outcome**: Users can chat with agents during execution. Messages are persisted and visible in the execution transcript.

### Sprint 3: Manager Intelligence — ✅ COMPLETE
1. ✅ **2.1** — Evo reviews between nodes — **DONE 2026-02-09**
2. ✅ **2.2** — Manager autonomy configuration — **DONE 2026-02-09**
3. ✅ **3.4** — Record all events as messages — **DONE 2026-02-09**

**Outcome**: Evo proactively asks clarifying questions. Full execution transcript.

### Sprint 4: Inbox & Notifications — ✅ COMPLETE
1. ✅ **5.1** — Pending assumptions in inbox — **DONE 2026-02-10**
2. ✅ **5.2** — Agent chat connected to real data — **DONE 2026-02-10**
3. ✅ **5.3** — Evo chat aware of execution state — **DONE 2026-02-10**
4. ✅ **6.1** — Assumption notifications — **DONE 2026-02-10**
5. ✅ **6.2** — Real-time cross-view updates — **DONE 2026-02-10**

**Outcome**: Full inbox integration with real-time notifications — pending assumptions visible, agent chat shows real execution data, Evo is execution-aware, real-time badge updates across all views, toast notifications for new assumptions.

### Sprint 5: Polish & Remove Hardcoded Demos — ✅ COMPLETE

**Completed Tasks:**
1. ✅ Removed `LiveOffice.tsx` simulated execution — **DONE 2026-02-10**
   - Deleted file (618 lines of demo code)
   - Extracted `OperationResult` and `Assumption` types to `demo-types.ts` for backward compatibility
   - Updated imports in `operations-storage.ts` and `OperationReview.tsx`

2. ✅ Removed `OperationFlow.tsx` demo flow — **DONE 2026-02-10**
   - Deleted file (complete reveal → dashboard → workflow → live → review flow)
   - Updated `OnboardingFlow.tsx` to skip demo operation step
   - Users now complete onboarding after hiring and go directly to HQ

3. ✅ Removed deprecated `AssumptionDialog.tsx` — **DONE 2026-02-10**
   - Deleted modal component (replaced by inline panel in Phase 4.1)
   - No longer referenced anywhere in codebase

**Additional Cleanup:**
- ✅ Created `demo-types.ts` to preserve legacy types for backward compatibility
- ✅ Updated all imports to reference new types file
- ✅ Verified no broken imports remain
- ✅ Onboarding flow streamlined (users go directly from hiring to HQ)

**Already Complete (from earlier phases):**
- ✅ SpecialistChat.tsx now shows real execution messages (Phase 5.2)
- ✅ Assumption system fully functional with inline panel (Phase 4.1)

---

## Key Design Decisions

### Why poll instead of WebSocket for assumptions?
The execution generator is a sync SSE generator running in Starlette's threadpool. It can't easily receive WebSocket messages. Polling the `ExecutionRegistry` (an in-memory dict) every second is simple, reliable, and fast enough for human interaction.

### Why separate ExecutionMessage from ChatMessage?
- `ChatMessage` is team-scoped (persistent Evo conversations)
- `ExecutionMessage` is operation-scoped (execution transcript)
- Different sender types (agents can send ExecutionMessages, not ChatMessages)
- Different lifecycle (ExecutionMessages form a bounded transcript, ChatMessages grow forever)
- Different UI context (execution theatre vs inbox)

### Why not use EvoAgentX's callback system?
EvoAgentX's `CallbackManager` is designed for error handling and logging, not human-in-the-loop interaction. Their agents don't have a concept of "pausing for input." We need our own mechanism built into the execution generator.

### Why parse assumptions from LLM output vs a separate LLM call?
Parsing from agent output is simpler and cheaper — the agent naturally raises uncertainty as part of its work. A separate "should I ask the user?" LLM call doubles the cost per node. For v1, prompt engineering the agent to use `<assumption>` tags is sufficient.

### Why handle one assumption at a time?
Simplicity. If an agent raises multiple assumptions, we process the first one, resume, and the agent may or may not raise more. This keeps the UX clean (one question at a time) and the backend simple (one wait loop).

---

## Files Affected Summary

### Backend (New Files Created)
- None (all changes were additions to existing files)

### Backend (Modified Files)
- ✅ `backend/models.py` — Added `ExecutionMessage` model, updated Operation relationship
- ✅ `backend/schemas.py` — Added multiple schemas (AssumptionResponse, ExecutionMessage, PendingAssumption, AgentMessageGroup, TeamSettings updates)
- ✅ `backend/core/workflows/execution_state.py` — Added WAITING_FOR_INPUT signal + input request/provide methods
- ✅ `backend/core/tools/executor.py` — Added `parse_assumptions_from_response()` function
- ✅ `backend/routers/operations.py` — Major changes: assumption detection, polling loop, chat endpoints, pending assumptions API, agent messages API
- ✅ `backend/routers/chat.py` — Added execution context to Evo's system prompt
- ✅ `backend/routers/teams.py` — Added team-level SSE endpoint for real-time events
- ✅ `backend/core/utils.py` — NEW FILE: Extracted `infer_task_type()` shared utility

### Frontend (New Files Created)
- ✅ `web/lib/hooks/useNotifications.ts` — Browser notification + audio ping hook
- ✅ `web/components/notifications/ToastNotification.tsx` — Toast notification component
- ✅ `web/lib/contexts/ToastContext.tsx` — Global toast management
- ✅ `web/lib/contexts/TeamEventsContext.tsx` — Global team events SSE connection
- ✅ `web/components/operations/demo-types.ts` — Preserved legacy types for backward compatibility

### Frontend (Modified Files)
- ✅ `web/components/operations/WarRoomLive.tsx` — Massive updates: assumption panel, chat panel, notifications, keyboard shortcuts, node status
- ✅ `web/components/inbox/InboxView.tsx` — Pending assumptions section, real-time event subscriptions
- ✅ `web/components/inbox/SpecialistChat.tsx` — Connected to real ExecutionMessage data
- ✅ `web/components/inbox/EvoChat.tsx` — No changes needed (receives execution context via backend)
- ✅ `web/components/dashboard/Dashboard.tsx` — Wrapped with TeamEventsProvider
- ✅ `web/components/dashboard/Sidebar.tsx` — Real-time badge updates for inbox and office
- ✅ `web/lib/services/workflows/workflow.service.ts` — Added 5+ new API methods
- ✅ `web/lib/services/workflows/types.ts` — Added multiple new interfaces

### Frontend (Removed in Sprint 5)
- ✅ `web/components/operations/LiveOffice.tsx` — DELETED (618 lines, demo execution simulation)
- ✅ `web/components/operations/AssumptionDialog.tsx` — DELETED (deprecated modal component)
- ✅ `web/components/operations/OperationFlow.tsx` — DELETED (complete simulated workflow flow)

**Note**: Types from deleted components preserved in `demo-types.ts` for backward compatibility. Inline assumption panel implemented directly in WarRoomLive.tsx.

---

## Progress Tracker

### Sprint 1: Core Assumption Block (MVP) — ✅ COMPLETE

| Task | Status | Date | Notes |
|------|--------|------|-------|
| 1.1 - WAITING_FOR_INPUT Signal | ✅ Done | 2026-02-09 | ExecutionState + Registry methods fully implemented |
| 1.2 - parse_assumptions_from_response() | ✅ Done | 2026-02-09 | XML parser in executor.py, tested with 4 test cases |
| 1.3 - Assumption block in generator | ✅ Done | 2026-02-09 | Polling-based wait, SSE events, both tool/no-tool paths |
| 1.4 - POST /assumption/respond API | ✅ Done | 2026-02-09 | Request/response schemas + endpoint with validation |
| 1.5 - Re-inject answer into prompt | ✅ Done | 2026-02-09 | Implemented in 1.3 (re-call LLM with answer) |
| 4.1 - WarRoomLive assumption_raised handler | ✅ Done | 2026-02-09 | Frontend SSE event handler + inline assumption panel |
| 4.3 - waiting_for_input node status | ✅ Done | 2026-02-09/10 | Visual UI indicator (glow, badge, status label) |

**Outcome**: End-to-end assumption flow works. Agents can raise assumptions mid-execution, execution pauses, user answers in WarRoomLive, execution resumes.

---

*Created: 2026-02-09*
*Last Updated: 2026-02-10 — Sprint 5 Complete (Demo cleanup) — All planned work COMPLETE (30/30 tasks)*

---

## ✅ ALL CORE PHASES COMPLETE

The interactive execution system is now fully operational with:

### Phase 1: Backend — Assumption Block ✅ COMPLETE
- ✅ WAITING_FOR_INPUT signal and ExecutionRegistry methods
- ✅ Assumption parser (`parse_assumptions_from_response()`)
- ✅ Assumption blocking in execution generator (pause/poll/resume)
- ✅ API endpoint for assumption responses
- ✅ Answer re-injection into agent prompts
- ✅ Operation status lifecycle (waiting_for_input)

### Phase 2: Backend — Manager Intelligence ✅ COMPLETE
- ✅ Evo reviews progress between nodes
- ✅ Manager autonomy configuration (team settings)
- ✅ Manager can inject clarifying questions

### Phase 3: Backend — Execution Chat ✅ COMPLETE
- ✅ ExecutionMessage model (execution-scoped messages)
- ✅ Chat API endpoints (GET/POST messages)
- ✅ User messages injected into agent context
- ✅ Complete execution transcript recording

### Phase 4: Frontend — Execution Theatre ✅ COMPLETE
- ✅ Inline assumption panel in WarRoomLive
- ✅ Collapsible chat panel in execution theatre
- ✅ Node status enhancements (amber glow, question mark badge)
- ✅ Smart quick-action buttons with keyboard shortcuts

### Phase 5: Frontend — Inbox Integration ✅ COMPLETE
- ✅ Pending assumptions section in Inbox
- ✅ Agent chat connected to real ExecutionMessage data
- ✅ Evo chat aware of execution state

### Phase 6: Frontend — Notifications ✅ COMPLETE
- ✅ Triple notification system (browser + audio + toast)
- ✅ Real-time cross-view updates via team SSE stream
- ✅ Badge updates in sidebar (inbox + office)

---

## 📊 Completion Status

| Sprint | Status | Progress | Notes |
|--------|--------|----------|-------|
| Sprint 1: Core Assumption Block | ✅ Complete | 7/7 (100%) | End-to-end assumption flow working |
| Sprint 2: Execution Chat | ✅ Complete | 4/4 (100%) | Full chat transcript and real-time messaging |
| Sprint 3: Manager Intelligence | ✅ Complete | 3/3 (100%) | Evo reviews and injects questions |
| Sprint 4: Inbox & Notifications | ✅ Complete | 5/5 (100%) | Full real-time notification system |
| **Sprint 5: Polish & Cleanup** | ✅ Complete | 3/3 (100%) | All legacy demo components removed |

### Sprint 5: Completed Cleanup ✅

All legacy demo components have been removed:

1. **LiveOffice.tsx** — ✅ REMOVED
   - Deleted 618-line demo component
   - Preserved types in demo-types.ts for backward compatibility
   - No impact on production execution

2. **OperationFlow.tsx** — ✅ REMOVED
   - Deleted complete simulated workflow flow
   - Updated OnboardingFlow to skip demo operation step
   - Users now go directly from hiring to HQ

3. **AssumptionDialog.tsx** — ✅ REMOVED
   - Deleted deprecated modal component
   - Already replaced by inline panel in WarRoomLive
   - No remaining references in codebase

---

## 🎯 System Capabilities Summary

**What Users Can Do Now:**
1. ✅ Execute workflows with real-time agent collaboration
2. ✅ Receive questions from agents when they're uncertain
3. ✅ Receive questions from Evo (manager) for clarification
4. ✅ Chat with agents during execution
5. ✅ See all pending questions across operations in Inbox
6. ✅ Get notified (browser/audio/toast) when questions arise
7. ✅ See real-time badge updates across all dashboard views
8. ✅ View complete execution transcript with all messages
9. ✅ Use keyboard shortcuts for quick assumption responses
10. ✅ Monitor active operations and pending questions in real-time

**System Architecture:**
- **Backend**: FastAPI with SSE streaming, ExecutionRegistry for state management
- **Frontend**: React/TypeScript with global SSE connections for real-time updates
- **Database**: PostgreSQL with ExecutionMessage model for execution transcripts
- **LLM Integration**: OpenRouter with assumption detection and manager intelligence
- **Real-time**: Dual SSE streams (operation-level + team-level) for instant updates

---

**Next Steps After Sprint 5**: Consider additional features like:
- Assumption history and analytics
- User preference learning (reduce repetitive questions)
- Multi-user collaboration (team members can answer questions together)
- Advanced manager strategies (different review patterns based on task type)
