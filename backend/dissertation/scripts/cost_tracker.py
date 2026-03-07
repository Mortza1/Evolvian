"""
API cost tracker for dissertation experiments.

Wraps LLM calls to intercept and record token counts and costs.
Raises BudgetExceededError when the configured budget cap is hit.

Usage:
    tracker = CostTracker(budget_cap_usd=20.0)
    tracker.log_call("openai/gpt-4o-mini", input_tokens=100, output_tokens=50)
    print(tracker.report())

    # Show accumulated costs across all experiments
    python -m dissertation.scripts.cost_tracker
"""
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))


# Pricing table (USD per 1 000 tokens, as of 2025-06)

# Prices are approximate — update if OpenRouter changes them.
_PRICE_PER_1K = {
    # input_price, output_price
    "openai/gpt-4o-mini":        (0.000150, 0.000600),
    "openai/gpt-4o":             (0.002500, 0.010000),
    "anthropic/claude-3-haiku":  (0.000250, 0.001250),
    "anthropic/claude-3-sonnet": (0.003000, 0.015000),
    "anthropic/claude-3-opus":   (0.015000, 0.075000),
    # Default fallback for unknown models
    "_default":                  (0.001000, 0.002000),
}


class BudgetExceededError(RuntimeError):
    """Raised when cumulative API cost exceeds the configured budget cap."""
    pass


@dataclass
class CallRecord:
    """One logged LLM API call."""
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    experiment: str = ""
    benchmark: str = ""
    config: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class CostTracker:
    """
    Singleton-capable API cost tracker.

    Thread-safety: not thread-safe — use only from a single thread.
    Persistence: call save() / load() to persist across Python sessions.
    """

    def __init__(
        self,
        budget_cap_usd: float = 20.0,
        log_path: Optional[Path] = None,
    ):
        self.budget_cap_usd = budget_cap_usd
        self.log_path = log_path or (
            Path(__file__).parent.parent / "results" / "cost_log.json"
        )
        self.records: list[CallRecord] = []

    # ------------------------------------------------------------------
    # Core interface
    # ------------------------------------------------------------------

    def log_call(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        experiment: str = "",
        benchmark: str = "",
        config: str = "",
    ) -> float:
        """
        Record one LLM API call and return the cost in USD.

        Raises:
            BudgetExceededError: If cumulative spend exceeds budget_cap_usd.
        """
        cost = self._compute_cost(model, input_tokens, output_tokens)
        record = CallRecord(
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
            experiment=experiment,
            benchmark=benchmark,
            config=config,
        )
        self.records.append(record)

        total = self.total_cost_usd
        if total > self.budget_cap_usd:
            raise BudgetExceededError(
                f"Budget cap ${self.budget_cap_usd:.2f} exceeded! "
                f"Current spend: ${total:.4f}"
            )
        return cost

    # ------------------------------------------------------------------
    # Aggregate stats
    # ------------------------------------------------------------------

    @property
    def total_calls(self) -> int:
        return len(self.records)

    @property
    def total_input_tokens(self) -> int:
        return sum(r.input_tokens for r in self.records)

    @property
    def total_output_tokens(self) -> int:
        return sum(r.output_tokens for r in self.records)

    @property
    def total_tokens(self) -> int:
        return self.total_input_tokens + self.total_output_tokens

    @property
    def total_cost_usd(self) -> float:
        return sum(r.cost_usd for r in self.records)

    @property
    def remaining_budget_usd(self) -> float:
        return max(0.0, self.budget_cap_usd - self.total_cost_usd)

    def breakdown_by_config(self) -> dict:
        """Cost breakdown grouped by config (A, B, C)."""
        result: dict[str, dict] = {}
        for r in self.records:
            key = r.config or "unknown"
            if key not in result:
                result[key] = {"calls": 0, "tokens": 0, "cost_usd": 0.0}
            result[key]["calls"] += 1
            result[key]["tokens"] += r.input_tokens + r.output_tokens
            result[key]["cost_usd"] += r.cost_usd
        return result

    def breakdown_by_benchmark(self) -> dict:
        """Cost breakdown grouped by benchmark."""
        result: dict[str, dict] = {}
        for r in self.records:
            key = r.benchmark or "unknown"
            if key not in result:
                result[key] = {"calls": 0, "tokens": 0, "cost_usd": 0.0}
            result[key]["calls"] += 1
            result[key]["tokens"] += r.input_tokens + r.output_tokens
            result[key]["cost_usd"] += r.cost_usd
        return result

    def report(self) -> dict:
        """Full cost report as a dict (for JSON serialisation)."""
        return {
            "total_calls": self.total_calls,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_tokens": self.total_tokens,
            "total_cost_usd": round(self.total_cost_usd, 6),
            "budget_cap_usd": self.budget_cap_usd,
            "remaining_budget_usd": round(self.remaining_budget_usd, 6),
            "by_config": self.breakdown_by_config(),
            "by_benchmark": self.breakdown_by_benchmark(),
        }

    def print_report(self) -> None:
        """Print a human-readable cost summary."""
        r = self.report()
        print("\n" + "=" * 55)
        print("API COST REPORT")
        print("=" * 55)
        print(f"  Total calls      : {r['total_calls']:,}")
        print(f"  Total tokens     : {r['total_tokens']:,}")
        print(f"    Input tokens   : {r['total_input_tokens']:,}")
        print(f"    Output tokens  : {r['total_output_tokens']:,}")
        print(f"  Total cost       : ${r['total_cost_usd']:.4f}")
        print(f"  Budget cap       : ${r['budget_cap_usd']:.2f}")
        print(f"  Remaining        : ${r['remaining_budget_usd']:.4f}")

        if r["by_config"]:
            print("\n  By Config:")
            for cfg, stats in sorted(r["by_config"].items()):
                print(
                    f"    Config {cfg:<6}: {stats['calls']:>5} calls "
                    f"{stats['tokens']:>8,} tokens  ${stats['cost_usd']:.4f}"
                )

        if r["by_benchmark"]:
            print("\n  By Benchmark:")
            for bench, stats in sorted(r["by_benchmark"].items()):
                print(
                    f"    {bench:<12}: {stats['calls']:>5} calls "
                    f"{stats['tokens']:>8,} tokens  ${stats['cost_usd']:.4f}"
                )
        print("=" * 55)

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self) -> None:
        """Persist the cost log to self.log_path as JSON."""
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "budget_cap_usd": self.budget_cap_usd,
            "records": [asdict(r) for r in self.records],
        }
        self.log_path.write_text(json.dumps(data, indent=2))

    def load(self) -> None:
        """Load cost records from self.log_path (if it exists)."""
        if not self.log_path.exists():
            return
        data = json.loads(self.log_path.read_text())
        self.budget_cap_usd = data.get("budget_cap_usd", self.budget_cap_usd)
        self.records = [CallRecord(**r) for r in data.get("records", [])]

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _compute_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        in_price, out_price = _PRICE_PER_1K.get(model, _PRICE_PER_1K["_default"])
        return (input_tokens * in_price + output_tokens * out_price) / 1000.0

    def reset(self) -> None:
        """Clear all records (does not affect saved log)."""
        self.records = []


# Module-level singleton for convenience

_global_tracker: Optional[CostTracker] = None


def get_tracker(budget_cap_usd: float = 20.0) -> CostTracker:
    """Return the global CostTracker, initialising it on first call."""
    global _global_tracker
    if _global_tracker is None:
        _global_tracker = CostTracker(budget_cap_usd=budget_cap_usd)
    return _global_tracker


# CLI: show cost log

if __name__ == "__main__":
    log_path = Path(__file__).parent.parent / "results" / "cost_log.json"
    tracker = CostTracker(log_path=log_path)
    tracker.load()
    if tracker.total_calls == 0:
        print("No cost records found in", log_path)
    else:
        tracker.print_report()
