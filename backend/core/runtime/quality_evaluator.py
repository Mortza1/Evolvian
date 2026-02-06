"""
Quality Evaluator - Hybrid quality scoring for workflow executions.

Uses a 3-layer approach:
  Layer 1: Proxy metrics (automated, immediate) - output length, completion rate, etc.
  Layer 2: LLM-as-judge (automated, post-execution) - evaluates on quality dimensions
  Layer 3: User ratings (manual, optional) - strongest signal when available

Combined fitness score:
  With user rating:  0.6 * user_normalized + 0.3 * llm_judge + 0.1 * proxy
  Without:           0.7 * llm_judge + 0.3 * proxy
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
import json
import re


@dataclass
class QualityResult:
    """Result from LLM-as-judge evaluation."""
    score: float  # 0.0 - 1.0
    rationale: str
    dimensions: Dict[str, float]  # per-dimension scores


class QualityEvaluator:
    """
    Evaluates workflow output quality using LLM-as-judge.

    Usage:
        evaluator = QualityEvaluator(llm_service)
        result = evaluator.evaluate_output(
            task_description="Create a marketing plan",
            output="Here is the plan...",
            agent_outputs={"Researcher": "...", "Writer": "..."}
        )
        # result.score = 0.78, result.rationale = "Good coverage but..."
    """

    # The judge prompt template
    JUDGE_PROMPT = """You are a quality evaluator. Score the following workflow output on 5 dimensions (each 0-10):

1. **Relevance**: Does the output address the original task?
2. **Completeness**: Does it cover all aspects requested?
3. **Specificity**: Does it provide concrete, actionable details (not vague)?
4. **Coherence**: Is it well-structured and logically organized?
5. **Quality**: Is the writing/analysis professional and insightful?

## Task
{task_description}

## Output to Evaluate
{output}

Respond in EXACTLY this JSON format (no other text):
{{
  "relevance": <0-10>,
  "completeness": <0-10>,
  "specificity": <0-10>,
  "coherence": <0-10>,
  "quality": <0-10>,
  "rationale": "<1-2 sentence summary of strengths and weaknesses>"
}}"""

    def __init__(self, llm_service):
        self.llm_service = llm_service

    def evaluate_output(
        self,
        task_description: str,
        output: str,
        agent_outputs: Optional[Dict[str, str]] = None,
    ) -> QualityResult:
        """
        Evaluate output quality using LLM-as-judge.

        Args:
            task_description: The original task/goal
            output: Combined or final output text
            agent_outputs: Optional per-agent outputs for context

        Returns:
            QualityResult with score (0-1), rationale, and per-dimension scores
        """
        # Build the output text to evaluate (truncate if very long)
        eval_text = output
        if agent_outputs:
            parts = []
            for agent_name, agent_output in agent_outputs.items():
                preview = agent_output[:500] if len(agent_output) > 500 else agent_output
                parts.append(f"### {agent_name}\n{preview}")
            eval_text = "\n\n".join(parts)

        if len(eval_text) > 3000:
            eval_text = eval_text[:3000] + "\n... (truncated)"

        prompt = self.JUDGE_PROMPT.format(
            task_description=task_description,
            output=eval_text,
        )

        try:
            response = self.llm_service.simple_chat(
                user_message=prompt,
                system_prompt="You are a strict but fair quality evaluator. Always respond with valid JSON only."
            )
            return self._parse_judge_response(response)
        except Exception as e:
            print(f"[QualityEvaluator] LLM judge failed: {e}")
            return QualityResult(
                score=0.5,
                rationale=f"Evaluation failed: {e}",
                dimensions={}
            )

    def _parse_judge_response(self, response: str) -> QualityResult:
        """Parse the LLM judge response into a QualityResult."""
        # Try to extract JSON from the response
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if not json_match:
            return QualityResult(score=0.5, rationale="Could not parse judge response", dimensions={})

        try:
            data = json.loads(json_match.group())
        except json.JSONDecodeError:
            return QualityResult(score=0.5, rationale="Invalid JSON from judge", dimensions={})

        dimensions = {}
        dimension_keys = ["relevance", "completeness", "specificity", "coherence", "quality"]
        total = 0.0
        count = 0

        for key in dimension_keys:
            val = data.get(key)
            if val is not None:
                try:
                    score = float(val)
                    score = max(0, min(10, score))  # Clamp to 0-10
                    dimensions[key] = score / 10.0  # Normalize to 0-1
                    total += dimensions[key]
                    count += 1
                except (ValueError, TypeError):
                    pass

        # Average of all dimensions
        avg_score = total / count if count > 0 else 0.5

        rationale = data.get("rationale", "No rationale provided")

        return QualityResult(
            score=round(avg_score, 3),
            rationale=rationale,
            dimensions=dimensions,
        )

    @staticmethod
    def compute_proxy_score(
        output_length: int,
        execution_time_ms: int,
        nodes_completed: int,
        nodes_total: int,
        tools_used: int = 0,
        assumptions_answered: int = 0,
    ) -> float:
        """
        Compute Layer 1 proxy score from automated metrics.

        Returns a score between 0.0 and 1.0.
        """
        score = 0.5  # Base score

        # Completion bonus
        if nodes_total > 0:
            completion_rate = nodes_completed / nodes_total
            score += completion_rate * 0.2

        # Output length bonus
        if output_length > 100:
            score += 0.05
        if output_length > 500:
            score += 0.05
        if output_length > 1000:
            score += 0.05

        # Speed bonus (under 30s)
        if execution_time_ms < 30000:
            score += 0.05

        # Tool usage bonus (agents that use tools tend to produce better output)
        if tools_used > 0:
            score += min(0.05, tools_used * 0.02)

        # Assumptions answered bonus
        if assumptions_answered > 0:
            score += min(0.05, assumptions_answered * 0.02)

        return min(1.0, max(0.0, round(score, 3)))

    @staticmethod
    def compute_hybrid_score(
        proxy_score: float,
        llm_judge_score: Optional[float] = None,
        user_rating: Optional[int] = None,
    ) -> float:
        """
        Compute the combined hybrid quality score.

        Formula:
          With user rating:  0.6 * user_normalized + 0.3 * llm_judge + 0.1 * proxy
          Without user:      0.7 * llm_judge + 0.3 * proxy
          No LLM judge:      proxy_score only
        """
        if user_rating is not None and llm_judge_score is not None:
            user_normalized = (user_rating - 1) / 4.0  # Map 1-5 to 0.0-1.0
            return round(
                0.6 * user_normalized + 0.3 * llm_judge_score + 0.1 * proxy_score,
                3
            )
        elif llm_judge_score is not None:
            return round(
                0.7 * llm_judge_score + 0.3 * proxy_score,
                3
            )
        else:
            return proxy_score
