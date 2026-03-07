"""
MATH benchmark subclasses filtered by difficulty level.

Classes:
  - MATHLevel23  — Level 2 + Level 3 (primary MATH benchmark for experiments)
  - MATHByLevel  — Parametric: takes a `level` (1-5) for per-level filtering

The primary benchmark `math_moderate` uses MATHLevel23 (Level 2-3), which is
within the capability range of gpt-4o-mini while still challenging enough to
show differentiation between configs.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))

from evoagentx.benchmark.math_benchmark import MATH, download_raw_math_data


MODERATE_LEVELS = {"Level 2", "Level 3"}


class MATHLevel23(MATH):
    """MATH benchmark filtered to Level 2 and Level 3 problems only."""

    def _load_data(self):
        if not os.path.exists(os.path.join(self.path, "MATH")):
            download_raw_math_data(save_folder=self.path)
        data_folder = os.path.join(self.path, "MATH")

        if self.mode in ("train", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "train"))
            self._train_data = [ex for ex in raw if ex.get("level") in MODERATE_LEVELS]

        if self.mode in ("dev", "all"):
            self._dev_data = None  # MATH has no dev split

        if self.mode in ("test", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "test"))
            self._test_data = [ex for ex in raw if ex.get("level") in MODERATE_LEVELS]


class MATHByLevel(MATH):
    """
    MATH benchmark filtered to a single difficulty level (1-5).

    Usage:
        bench = MATHByLevel(mode="all", level=3)
    """

    def __init__(self, level: int = 3, **kwargs):
        if level < 1 or level > 5:
            raise ValueError(f"level must be 1-5, got {level}")
        self._target_level = f"Level {level}"
        super().__init__(**kwargs)

    def _load_data(self):
        if not os.path.exists(os.path.join(self.path, "MATH")):
            download_raw_math_data(save_folder=self.path)
        data_folder = os.path.join(self.path, "MATH")

        if self.mode in ("train", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "train"))
            self._train_data = [ex for ex in raw if ex.get("level") == self._target_level]

        if self.mode in ("dev", "all"):
            self._dev_data = None  # MATH has no dev split

        if self.mode in ("test", "all"):
            raw = self._load_data_from_folders(os.path.join(data_folder, "test"))
            self._test_data = [ex for ex in raw if ex.get("level") == self._target_level]
