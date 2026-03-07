"""
MATH Level 4-5 (competition-level) benchmark subclass.

Filters the MATH dataset to only include Level 4 and Level 5 problems,
which are the hardest competition-style problems requiring multi-step
reasoning — a better fit for hierarchical team orchestration than
easier levels where a single agent suffices.
"""
import os
import sys
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.benchmark.math_benchmark import MATH, download_raw_math_data

HARD_LEVELS = {"Level 4", "Level 5"}


class MATHLevel45(MATH):
    """MATH benchmark filtered to Level 4 and Level 5 problems only."""

    def _load_data(self):
        if not os.path.exists(os.path.join(self.path, "MATH")):
            download_raw_math_data(save_folder=self.path)
        data_folder = os.path.join(self.path, "MATH")

        if self.mode in ("train", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "train"))
            self._train_data = [ex for ex in raw if ex.get("level") in HARD_LEVELS]

        if self.mode in ("dev", "all"):
            self._dev_data = None  # MATH has no dev split

        if self.mode in ("test", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "test"))
            self._test_data = [ex for ex in raw if ex.get("level") in HARD_LEVELS]
