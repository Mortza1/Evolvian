# Evolvian

**Hierarchical self-evolving multi-agent orchestration — research framework and management platform.**

Evolvian extends a flat multi-agent framework with organisational hierarchy: a Warden agent that decomposes goals, delegates to specialist workers, reviews outputs, and escalates exceptions — mirroring how real teams operate. The system self-evolves over time using quality feedback and execution history to improve future workflow design.

---

## Research Question

> *Does adding hierarchical team-based orchestration to a self-evolving multi-agent framework improve task performance on complex, multi-step problems compared to flat workflow orchestration?*

The dissertation evaluates four configurations across HotPotQA, MATH, and a custom Enterprise benchmark:

| Config | Description |
|--------|-------------|
| **A** | Single agent (flat baseline) |
| **B** | Flat multi-agent pipeline (3 chained specialists, no supervisor) |
| **C** | Hierarchical — Warden + workers, no evolution |
| **D** | Hierarchical + evolution-informed workflow design |

---

## Architecture

### Research Backend (`backend/dissertation/`)

The core contribution — ~9,700 lines of Python across 35 files.

```
hierarchy/
  team.py              # Team, HierarchicalAgent, DelegationPolicy, EscalationRule
  supervisor.py        # SupervisorDecomposer, DelegationEngine, SupervisorReviewer
  hierarchical_graph.py # HierarchicalWorkFlowGraph — teams as first-class graph nodes
  execution.py         # HierarchicalWorkFlow — full Warden supervision loop

benchmarks/
  hotpotqa_teams.py    # Research Coordinator + Retriever + Reasoner + Synthesiser
  math_teams.py        # Math Strategist + Planner + Solver + Verifier
  enterprise_teams.py  # Research → Analysis → Writing multi-team pipeline
  math_levels.py       # MATH benchmark with level filters (1–5)
  base_runner.py       # Config A baseline runner

evaluation/
  run_baseline.py      # Config A evaluation harness
  run_flat_pipeline.py # Config B evaluation harness
  compare_results.py   # Cross-config statistical comparison with LLM-as-Judge

scripts/
  run_experiment.py    # CLI: --config A/B/C/D --benchmark hotpotqa/math/enterprise
  cost_tracker.py      # Per-run API cost tracking

tests/                 # 99 unit and integration tests
```

**Key design decisions:**

- *Graceful degradation* — LLM failures never crash execution; every component has a deterministic fallback.
- *Calibrated Verifier* — confidence-based escalation (0–100 scale) with two-condition requirement to reduce false negatives; binary CORRECT/INCORRECT was abandoned after smoke tests showed ~80% false-negative rate.
- *Answer extraction post-processing* — applied equally to all configs to remove verbosity bias from F1 scoring.
- *Warden supervision loop* — Decompose → Assign → Execute → Escalation check → Review → Aggregate.

### Platform Backend (`backend/`)

FastAPI + SQLAlchemy service powering the web UI.

- Real-time hierarchical execution via Server-Sent Events (SSE)
- Three-layer quality feedback: proxy metrics + LLM-as-judge (5 dimensions) + user ratings (1–5 stars)
- Evolution engine — `WorkflowDNA` registry stores execution traces and quality scores; informs future workflow generation
- Tool execution layer — web search, web scrape, code executor, file reader
- Human-in-the-loop assumption handling — agents raise clarifying questions; users answer in real time

### Frontend (`web/`)

Next.js + TypeScript dashboard.

```
components/
  operations/war-room/          # Live execution theatre (SSE, chat, activity log, hierarchy view)
  dashboard/views/task-creation/ # 3-step workflow generation flow
  inbox/                        # Agent message inbox + pending assumption queue
```

**Feature-folder structure:** each feature contains `components/`, `hooks/`, and `types/` subdirectories. Hooks own all state and logic; components are thin renderers.

---

## Running Experiments

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run Config A (single agent) on HotPotQA, 20 samples
python -m dissertation.scripts.run_experiment --config A --benchmark hotpotqa --sample-k 20

# Run Config C (hierarchical) on MATH Level 2-3
python -m dissertation.scripts.run_experiment --config C --benchmark math_moderate --sample-k 20

# Compare results across configs
python -m dissertation.scripts.run_experiment --config compare
```

```bash
# Run test suite (99 tests)
PYTHONPATH=backend python -m pytest backend/dissertation/tests/ -v
```

---

## Hypotheses

- **H1** — Hierarchical Evolvian (Config C) outperforms flat baseline (Config A) on complex multi-step tasks (HotPotQA, Enterprise), measured by F1/accuracy.
- **H2** — Hierarchy shows comparable or better performance on structured single-domain tasks (MATH), demonstrating the overhead is not harmful.
- **H3** — Evolution (Config D) produces greater gains on hierarchical workflows than flat, because hierarchy provides more structured optimisation targets.

---

## Results (In Progress)

Results are being collected across benchmarks. See `backend/dissertation/results/` for current run outputs and `RESULTS_SUMMARY.md` for the evolving comparison table.

---

## Project Structure

```
Evolvian/
├── backend/
│   ├── dissertation/       # Research framework (hierarchy, benchmarks, evaluation)
│   ├── routers/            # FastAPI route handlers
│   ├── core/               # Tools, runtime, quality evaluator
│   ├── models.py           # SQLAlchemy ORM models
│   └── llm_service.py      # LLM abstraction (OpenRouter)
├── web/
│   ├── app/                # Next.js app router pages
│   ├── components/         # Feature-folder UI components
│   └── lib/                # API clients, services, contexts
└── dissertation.txt        # Original research plan and evaluation strategy
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Research framework | Python, Pydantic, asyncio |
| Platform backend | FastAPI, SQLAlchemy, PostgreSQL |
| LLM access | OpenRouter (gpt-4o-mini for experiments) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Streaming | Server-Sent Events (SSE) |
| Testing | pytest (99 tests) |

---

## Contributions

1. **Architectural** — Hierarchical team orchestration layer: Warden agents, role-based teams, delegation scoping, escalation pathways, and calibrated review loops.
2. **Empirical** — Comparative evaluation (configs A–D) on HotPotQA, MATH, and Enterprise benchmarks with LLM-as-Judge scoring.
3. **Design** — A reusable architecture pattern for hierarchical self-evolving agent teams, integrated into a production management platform.

---

*Phase 1: Prove it works. Phase 2: Build the product.*
