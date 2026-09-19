"""
simulation/runner.py
======================
Main simulation entry-point.

Orchestrates the full morning-rush simulation:
  1. Load config, graph, and agent matrix
  2. Initialise PheromoneMap and Colony
  3. Advance the clock in 5-minute steps from sim_start_hour to sim_end_hour
  4. At each step, dispatch agents departing in that window to Colony.route_batch()
  5. Accumulate results and write incrementally to output files
  6. Emit per-step statistics to stdout

Usage:
  python simulation/runner.py --config config/pune_config.yaml [options]

Options:
  --config         Path to YAML config  (default: config/pune_config.yaml)
  --agents         Override n_synthetic_agents from config
  --iterations     Override ACO iterations per time-step
  --no-stagger     Skip departure staggering (use raw agent matrix)
  --no-progress    Suppress tqdm bars (useful for CI / log files)
"""

from __future__ import annotations

import argparse
import json
import logging
import pickle
import sys
import time
from collections import defaultdict
from pathlib import Path

import yaml
from tqdm import tqdm

# Allow running from project root: python simulation/runner.py
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from aco.colony import Colony
from aco.pheromone_map import PheromoneMap
from output.results_writer import ResultsWriter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Time-step helpers
# ---------------------------------------------------------------------------

def _time_slots(start_h: int, end_h: int, step_min: int) -> list[str]:
    """Generate ordered 'HH:MM' strings for every time-step in the window."""
    slots = []
    total_min = (end_h - start_h) * 60
    for offset in range(0, total_min, step_min):
        total = start_h * 60 + offset
        slots.append(f"{total // 60:02d}:{total % 60:02d}")
    return slots


def _agents_for_slot(agents: list[dict], slot: str, step_min: int) -> list[dict]:
    """
    Return agents whose departure_time falls within:
    [slot, slot + step_min)

    This ensures no agent is missed when the slot boundaries don't exactly
    match a departure time.
    """
    slot_h, slot_m = map(int, slot.split(":"))
    slot_total = slot_h * 60 + slot_m
    slot_end = slot_total + step_min

    batch = []
    for a in agents:
        try:
            ah, am = map(int, a["departure_time"].split(":"))
            agent_total = ah * 60 + am
            if slot_total <= agent_total < slot_end:
                batch.append(a)
        except (ValueError, KeyError):
            pass
    return batch


# ---------------------------------------------------------------------------
# Simulation Runner
# ---------------------------------------------------------------------------

class SimulationRunner:
    """
    Main simulation orchestrator.

    Parameters
    ----------
    cfg : dict
        Full configuration dict.
    override_agents : int | None
        Override n_synthetic_agents from config.
    override_iterations : int | None
        Override ACO iterations from config.
    use_stagger : bool
        Whether to use the staggered schedule (True) or raw agent matrix (False).
    show_progress : bool
        Show tqdm progress bars.
    """

    def __init__(
        self,
        cfg: dict,
        override_agents: int | None = None,
        override_iterations: int | None = None,
        use_stagger: bool = True,
        show_progress: bool = True,
    ) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.show_progress = show_progress

        if override_agents is not None:
            cfg["n_synthetic_agents"] = override_agents
            log.info("Overriding n_synthetic_agents → %d", override_agents)
        if override_iterations is not None:
            cfg["iterations"] = override_iterations
            log.info("Overriding iterations → %d", override_iterations)

        self.use_stagger = use_stagger
        self.step_min: int = cfg.get("time_step_minutes", 5)
        self.start_h: int = cfg.get("sim_start_hour", 6)
        self.end_h: int = cfg.get("sim_end_hour", 11)

    # ------------------------------------------------------------------
    def _load_graph(self):
        path = self.root / self.cfg["output"]["graph_pkl"]
        if not path.exists():
            sys.exit(
                f"Graph not found at {path}.\n"
                "Run: python pipeline/1_graph_builder.py --config config/pune_config.yaml"
            )
        log.info("Loading graph from %s …", path)
        with open(path, "rb") as fh:
            import networkx as nx
            G = pickle.load(fh)
        log.info("Graph: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())
        return G

    # ------------------------------------------------------------------
    def _load_agents(self) -> list[dict]:
        if self.use_stagger:
            stagger_path = self.root / "processed" / "staggered_schedule.json"
            if stagger_path.exists():
                log.info("Loading staggered schedule from %s …", stagger_path)
                with open(stagger_path) as fh:
                    return json.load(fh)
            log.warning(
                "Staggered schedule not found — falling back to raw agent matrix.\n"
                "Run: python scheduler/departure_stagger.py"
            )

        matrix_path = self.root / self.cfg["output"]["agent_matrix"]
        if not matrix_path.exists():
            sys.exit(
                f"Agent matrix not found at {matrix_path}.\n"
                "Run the full pipeline first."
            )
        log.info("Loading agent matrix from %s …", matrix_path)
        with open(matrix_path) as fh:
            return json.load(fh)

    # ------------------------------------------------------------------
    def run(self) -> dict:
        """
        Execute the full simulation.

        Returns a summary dict with per-class statistics.
        """
        wall_start = time.perf_counter()

        G = self._load_graph()
        agents = self._load_agents()
        slots = _time_slots(self.start_h, self.end_h, self.step_min)

        log.info(
            "Simulation: %02d:00 → %02d:00  |  %d time-steps  |  %d agents  |  city=%s",
            self.start_h, self.end_h, len(slots), len(agents), self.cfg.get("city", "?"),
        )

        # Initialise shared pheromone state and colony
        pheromone_map = PheromoneMap(G, self.cfg)
        colony = Colony(G, self.cfg, pheromone_map)

        # Results writer (opens output files)
        writer = ResultsWriter(self.cfg)

        # Accumulators for simulation-wide statistics
        all_results: list[dict] = []
        class_stats: dict[str, dict] = defaultdict(lambda: {
            "count": 0, "success": 0, "total_cost_s": 0.0
        })

        slot_iter = tqdm(slots, desc="Time-steps") if self.show_progress else slots

        for slot in slot_iter:
            batch = _agents_for_slot(agents, slot, self.step_min)
            if not batch:
                continue

            step_results = colony.route_batch(
                batch,
                time_step_label=slot,
                show_progress=self.show_progress,
            )

            # Accumulate stats
            for r in step_results:
                vc = r.get("vehicle_class", "unknown")
                class_stats[vc]["count"] += 1
                class_stats[vc]["success"] += int(r.get("success", False))
                class_stats[vc]["total_cost_s"] += r.get("total_cost_s", 0.0)

            all_results.extend(step_results)
            writer.write_step(slot, step_results, colony.edge_loads, pheromone_map)

        wall_elapsed = time.perf_counter() - wall_start

        # Final summary
        summary = self._build_summary(all_results, class_stats, wall_elapsed)
        writer.write_summary(summary)

        log.info("=== Simulation Complete ===")
        log.info("Wall time: %.1fs", wall_elapsed)
        log.info("Total agents routed: %d", len(all_results))
        log.info("Success rate: %.1f%%", 100 * summary["global_success_rate"])
        for vc, stats in summary["by_vehicle_class"].items():
            log.info(
                "  %-22s  success=%.1f%%  avg_cost=%.0fs",
                vc,
                100 * stats["success_rate"],
                stats["avg_cost_s"],
            )

        return summary

    # ------------------------------------------------------------------
    def _build_summary(
        self,
        all_results: list[dict],
        class_stats: dict,
        wall_elapsed: float,
    ) -> dict:
        total = len(all_results)
        n_success = sum(1 for r in all_results if r.get("success", False))

        by_class: dict[str, dict] = {}
        for vc, stats in class_stats.items():
            cnt = max(stats["count"], 1)
            suc = stats["success"]
            cost = stats["total_cost_s"]
            by_class[vc] = {
                "count": cnt,
                "success_count": suc,
                "success_rate": suc / cnt,
                "avg_cost_s": cost / max(suc, 1),
                "avg_cost_min": (cost / max(suc, 1)) / 60.0,
            }

        return {
            "city": self.cfg.get("city", ""),
            "sim_window": f"{self.start_h:02d}:00–{self.end_h:02d}:00",
            "total_agents": total,
            "global_success_rate": n_success / max(total, 1),
            "wall_time_s": round(wall_elapsed, 2),
            "by_vehicle_class": by_class,
        }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the ACO urban traffic routing simulation."
    )
    parser.add_argument("--config", default="config/pune_config.yaml",
                        help="Path to city config YAML")
    parser.add_argument("--agents", type=int, default=None,
                        help="Override number of synthetic agents")
    parser.add_argument("--iterations", type=int, default=None,
                        help="Override ACO iterations per time-step")
    parser.add_argument("--no-stagger", action="store_true",
                        help="Skip departure staggering")
    parser.add_argument("--no-progress", action="store_true",
                        help="Suppress tqdm progress bars")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    runner = SimulationRunner(
        cfg=cfg,
        override_agents=args.agents,
        override_iterations=args.iterations,
        use_stagger=not args.no_stagger,
        show_progress=not args.no_progress,
    )
    runner.run()


if __name__ == "__main__":
    main()
