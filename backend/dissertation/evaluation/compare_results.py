"""
Phase 6: Statistical comparison and dissertation tables.

Loads all results/config_*.json files, computes mean ± std per config × benchmark,
runs pairwise significance tests, and prints the dissertation comparison tables.
Optionally generates bar charts with matplotlib.

Usage:
    python -m dissertation.evaluation.compare_results
    python -m dissertation.evaluation.compare_results --plot
    python -m dissertation.evaluation.compare_results --latex
    python -m dissertation.evaluation.compare_results --plot --save-dir dissertation/figures
"""
import sys
import json
import argparse
import itertools
from pathlib import Path
from collections import defaultdict
from typing import Optional

import numpy as np
from scipy import stats

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "evoAgentX"))
from dissertation.config import RESULTS_DIR


# Config / benchmark ordering (for consistent table layout)

CONFIG_ORDER   = ["A", "B", "C", "D"]
CONFIG_LABELS  = {
    "A": "Config A (Single)",
    "B": "Config B (Pipeline)",
    "C": "Config C (Hier.)",
    "D": "Config D (Hier.+Evo)",
}
BENCH_ORDER    = ["hotpotqa", "math", "math_moderate", "mbpp", "gaia"]
BENCH_LABELS   = {
    "hotpotqa":      "HotPotQA",
    "math":          "MATH",
    "math_moderate": "MATH L2-3",
    "math_hard":     "MATH L4-5",
    "mbpp":          "MBPP",
    "gaia":          "GAIA",
    **{f"math_l{i}": f"MATH L{i}" for i in range(1, 6)},
}
BENCH_METRICS  = {
    "hotpotqa":      "f1",
    "math":          "acc",
    "math_moderate": "solve_rate",
    "math_hard":     "solve_rate",
    "mbpp":          "pass_at_1",
    "gaia":          "acc",
    **{f"math_l{i}": "solve_rate" for i in range(1, 6)},
}

SIG_LEVELS = [(0.01, "**"), (0.05, "*")]   # tightest first


# Data loading

def load_results(results_dir: Path = RESULTS_DIR) -> dict:
    """
    Load all config_*.json files.

    Returns:
        {config → {benchmark → [primary_value, ...]}}
    """
    data: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    for f in sorted(results_dir.glob("config_*.json")):
        try:
            r = json.loads(f.read_text())
        except Exception as e:
            print(f"  Warning: could not parse {f.name}: {e}")
            continue

        config = r.get("config", "?")
        bench  = r.get("benchmark", "?")
        value  = r.get("primary_value", None)
        if value is None:
            # Fallback: read from metrics using primary_metric key
            pm = r.get("primary_metric", "")
            value = r.get("metrics", {}).get(pm, None)
        if value is not None:
            data[config][bench].append(float(value))

    return data


def load_overhead(results_dir: Path = RESULTS_DIR) -> dict:
    """
    Load elapsed_seconds per config × benchmark (mean across runs).

    Returns:
        {config → {benchmark → mean_seconds}}
    """
    raw: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for f in sorted(results_dir.glob("config_*.json")):
        try:
            r = json.loads(f.read_text())
        except Exception:
            continue
        config = r.get("config", "?")
        bench  = r.get("benchmark", "?")
        t      = r.get("elapsed_seconds", None)
        if t is not None:
            raw[config][bench].append(float(t))

    result: dict[str, dict[str, float]] = {}
    for cfg, benches in raw.items():
        result[cfg] = {b: float(np.mean(vs)) for b, vs in benches.items()}
    return result


# Statistical tests

def significance_marker(p: float) -> str:
    for threshold, marker in SIG_LEVELS:
        if p < threshold:
            return marker
    return ""


def pairwise_tests(data: dict) -> dict:
    """
    Run pairwise Wilcoxon signed-rank (or t-test if n < 4) tests for every
    pair of configs on each benchmark.

    Returns:
        {benchmark → {(cfg_a, cfg_b) → {"p": float, "sig": str}}}
    """
    results: dict[str, dict] = defaultdict(dict)
    all_configs = [c for c in CONFIG_ORDER if c in data]
    all_benches = sorted({b for cfg in data.values() for b in cfg})

    for bench in all_benches:
        for ca, cb in itertools.combinations(all_configs, 2):
            va = data.get(ca, {}).get(bench, [])
            vb = data.get(cb, {}).get(bench, [])
            if len(va) < 2 or len(vb) < 2:
                results[bench][(ca, cb)] = {"p": None, "sig": ""}
                continue
            # Paired test if same length, unpaired otherwise
            try:
                if len(va) == len(vb):
                    try:
                        _, p = stats.wilcoxon(va, vb, alternative="two-sided")
                    except ValueError:
                        _, p = stats.ttest_rel(va, vb)
                else:
                    _, p = stats.ttest_ind(va, vb, equal_var=False)
                # Guard against NaN (e.g. identical arrays)
                if np.isnan(p):
                    results[bench][(ca, cb)] = {"p": None, "sig": ""}
                else:
                    results[bench][(ca, cb)] = {"p": p, "sig": significance_marker(p)}
            except Exception:
                results[bench][(ca, cb)] = {"p": None, "sig": ""}

    return results


# Formatting helpers

def fmt_score(values: list[float]) -> str:
    """Format as mean ± std (or single value if only one run)."""
    if not values:
        return "  —  "
    if len(values) == 1:
        return f"{values[0]:.4f}"
    return f"{np.mean(values):.4f} ±{np.std(values):.4f}"


def delta_str(base: list[float], comp: list[float]) -> str:
    """Return Δ = mean(comp) − mean(base) with sign."""
    if not base or not comp:
        return "  —"
    d = np.mean(comp) - np.mean(base)
    sign = "+" if d >= 0 else ""
    return f"{sign}{d:.4f}"


def _col(text: str, width: int, align: str = "<") -> str:
    fmt = f"{{:{align}{width}}}"
    return fmt.format(text)


# Table 1 — Performance comparison

def print_performance_table(data: dict, tests: dict) -> None:
    """Print Table 1: performance (primary metric) per config × benchmark."""
    present_benches = [b for b in BENCH_ORDER if b in {bb for cfg in data.values() for bb in cfg}]
    present_configs = [c for c in CONFIG_ORDER if c in data]

    col_w = 20   # per-config column width
    bench_w = 12

    header = _col("Benchmark", bench_w)
    for cfg in present_configs:
        header += " │ " + _col(CONFIG_LABELS[cfg], col_w)
    # Delta columns: B vs A (specialisation), C vs B (hierarchy), D vs C (evolution)
    if "A" in data and "B" in data:
        header += " │ " + _col("Δ B vs A", 10)
    if "B" in data and "C" in data:
        header += " │ " + _col("Δ C vs B", 10)
    if "C" in data and "D" in data:
        header += " │ " + _col("Δ D vs C", 10)

    sep = "─" * len(header)
    print("\n" + sep)
    print("TABLE 1 — Primary Metric Comparison")
    print(sep)
    print(header)
    print(sep)

    for bench in present_benches:
        metric = BENCH_METRICS.get(bench, "?")
        label  = BENCH_LABELS.get(bench, bench)

        row = _col(f"{label} ({metric})", bench_w)
        for cfg in present_configs:
            vals = data.get(cfg, {}).get(bench, [])
            row += " │ " + _col(fmt_score(vals), col_w)

        # Deltas: B vs A (specialisation value)
        if "A" in data and "B" in data:
            a_vals = data.get("A", {}).get(bench, [])
            b_vals = data.get("B", {}).get(bench, [])
            sig = tests.get(bench, {}).get(("A", "B"), {}).get("sig", "")
            row += " │ " + _col(delta_str(a_vals, b_vals) + sig, 10)
        # Deltas: C vs B (hierarchy value)
        if "B" in data and "C" in data:
            b_vals = data.get("B", {}).get(bench, [])
            c_vals = data.get("C", {}).get(bench, [])
            sig = tests.get(bench, {}).get(("B", "C"), {}).get("sig", "")
            row += " │ " + _col(delta_str(b_vals, c_vals) + sig, 10)
        # Deltas: D vs C (evolution value)
        if "C" in data and "D" in data:
            c_vals = data.get("C", {}).get(bench, [])
            d_vals = data.get("D", {}).get(bench, [])
            sig = tests.get(bench, {}).get(("C", "D"), {}).get("sig", "")
            row += " │ " + _col(delta_str(c_vals, d_vals) + sig, 10)

        print(row)

    print(sep)
    print("  * p < 0.05   ** p < 0.01   (Wilcoxon signed-rank or Welch t-test)")
    print(sep)


# Table 2 — Overhead comparison

def print_overhead_table(overhead: dict) -> None:
    """Print Table 2: wall-clock time per config × benchmark."""
    present_benches = [b for b in BENCH_ORDER if any(b in v for v in overhead.values())]
    present_configs = [c for c in CONFIG_ORDER if c in overhead]

    if not present_benches or not present_configs:
        return

    col_w = 14
    bench_w = 12

    header = _col("Benchmark", bench_w)
    for cfg in present_configs:
        header += " │ " + _col(f"{cfg} Time (s)", col_w)
    if "A" in overhead and "B" in overhead:
        header += " │ " + _col("B/A", col_w)
    if "A" in overhead and "C" in overhead:
        header += " │ " + _col("C/A", col_w)
    if "A" in overhead and "D" in overhead:
        header += " │ " + _col("D/A", col_w)

    sep = "─" * len(header)
    print("\n" + sep)
    print("TABLE 2 — Wall-clock Time Overhead")
    print(sep)
    print(header)
    print(sep)

    for bench in present_benches:
        label = BENCH_LABELS.get(bench, bench)
        row   = _col(label, bench_w)

        times = {}
        for cfg in present_configs:
            t = overhead.get(cfg, {}).get(bench, None)
            times[cfg] = t
            row += " │ " + _col(f"{t:.1f}" if t is not None else "—", col_w)

        ta = times.get("A")
        for compare_cfg in ["B", "C", "D"]:
            if "A" in overhead and compare_cfg in overhead:
                tc = times.get(compare_cfg)
                if ta and tc:
                    row += " │ " + _col(f"×{tc/ta:.2f}", col_w)
                else:
                    row += " │ " + _col("—", col_w)

        print(row)

    print(sep)


# Table 3 — Significance test summary

def print_significance_table(tests: dict, data: dict) -> None:
    """Print full p-value table for all pairwise comparisons."""
    all_benches = sorted({b for cfg in data.values() for b in cfg})
    pairs = list(itertools.combinations([c for c in CONFIG_ORDER if c in data], 2))
    if not pairs:
        return

    col_w = 16
    bench_w = 12

    header = _col("Benchmark", bench_w)
    for ca, cb in pairs:
        header += " │ " + _col(f"p ({ca} vs {cb})", col_w)

    sep = "─" * len(header)
    print("\n" + sep)
    print("TABLE 3 — Pairwise Significance Tests")
    print(sep)
    print(header)
    print(sep)

    for bench in all_benches:
        label = BENCH_LABELS.get(bench, bench)
        row   = _col(label, bench_w)
        for ca, cb in pairs:
            entry = tests.get(bench, {}).get((ca, cb), {})
            p = entry.get("p", None)
            sig = entry.get("sig", "")
            if p is None:
                row += " │ " + _col("n/a (≤1 run)", col_w)
            else:
                row += " │ " + _col(f"{p:.4f}{sig}", col_w)
        print(row)

    print(sep)
    print("  * p < 0.05   ** p < 0.01")
    print(sep)


# LaTeX output

def print_latex_table(data: dict, tests: dict) -> None:
    """Print Table 1 as a LaTeX booktabs table."""
    present_benches = [b for b in BENCH_ORDER if b in {bb for cfg in data.values() for bb in cfg}]
    present_configs = [c for c in CONFIG_ORDER if c in data]

    cols = "l" + "r" * len(present_configs)
    # Delta columns: B vs A, C vs B, D vs C
    delta_pairs = [("A", "B"), ("B", "C"), ("C", "D")]
    present_deltas = [(a, b) for a, b in delta_pairs if a in data and b in data]
    cols += "r" * len(present_deltas)

    print("\n% ── LaTeX Table 1 (copy into dissertation) ──────────────────")
    print("\\begin{table}[t]")
    print("  \\centering")
    print(f"  \\begin{{tabular}}{{{cols}}}")
    print("  \\toprule")

    header_parts = ["Benchmark"]
    for cfg in present_configs:
        header_parts.append(CONFIG_LABELS[cfg].replace("+", "\\texttt{+}"))
    for a, b in present_deltas:
        header_parts.append(f"$\\Delta$ {b}{{\\,}}vs{{\\,}}{a}")
    print("  " + " & ".join(header_parts) + " \\\\")
    print("  \\midrule")

    for bench in present_benches:
        metric = BENCH_METRICS.get(bench, "?")
        label  = BENCH_LABELS.get(bench, bench)
        parts  = [f"{label} ({metric})"]

        for cfg in present_configs:
            vals = data.get(cfg, {}).get(bench, [])
            if not vals:
                parts.append("---")
            elif len(vals) == 1:
                parts.append(f"{vals[0]:.4f}")
            else:
                parts.append(f"${np.mean(vals):.4f}\\pm{np.std(vals):.4f}$")

        for a, b in present_deltas:
            a_vals = data.get(a, {}).get(bench, [])
            b_vals = data.get(b, {}).get(bench, [])
            sig = tests.get(bench, {}).get((a, b), {}).get("sig", "")
            if a_vals and b_vals:
                d = np.mean(b_vals) - np.mean(a_vals)
                parts.append(f"${'+' if d >= 0 else ''}{d:.4f}${sig}")
            else:
                parts.append("---")

        print("  " + " & ".join(parts) + " \\\\")

    print("  \\bottomrule")
    print("  \\end{tabular}")
    print("  \\caption{Primary metric comparison across configurations. "
          "$^*p{<}0.05$, $^{**}p{<}0.01$ (Wilcoxon / Welch).}")
    print("  \\label{tab:results}")
    print("\\end{table}")
    print("% ──────────────────────────────────────────────────────────────\n")


# Plots

def plot_comparison(data: dict, save_dir: Optional[Path] = None) -> None:
    """
    Generate bar charts comparing configs per benchmark.
    One chart per benchmark; one grouped bar per config.
    """
    try:
        import matplotlib
        matplotlib.use("Agg" if save_dir else "macosx")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not available — skipping plots.")
        return

    present_benches = [b for b in BENCH_ORDER if b in {bb for cfg in data.values() for bb in cfg}]
    present_configs = [c for c in CONFIG_ORDER if c in data]
    if not present_benches or not present_configs:
        return

    colors = {"A": "#4C72B0", "B": "#DD8452", "C": "#55A868", "D": "#C44E52"}
    n_cfg = len(present_configs)
    x     = np.arange(len(present_benches))
    width = 0.7 / n_cfg

    fig, ax = plt.subplots(figsize=(max(6, len(present_benches) * 2.5), 5))

    for i, cfg in enumerate(present_configs):
        means, stds = [], []
        for bench in present_benches:
            vals = data.get(cfg, {}).get(bench, [])
            means.append(np.mean(vals) if vals else 0.0)
            stds.append(np.std(vals) if len(vals) > 1 else 0.0)

        offset = (i - n_cfg / 2 + 0.5) * width
        bars = ax.bar(
            x + offset, means, width,
            yerr=stds, capsize=4,
            label=CONFIG_LABELS[cfg],
            color=colors.get(cfg, "#999999"),
            alpha=0.85,
        )

    ax.set_xticks(x)
    ax.set_xticklabels([BENCH_LABELS.get(b, b) for b in present_benches])
    ax.set_ylabel("Primary Metric Score")
    ax.set_title("Performance Comparison: Configs A / B / C / D")
    ax.legend(loc="upper right")
    ax.set_ylim(bottom=0)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()

    if save_dir:
        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)
        out = save_dir / "comparison_bar.png"
        fig.savefig(out, dpi=150)
        print(f"Bar chart saved to {out}")
    else:
        plt.show()
    plt.close(fig)


def plot_overhead(overhead: dict, save_dir: Optional[Path] = None) -> None:
    """Generate a grouped bar chart for wall-clock time overhead."""
    try:
        import matplotlib
        matplotlib.use("Agg" if save_dir else "macosx")
        import matplotlib.pyplot as plt
    except ImportError:
        return

    present_benches = [b for b in BENCH_ORDER if any(b in v for v in overhead.values())]
    present_configs = [c for c in CONFIG_ORDER if c in overhead]
    if not present_benches or not present_configs:
        return

    colors = {"A": "#4C72B0", "B": "#DD8452", "C": "#55A868", "D": "#C44E52"}
    x     = np.arange(len(present_benches))
    width = 0.7 / len(present_configs)

    fig, ax = plt.subplots(figsize=(max(6, len(present_benches) * 2.5), 5))

    for i, cfg in enumerate(present_configs):
        times = [overhead.get(cfg, {}).get(b, 0.0) for b in present_benches]
        offset = (i - len(present_configs) / 2 + 0.5) * width
        ax.bar(
            x + offset, times, width,
            label=CONFIG_LABELS[cfg],
            color=colors.get(cfg, "#999999"),
            alpha=0.85,
        )

    ax.set_xticks(x)
    ax.set_xticklabels([BENCH_LABELS.get(b, b) for b in present_benches])
    ax.set_ylabel("Wall-clock Time (seconds)")
    ax.set_title("Runtime Overhead: Configs A / B / C / D")
    ax.legend(loc="upper right")
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()

    if save_dir:
        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)
        out = save_dir / "overhead_bar.png"
        fig.savefig(out, dpi=150)
        print(f"Overhead chart saved to {out}")
    else:
        plt.show()
    plt.close(fig)


# Main

def compare(
    results_dir: Path = RESULTS_DIR,
    plot: bool = False,
    latex: bool = False,
    save_dir: Optional[Path] = None,
) -> dict:
    """
    Run the full comparison pipeline and return the summary dict.

    Args:
        results_dir : Directory containing config_*.json files.
        plot        : Generate matplotlib bar charts.
        latex       : Print LaTeX table to stdout.
        save_dir    : If given, save plots here instead of showing them.

    Returns:
        {"data": ..., "overhead": ..., "tests": ...}
    """
    print(f"\nLoading results from {results_dir} …")
    data     = load_results(results_dir)
    overhead = load_overhead(results_dir)

    if not data:
        print("No results found. Run experiments first:")
        print("  python -m dissertation.scripts.run_experiment --config A --benchmark hotpotqa")
        return {}

    # Summary counts
    for cfg in CONFIG_ORDER:
        if cfg in data:
            n_runs = {b: len(v) for b, v in data[cfg].items()}
            print(f"  Config {cfg}: {n_runs}")

    tests = pairwise_tests(data)

    print_performance_table(data, tests)
    print_overhead_table(overhead)
    print_significance_table(tests, data)

    if latex:
        print_latex_table(data, tests)

    if plot:
        plot_comparison(data, save_dir=save_dir)
        plot_overhead(overhead, save_dir=save_dir)

    return {"data": data, "overhead": overhead, "tests": tests}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Phase 6: statistical comparison of dissertation results"
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=RESULTS_DIR,
        help="Directory containing config_*.json files",
    )
    parser.add_argument(
        "--plot",
        action="store_true",
        help="Generate bar charts (requires matplotlib)",
    )
    parser.add_argument(
        "--latex",
        action="store_true",
        help="Print LaTeX booktabs table to stdout",
    )
    parser.add_argument(
        "--save-dir",
        type=Path,
        default=None,
        help="Save plots to this directory (instead of displaying)",
    )
    args = parser.parse_args()

    compare(
        results_dir=args.results_dir,
        plot=args.plot,
        latex=args.latex,
        save_dir=args.save_dir,
    )
