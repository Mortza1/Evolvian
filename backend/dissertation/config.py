"""
Dissertation configuration: LLM configs, budget caps, model selection.
All experiments share this config to ensure fair comparison.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add evoAgentX to path
EVOAGENTX_PATH = Path(__file__).parent.parent.parent / "evoAgentX"
if str(EVOAGENTX_PATH) not in sys.path:
    sys.path.insert(0, str(EVOAGENTX_PATH))

# Load API keys from evoAgentX .env
load_dotenv(EVOAGENTX_PATH / ".env")

from evoagentx.models.model_configs import OpenRouterConfig

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Model to use across ALL experiments (must be identical for fair comparison)
# gpt-4o-mini: cheap but capable enough for benchmarks
DEFAULT_MODEL = "openai/gpt-4o-mini"

# Budget cap: raise BudgetExceededError if exceeded
BUDGET_CAP_USD = 20.0

# Evaluation settings (match EvoAgentX paper protocol)
SAMPLE_K_VAL = 50     # Validation set size
SAMPLE_K_TEST = 100   # Test set size
NUM_RUNS = 3          # Repetitions per config for mean±std
RANDOM_SEED = 42

# Results directory
RESULTS_DIR = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)


def get_llm_config(temperature: float = 0.1, max_tokens: int = 512) -> OpenRouterConfig:
    """Get the standard LLM config for all dissertation experiments."""
    if not OPENROUTER_API_KEY:
        raise EnvironmentError("OPENROUTER_API_KEY not set. Check evoAgentX/.env")
    return OpenRouterConfig(
        model=DEFAULT_MODEL,
        openrouter_key=OPENROUTER_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
    )
