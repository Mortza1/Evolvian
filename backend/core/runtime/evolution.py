"""
Evolution Service - Simple Bayesian workflow selection and mutation.

This module provides the "self-optimizing" capability of Evolvian.
It uses WorkflowExecution data to:
1. Select the best performing workflows for similar tasks
2. Suggest improvements based on historical performance
3. Track quality vs cost tradeoffs
4. Mutate workflows to explore variations

This is Phase 1 evolution - simple and practical.
AFlow from EvoAgentX can be integrated later for advanced optimization.
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import json
import hashlib
import random


@dataclass
class WorkflowDNA:
    """
    The genetic representation of a workflow.
    Used for comparison, mutation, and evolution tracking.
    """
    signature: str  # Hash identifying this workflow pattern
    task_type: str
    agents: List[str]  # Agent roles/names used
    node_count: int
    avg_cost: float = 0.0
    avg_latency_ms: int = 0
    avg_quality_score: float = 0.0
    execution_count: int = 0
    success_rate: float = 0.0

    # For selection
    fitness_score: float = 0.0  # Combined score for selection

    def to_dict(self) -> dict:
        return {
            "signature": self.signature,
            "task_type": self.task_type,
            "agents": self.agents,
            "node_count": self.node_count,
            "avg_cost": self.avg_cost,
            "avg_latency_ms": self.avg_latency_ms,
            "avg_quality_score": self.avg_quality_score,
            "execution_count": self.execution_count,
            "success_rate": self.success_rate,
            "fitness_score": self.fitness_score,
        }


@dataclass
class EvolutionSuggestion:
    """A suggestion for workflow improvement."""
    suggestion_type: str  # "add_agent", "remove_agent", "reorder", "use_proven_workflow"
    description: str
    confidence: float  # 0.0 - 1.0
    expected_improvement: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "suggestion_type": self.suggestion_type,
            "description": self.description,
            "confidence": self.confidence,
            "expected_improvement": self.expected_improvement,
            "details": self.details,
        }


@dataclass
class WorkflowStats:
    """Statistics for workflows of a given task type."""
    task_type: str
    total_executions: int
    unique_workflows: int
    best_workflow: Optional[WorkflowDNA]
    avg_cost: float
    avg_quality: float
    avg_latency_ms: int
    cost_quality_ratio: float  # Lower is better
    top_workflows: List[WorkflowDNA] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "task_type": self.task_type,
            "total_executions": self.total_executions,
            "unique_workflows": self.unique_workflows,
            "best_workflow": self.best_workflow.to_dict() if self.best_workflow else None,
            "avg_cost": self.avg_cost,
            "avg_quality": self.avg_quality,
            "avg_latency_ms": self.avg_latency_ms,
            "cost_quality_ratio": self.cost_quality_ratio,
            "top_workflows": [w.to_dict() for w in self.top_workflows],
        }


@dataclass
class AgentPerformance:
    """Performance stats for a single agent across all executions."""
    agent_name: str
    agent_id: int
    total_executions: int
    avg_quality: float          # average quality_score of workflows this agent participated in
    best_quality: float         # highest quality_score
    worst_quality: float        # lowest quality_score
    avg_cost: float             # average cost per execution
    success_rate: float         # % of workflows that completed successfully
    user_avg_rating: float      # average user_rating (only rated executions)
    rated_count: int            # how many executions got user ratings
    best_task_type: str         # task_type where this agent performs best
    trend: str                  # "improving", "stable", "declining"

    def to_dict(self) -> dict:
        return {
            "agent_name": self.agent_name,
            "agent_id": self.agent_id,
            "total_executions": self.total_executions,
            "avg_quality": self.avg_quality,
            "best_quality": self.best_quality,
            "worst_quality": self.worst_quality,
            "avg_cost": self.avg_cost,
            "success_rate": self.success_rate,
            "user_avg_rating": self.user_avg_rating,
            "rated_count": self.rated_count,
            "best_task_type": self.best_task_type,
            "trend": self.trend,
        }


class EvolutionService:
    """
    The evolution engine for Evolvian.

    Uses Bayesian selection to identify and recommend the best workflows
    based on historical execution data.

    Key methods:
    - select_best_workflow(): Get the best workflow for a task type
    - get_workflow_stats(): Get statistics for a task type
    - suggest_improvements(): Get suggestions to improve a workflow
    - mutate_workflow(): Create variations of a workflow
    - calculate_fitness(): Score a workflow's performance

    Usage:
        evolution = EvolutionService(db=session, team_id=1)

        # Get best workflow for a task type
        best = evolution.select_best_workflow("marketing")

        # Get suggestions for improvement
        suggestions = evolution.suggest_improvements(current_workflow_signature)

        # Get statistics
        stats = evolution.get_workflow_stats("marketing")
    """

    def __init__(self, db: Session, team_id: int):
        self.db = db
        self.team_id = team_id

    def _get_workflow_execution_model(self):
        """Lazy import to avoid circular dependencies."""
        from models import WorkflowExecution
        return WorkflowExecution

    # ==================== SELECTION ====================

    def select_best_workflow(
        self,
        task_type: str,
        optimization_goal: str = "balanced",  # "quality", "cost", "speed", "balanced"
        min_executions: int = 1
    ) -> Optional[WorkflowDNA]:
        """
        Select the best performing workflow for a given task type.

        This is the core Bayesian selection - pick the workflow with
        the best historical performance.

        Args:
            task_type: Type of task (e.g., "marketing", "content_creation")
            optimization_goal: What to optimize for
            min_executions: Minimum executions to consider a workflow

        Returns:
            WorkflowDNA of the best performing workflow, or None if no data
        """
        WorkflowExecution = self._get_workflow_execution_model()

        # Get all executions for this task type and team
        executions = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.task_type == task_type,
            WorkflowExecution.status == "completed"
        ).all()

        if not executions:
            return None

        # Group by workflow signature
        workflow_groups: Dict[str, List] = {}
        for ex in executions:
            sig = ex.workflow_signature or "unknown"
            if sig not in workflow_groups:
                workflow_groups[sig] = []
            workflow_groups[sig].append(ex)

        # Calculate fitness for each workflow
        workflows: List[WorkflowDNA] = []
        for signature, execs in workflow_groups.items():
            if len(execs) < min_executions:
                continue

            # Calculate averages using hybrid quality scores
            avg_cost = sum(e.cost or 0 for e in execs) / len(execs)
            avg_latency = sum(e.latency_ms or 0 for e in execs) / len(execs)
            avg_quality = sum(self._get_effective_quality(e) for e in execs) / len(execs)
            success_count = sum(1 for e in execs if e.status == "completed")
            success_rate = success_count / len(execs)

            # Get agents from first execution
            agents = execs[0].agents_used or []
            node_count = execs[0].nodes_total or 0

            # Calculate fitness score based on optimization goal
            fitness = self._calculate_fitness(
                quality=avg_quality,
                cost=avg_cost,
                latency=avg_latency,
                success_rate=success_rate,
                execution_count=len(execs),
                goal=optimization_goal
            )

            dna = WorkflowDNA(
                signature=signature,
                task_type=task_type,
                agents=agents,
                node_count=node_count,
                avg_cost=avg_cost,
                avg_latency_ms=int(avg_latency),
                avg_quality_score=avg_quality,
                execution_count=len(execs),
                success_rate=success_rate,
                fitness_score=fitness
            )
            workflows.append(dna)

        if not workflows:
            return None

        # Sort by fitness and return best
        workflows.sort(key=lambda w: w.fitness_score, reverse=True)
        return workflows[0]

    def _calculate_fitness(
        self,
        quality: float,
        cost: float,
        latency: float,
        success_rate: float,
        execution_count: int,
        goal: str = "balanced"
    ) -> float:
        """
        Calculate fitness score for a workflow.

        The fitness function balances multiple objectives based on the goal.
        """
        # Normalize cost and latency (lower is better, so invert)
        # Assume typical ranges: cost 0-100, latency 0-60000ms
        cost_score = max(0, 1 - (cost / 100)) if cost > 0 else 1.0
        latency_score = max(0, 1 - (latency / 60000)) if latency > 0 else 1.0

        # Quality and success rate are already 0-1
        quality_score = quality

        # Experience bonus (more executions = more confidence)
        experience_bonus = min(0.2, execution_count * 0.02)

        # Calculate weighted fitness based on goal
        if goal == "quality":
            fitness = (quality_score * 0.6 + success_rate * 0.3 + cost_score * 0.05 + latency_score * 0.05)
        elif goal == "cost":
            fitness = (cost_score * 0.5 + quality_score * 0.3 + success_rate * 0.15 + latency_score * 0.05)
        elif goal == "speed":
            fitness = (latency_score * 0.5 + quality_score * 0.25 + success_rate * 0.15 + cost_score * 0.1)
        else:  # balanced
            fitness = (quality_score * 0.35 + success_rate * 0.25 + cost_score * 0.2 + latency_score * 0.2)

        # Add experience bonus
        fitness += experience_bonus

        return min(1.0, fitness)

    # ==================== STATISTICS ====================

    def get_workflow_stats(
        self,
        task_type: str,
        top_n: int = 5
    ) -> WorkflowStats:
        """
        Get statistics for workflows of a given task type.

        Returns aggregate metrics and top performing workflows.
        """
        WorkflowExecution = self._get_workflow_execution_model()

        # Get all executions
        executions = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.task_type == task_type,
            WorkflowExecution.status == "completed"
        ).all()

        if not executions:
            return WorkflowStats(
                task_type=task_type,
                total_executions=0,
                unique_workflows=0,
                best_workflow=None,
                avg_cost=0.0,
                avg_quality=0.0,
                avg_latency_ms=0,
                cost_quality_ratio=0.0,
                top_workflows=[]
            )

        # Calculate aggregates (using hybrid quality scores)
        total_cost = sum(e.cost or 0 for e in executions)
        total_quality = sum(self._get_effective_quality(e) for e in executions)
        total_latency = sum(e.latency_ms or 0 for e in executions)

        avg_cost = total_cost / len(executions)
        avg_quality = total_quality / len(executions)
        avg_latency = int(total_latency / len(executions))

        # Cost/quality ratio (lower is better)
        cost_quality_ratio = avg_cost / avg_quality if avg_quality > 0 else float('inf')

        # Get unique workflows
        unique_signatures = set(e.workflow_signature for e in executions if e.workflow_signature)

        # Get top workflows
        top_workflows = []
        for sig in unique_signatures:
            dna = self._get_workflow_dna(sig, task_type, executions)
            if dna:
                top_workflows.append(dna)

        # Sort by fitness
        top_workflows.sort(key=lambda w: w.fitness_score, reverse=True)
        top_workflows = top_workflows[:top_n]

        best = top_workflows[0] if top_workflows else None

        return WorkflowStats(
            task_type=task_type,
            total_executions=len(executions),
            unique_workflows=len(unique_signatures),
            best_workflow=best,
            avg_cost=avg_cost,
            avg_quality=avg_quality,
            avg_latency_ms=avg_latency,
            cost_quality_ratio=cost_quality_ratio,
            top_workflows=top_workflows
        )

    def _get_workflow_dna(
        self,
        signature: str,
        task_type: str,
        all_executions: List
    ) -> Optional[WorkflowDNA]:
        """Build WorkflowDNA from execution data."""
        execs = [e for e in all_executions if e.workflow_signature == signature]
        if not execs:
            return None

        avg_cost = sum(e.cost or 0 for e in execs) / len(execs)
        avg_latency = sum(e.latency_ms or 0 for e in execs) / len(execs)
        avg_quality = sum(self._get_effective_quality(e) for e in execs) / len(execs)
        success_count = sum(1 for e in execs if e.status == "completed")
        success_rate = success_count / len(execs)

        fitness = self._calculate_fitness(
            quality=avg_quality,
            cost=avg_cost,
            latency=avg_latency,
            success_rate=success_rate,
            execution_count=len(execs),
            goal="balanced"
        )

        return WorkflowDNA(
            signature=signature,
            task_type=task_type,
            agents=execs[0].agents_used or [],
            node_count=execs[0].nodes_total or 0,
            avg_cost=avg_cost,
            avg_latency_ms=int(avg_latency),
            avg_quality_score=avg_quality,
            execution_count=len(execs),
            success_rate=success_rate,
            fitness_score=fitness
        )

    def get_all_task_types(self) -> List[str]:
        """Get all task types that have execution data."""
        WorkflowExecution = self._get_workflow_execution_model()

        result = self.db.query(WorkflowExecution.task_type).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.task_type.isnot(None)
        ).distinct().all()

        return [r[0] for r in result if r[0]]

    # ==================== AGENT PERFORMANCE ====================

    def get_agent_performance(
        self,
        agent_name: str = None
    ) -> List['AgentPerformance']:
        """
        Get per-agent performance stats aggregated from WorkflowExecution history.

        Groups all completed executions by agent name (from team_composition),
        and computes quality, cost, success, and trend metrics for each.

        Args:
            agent_name: If set, return stats for only this agent.

        Returns:
            List of AgentPerformance, sorted by avg_quality descending.
        """
        WorkflowExecution = self._get_workflow_execution_model()

        executions = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.status == "completed"
        ).order_by(WorkflowExecution.created_at.asc()).all()

        if not executions:
            return []

        # Group executions by agent name
        # agent_name -> list of (execution, agent_info_dict)
        agent_executions: Dict[str, List[Tuple]] = {}

        for ex in executions:
            composition = ex.team_composition or []
            for member in composition:
                name = member.get("agent_name", "")
                if not name:
                    continue
                if agent_name and name != agent_name:
                    continue
                if name not in agent_executions:
                    agent_executions[name] = []
                agent_executions[name].append((ex, member))

        results = []
        for name, exec_pairs in agent_executions.items():
            execs = [pair[0] for pair in exec_pairs]
            first_member = exec_pairs[0][1]  # agent_info from first execution

            # Quality stats
            qualities = [self._get_effective_quality(e) for e in execs]
            avg_quality = sum(qualities) / len(qualities)
            best_quality = max(qualities)
            worst_quality = min(qualities)

            # Cost
            avg_cost = sum(e.cost or 0 for e in execs) / len(execs)

            # Success rate
            success_count = sum(1 for e in execs if e.status == "completed")
            success_rate = success_count / len(execs)

            # User ratings (only where rated)
            rated_execs = [e for e in execs if e.user_rating is not None]
            user_avg_rating = (
                sum(e.user_rating for e in rated_execs) / len(rated_execs)
                if rated_execs else 0.0
            )

            # Best task type (which task_type has highest avg quality for this agent)
            type_qualities: Dict[str, List[float]] = {}
            for e in execs:
                tt = e.task_type or "general"
                if tt not in type_qualities:
                    type_qualities[tt] = []
                type_qualities[tt].append(self._get_effective_quality(e))

            best_task_type = max(
                type_qualities,
                key=lambda t: sum(type_qualities[t]) / len(type_qualities[t])
            ) if type_qualities else "general"

            # Trend: compare last 5 vs prior 5
            trend = "stable"
            if len(qualities) >= 4:
                mid = max(len(qualities) - 5, len(qualities) // 2)
                recent_avg = sum(qualities[mid:]) / len(qualities[mid:])
                prior_avg = sum(qualities[:mid]) / len(qualities[:mid])
                diff = recent_avg - prior_avg
                if diff > 0.05:
                    trend = "improving"
                elif diff < -0.05:
                    trend = "declining"

            results.append(AgentPerformance(
                agent_name=name,
                agent_id=first_member.get("agent_id", 0),
                total_executions=len(execs),
                avg_quality=avg_quality,
                best_quality=best_quality,
                worst_quality=worst_quality,
                avg_cost=avg_cost,
                success_rate=success_rate,
                user_avg_rating=user_avg_rating,
                rated_count=len(rated_execs),
                best_task_type=best_task_type,
                trend=trend,
            ))

        # Sort by avg_quality descending
        results.sort(key=lambda a: a.avg_quality, reverse=True)
        return results

    # ==================== SUGGESTIONS ====================

    def suggest_improvements(
        self,
        current_signature: str = None,
        task_type: str = None,
        current_agents: List[str] = None
    ) -> List[EvolutionSuggestion]:
        """
        Suggest improvements for a workflow based on historical data.

        Analyzes what has worked well in the past and suggests changes.
        """
        suggestions = []

        if not task_type:
            return suggestions

        # Get stats for this task type
        stats = self.get_workflow_stats(task_type)

        if stats.total_executions < 2:
            suggestions.append(EvolutionSuggestion(
                suggestion_type="need_more_data",
                description="Not enough execution data to make suggestions. Run more workflows first.",
                confidence=1.0,
                expected_improvement="N/A",
                details={"executions_needed": 5, "current_executions": stats.total_executions}
            ))
            return suggestions

        # Check if there's a better workflow
        if stats.best_workflow and current_signature:
            if stats.best_workflow.signature != current_signature:
                improvement = stats.best_workflow.fitness_score - 0.5  # Assume current is average
                suggestions.append(EvolutionSuggestion(
                    suggestion_type="use_proven_workflow",
                    description=f"A better performing workflow exists with {len(stats.best_workflow.agents)} agents",
                    confidence=min(0.9, stats.best_workflow.execution_count * 0.1),
                    expected_improvement=f"+{improvement*100:.0f}% fitness score",
                    details={
                        "recommended_agents": stats.best_workflow.agents,
                        "avg_quality": stats.best_workflow.avg_quality_score,
                        "avg_cost": stats.best_workflow.avg_cost,
                    }
                ))

        # Analyze agent patterns
        if current_agents and stats.best_workflow:
            best_agents = set(stats.best_workflow.agents)
            current_set = set(current_agents)

            # Missing agents that top workflows use
            missing = best_agents - current_set
            if missing:
                suggestions.append(EvolutionSuggestion(
                    suggestion_type="add_agent",
                    description=f"Top workflows often include: {', '.join(missing)}",
                    confidence=0.6,
                    expected_improvement="Potentially higher quality output",
                    details={"agents_to_add": list(missing)}
                ))

            # Extra agents not in top workflows
            extra = current_set - best_agents
            if extra and len(current_agents) > len(stats.best_workflow.agents):
                suggestions.append(EvolutionSuggestion(
                    suggestion_type="remove_agent",
                    description=f"These agents may be unnecessary: {', '.join(extra)}",
                    confidence=0.4,
                    expected_improvement="Lower cost with similar quality",
                    details={"agents_to_remove": list(extra)}
                ))

        # Cost optimization suggestion
        if stats.avg_cost > 10 and stats.cost_quality_ratio > 20:
            suggestions.append(EvolutionSuggestion(
                suggestion_type="optimize_cost",
                description="Workflows are expensive relative to quality. Consider simpler approaches.",
                confidence=0.5,
                expected_improvement=f"Reduce cost from ${stats.avg_cost:.2f} average",
                details={"current_avg_cost": stats.avg_cost, "cost_quality_ratio": stats.cost_quality_ratio}
            ))

        return suggestions

    # ==================== MUTATION ====================

    def mutate_workflow(
        self,
        workflow_dna: WorkflowDNA,
        mutation_rate: float = 0.3
    ) -> WorkflowDNA:
        """
        Create a mutated variation of a workflow.

        Simple mutations:
        - Add an agent (critic, reviewer)
        - Remove an agent
        - Reorder agents

        This is exploratory - creates variations to discover better patterns.
        """
        agents = workflow_dna.agents.copy()
        mutated = False

        # Possible agents to add
        potential_additions = [
            "Critic", "Reviewer", "Editor", "Quality Checker",
            "Researcher", "Analyst", "Summarizer"
        ]

        # Random mutation based on rate
        if random.random() < mutation_rate:
            mutation_type = random.choice(["add", "remove", "reorder"])

            if mutation_type == "add" and len(agents) < 6:
                # Add a new agent
                new_agent = random.choice(potential_additions)
                if new_agent not in agents:
                    agents.append(new_agent)
                    mutated = True

            elif mutation_type == "remove" and len(agents) > 2:
                # Remove a random agent (not the first one)
                if len(agents) > 2:
                    idx = random.randint(1, len(agents) - 1)
                    agents.pop(idx)
                    mutated = True

            elif mutation_type == "reorder" and len(agents) > 2:
                # Swap two adjacent agents
                idx = random.randint(0, len(agents) - 2)
                agents[idx], agents[idx + 1] = agents[idx + 1], agents[idx]
                mutated = True

        # Compute new signature
        new_signature = self._compute_signature(agents)

        return WorkflowDNA(
            signature=new_signature,
            task_type=workflow_dna.task_type,
            agents=agents,
            node_count=len(agents),
            avg_cost=0.0,  # Unknown for new workflow
            avg_latency_ms=0,
            avg_quality_score=0.0,
            execution_count=0,
            success_rate=0.0,
            fitness_score=0.0  # Will be calculated after execution
        )

    def _compute_signature(self, agents: List[str]) -> str:
        """Compute a signature hash for a list of agents."""
        data = json.dumps({"agents": sorted(agents)}, sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    # ==================== COMPARISON ====================

    def compare_workflows(
        self,
        signature_a: str,
        signature_b: str,
        task_type: str
    ) -> Dict[str, Any]:
        """
        Compare two workflows head-to-head.

        Returns detailed comparison of their performance metrics.
        """
        WorkflowExecution = self._get_workflow_execution_model()

        # Get executions for both
        execs_a = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.task_type == task_type,
            WorkflowExecution.workflow_signature == signature_a,
            WorkflowExecution.status == "completed"
        ).all()

        execs_b = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.team_id == self.team_id,
            WorkflowExecution.task_type == task_type,
            WorkflowExecution.workflow_signature == signature_b,
            WorkflowExecution.status == "completed"
        ).all()

        def calc_metrics(execs):
            if not execs:
                return None
            return {
                "execution_count": len(execs),
                "avg_cost": sum(e.cost or 0 for e in execs) / len(execs),
                "avg_quality": sum(self._get_effective_quality(e) for e in execs) / len(execs),
                "avg_latency_ms": sum(e.latency_ms or 0 for e in execs) / len(execs),
                "agents": execs[0].agents_used or [],
            }

        metrics_a = calc_metrics(execs_a)
        metrics_b = calc_metrics(execs_b)

        winner = None
        if metrics_a and metrics_b:
            score_a = self._calculate_fitness(
                metrics_a["avg_quality"], metrics_a["avg_cost"],
                metrics_a["avg_latency_ms"], 1.0, metrics_a["execution_count"]
            )
            score_b = self._calculate_fitness(
                metrics_b["avg_quality"], metrics_b["avg_cost"],
                metrics_b["avg_latency_ms"], 1.0, metrics_b["execution_count"]
            )
            winner = "A" if score_a > score_b else "B" if score_b > score_a else "Tie"

        return {
            "workflow_a": {"signature": signature_a, "metrics": metrics_a},
            "workflow_b": {"signature": signature_b, "metrics": metrics_b},
            "winner": winner,
        }

    # ==================== QUALITY SCORING ====================

    def _get_effective_quality(self, execution) -> float:
        """
        Get the best available quality score for a WorkflowExecution.

        Uses hybrid formula:
          With user_rating: 0.6 * user_norm + 0.3 * llm_judge + 0.1 * proxy
          Without user:     0.7 * llm_judge + 0.3 * proxy
          Fallback:         quality_score or 0.5
        """
        proxy = getattr(execution, 'proxy_score', None)
        llm_judge = getattr(execution, 'llm_judge_score', None)
        user_rating = getattr(execution, 'user_rating', None)

        if user_rating is not None and llm_judge is not None:
            user_norm = (user_rating - 1) / 4.0
            p = proxy if proxy is not None else 0.5
            return 0.6 * user_norm + 0.3 * llm_judge + 0.1 * p
        elif llm_judge is not None:
            p = proxy if proxy is not None else 0.5
            return 0.7 * llm_judge + 0.3 * p
        elif execution.quality_score is not None:
            return execution.quality_score
        else:
            return 0.5

    def estimate_quality_score(
        self,
        output_length: int,
        execution_time_ms: int,
        nodes_completed: int,
        nodes_total: int,
        assumptions_answered: int = 0
    ) -> float:
        """
        Estimate a proxy quality score for an execution (Layer 1).

        This is a simple heuristic. For full quality scoring, use QualityEvaluator
        which adds LLM-as-judge (Layer 2) and user ratings (Layer 3).

        Returns a score between 0.0 and 1.0.
        """
        from .quality_evaluator import QualityEvaluator
        return QualityEvaluator.compute_proxy_score(
            output_length=output_length,
            execution_time_ms=execution_time_ms,
            nodes_completed=nodes_completed,
            nodes_total=nodes_total,
            assumptions_answered=assumptions_answered,
        )
