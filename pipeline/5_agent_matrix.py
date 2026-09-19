"""
pipeline/5_agent_matrix.py
============================
Stage 5 — final preprocessing stage.

Responsibilities:
  - Generate N_SYNTHETIC_AGENTS synthetic commuter agents
  - Sample vehicle class from fleet distribution (processed/fleet_distribution.json)
  - Sample departure time from diurnal curve (processed/diurnal_curve.json)
  - Assign origin (peripheral) and destination (central) graph nodes
  - Merge with transit agents (processed/transit_agents.json)
  - Sort all agents by departure_time
  - Persist the unified agent matrix (processed/agent_matrix.json)

The agent matrix is the single input to the ACO colony runner.

Every agent has this exact schema:
  {
    "agent_id":         str,
    "origin_node":      int,
    "destination_node": int,
    "departure_time":   "HH:MM",
    "vehicle_class":    str,
    "pce_value":        float,
    "priority_weight":  float,   # W_v — used by Mutation B
    "is_transit":       bool
  }

Usage:
  python pipeline/5_agent_matrix.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import json
import logging
import pickle
import random
import sys
from pathlib import Path

import networkx as nx
import numpy as np
import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: weighted random sampler
# ---------------------------------------------------------------------------

def weighted_choice(items: list, weights: list[float], rng: random.Random) -> any:
    """Pick one item according to weights (normalised internally)."""
    total = sum(weights)
    r = rng.random() * total
    cumulative = 0.0
    for item, w in zip(items, weights):
        cumulative += w
        if r <= cumulative:
            return item
    return items[-1]


# ---------------------------------------------------------------------------
# AgentMatrixBuilder
# ---------------------------------------------------------------------------

class AgentMatrixBuilder:
    """
    Constructs the unified agent matrix consumed by the ACO simulation.

    Origin/Destination Zone Strategy:
      - Origins  → nodes whose degree places them in the bottom-K percentile
                   (peripheral intersections, mostly residential)
      - Destinations → nodes in the top-K percentile (dense urban intersections)

    Both sets are filtered to nodes that actually have at least one
    outgoing and one incoming edge (reachable within the directed graph).
    """

    def __init__(self, cfg: dict, G: nx.DiGraph) -> None:
        self.cfg = cfg
        self.G = G
        self.root = Path(__file__).resolve().parent.parent
        self.rng = random.Random(cfg.get("random_seed", 42))
        self.np_rng = np.random.default_rng(cfg.get("random_seed", 42))

        self.n_agents = cfg.get("n_synthetic_agents", 500)
        self.origin_pct = cfg.get("origin_zone_percentile", 20)
        self.dest_pct = cfg.get("destination_zone_percentile", 80)
        self.sim_start = cfg.get("sim_start_hour", 6)
        self.sim_end = cfg.get("sim_end_hour", 11)

    # ------------------------------------------------------------------
    def _load_fleet(self) -> tuple[list[str], list[float], dict]:
        path = self.root / self.cfg["output"]["fleet_dist"]
        with open(path) as fh:
            dist: list[dict] = json.load(fh)
        classes = [d["vehicle_class"] for d in dist]
        weights = [d["weight"] for d in dist]
        meta = {d["vehicle_class"]: d for d in dist}
        return classes, weights, meta

    # ------------------------------------------------------------------
    def _load_diurnal(self) -> tuple[list[str], list[float]]:
        path = self.root / self.cfg["output"]["diurnal_curve"]
        with open(path) as fh:
            curve: dict[str, float] = json.load(fh)
        slots = list(curve.keys())
        weights = list(curve.values())
        return slots, weights

    # ------------------------------------------------------------------
    def _load_transit_agents(self) -> list[dict]:
        path = self.root / self.cfg["output"]["transit_agents"]
        if not path.exists():
            log.warning("No transit agents file found at %s — skipping.", path)
            return []
        with open(path) as fh:
            agents: list[dict] = json.load(fh)
        # Ensure schema compliance
        for a in agents:
            a.setdefault("is_transit", True)
        return agents

    # ------------------------------------------------------------------
    def _compute_node_zones(self) -> tuple[list, list]:
        """
        Partition nodes into origin (peripheral) and destination (dense) zones
        based on total degree (in + out).
        """
        degrees = dict(self.G.degree())
        # Filter to nodes with both in-edges and out-edges
        valid = [
            n for n in self.G.nodes()
            if self.G.in_degree(n) > 0 and self.G.out_degree(n) > 0
        ]
        if not valid:
            log.warning("No valid nodes with in+out edges — using all nodes.")
            valid = list(self.G.nodes())

        deg_values = np.array([degrees[n] for n in valid])
        origin_thresh = np.percentile(deg_values, self.origin_pct)
        dest_thresh = np.percentile(deg_values, self.dest_pct)

        origins = [n for n, d in zip(valid, deg_values) if d <= origin_thresh]
        destinations = [n for n, d in zip(valid, deg_values) if d >= dest_thresh]

        # Safety: ensure non-empty zones
        if not origins:
            origins = valid[: max(1, len(valid) // 5)]
        if not destinations:
            destinations = valid[-max(1, len(valid) // 5):]

        log.info(
            "Node zones: %d origin candidates (≤%.0f-degree) | "
            "%d destination candidates (≥%.0f-degree)",
            len(origins), origin_thresh,
            len(destinations), dest_thresh,
        )
        return origins, destinations

    # ------------------------------------------------------------------
    def _sample_departure(self, slots: list[str], weights: list[float]) -> str:
        """Sample a departure slot string 'HH:MM' from the diurnal PMF."""
        return weighted_choice(slots, weights, self.rng)

    # ------------------------------------------------------------------
    def generate_synthetic_agents(self) -> list[dict]:
        classes, class_weights, meta = self._load_fleet()
        slots, slot_weights = self._load_diurnal()
        origins, destinations = self._compute_node_zones()

        agents: list[dict] = []
        for i in range(self.n_agents):
            vc = weighted_choice(classes, class_weights, self.rng)
            m = meta[vc]

            # Pick distinct origin / destination nodes
            origin = self.rng.choice(origins)
            dest = self.rng.choice(destinations)
            while dest == origin:
                dest = self.rng.choice(destinations)

            departure = self._sample_departure(slots, slot_weights)

            agents.append(
                {
                    "agent_id": f"synth_{i:06d}",
                    "origin_node": int(origin),
                    "destination_node": int(dest),
                    "departure_time": departure,
                    "vehicle_class": vc,
                    "pce_value": float(m.get("pce", 1.0)),
                    "priority_weight": float(m.get("priority_weight", 1.0)),
                    "is_transit": False,
                }
            )

        log.info("Generated %d synthetic agents.", len(agents))
        return agents

    # ------------------------------------------------------------------
    def build(self) -> list[dict]:
        transit_agents = self._load_transit_agents()
        log.info("Transit agents loaded: %d", len(transit_agents))

        # Normalise transit agents to shared schema
        norm_transit = []
        for a in transit_agents:
            norm_transit.append(
                {
                    "agent_id": a.get("agent_id"),
                    "origin_node": int(a.get("origin_node")),
                    "destination_node": int(a.get("destination_node")),
                    "departure_time": a.get("departure_time", "06:00"),
                    "vehicle_class": a.get("vehicle_class", "transit_bus"),
                    "pce_value": float(a.get("pce_value", 3.0)),
                    "priority_weight": float(a.get("priority_weight", 0.5)),
                    "is_transit": True,
                }
            )

        synthetic = self.generate_synthetic_agents()

        all_agents = norm_transit + synthetic

        # Sort by departure time (HH:MM string sort works correctly)
        all_agents.sort(key=lambda a: a["departure_time"])

        log.info(
            "Agent matrix assembled: %d total  (%d transit + %d synthetic)",
            len(all_agents),
            len(norm_transit),
            len(synthetic),
        )
        return all_agents

    # ------------------------------------------------------------------
    def save(self, agents: list[dict]) -> Path:
        out_path = self.root / self.cfg["output"]["agent_matrix"]
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as fh:
            json.dump(agents, fh, indent=2)
        log.info("Agent matrix saved → %s  (%d agents)", out_path, len(agents))
        return out_path

    # ------------------------------------------------------------------
    def print_class_summary(self, agents: list[dict]) -> None:
        from collections import Counter
        counts = Counter(a["vehicle_class"] for a in agents)
        log.info("=== Agent Matrix — Vehicle Class Breakdown ===")
        for cls, count in sorted(counts.items(), key=lambda x: -x[1]):
            log.info("  %-22s  %d agents  (%.1f%%)", cls, count, 100 * count / len(agents))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Build unified agent matrix.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    # Load graph
    root = Path(__file__).resolve().parent.parent
    graph_path = root / cfg["output"]["graph_pkl"]
    if not graph_path.exists():
        sys.exit(f"Graph not found at {graph_path}. Run 1_graph_builder.py first.")
    log.info("Loading graph …")
    with open(graph_path, "rb") as fh:
        G: nx.DiGraph = pickle.load(fh)

    builder = AgentMatrixBuilder(cfg, G)
    agents = builder.build()
    builder.save(agents)
    builder.print_class_summary(agents)

    # Show first 3 agents for sanity check
    log.info("First 3 agents:")
    for a in agents[:3]:
        log.info("  %s", json.dumps(a))


if __name__ == "__main__":
    main()
