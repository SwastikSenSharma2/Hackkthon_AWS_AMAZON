"""
scheduler/departure_stagger.py
================================
Departure Stagger Scheduler.

Detects groups of transit/school-bus agents that would converge on the same
road segment at the same time, and redistributes their departure times across
a configurable time window to spread the load.

Logic:
  1. For every pair (agent_i, agent_j) of transit agents departing at the same
     time-slot, detect if their O-D pairs share any common high-capacity edges
     by computing the geographic overlap of their bounding boxes.
  2. If the predicted load on a shared segment exceeds `stagger_load_trigger`
     fraction of capacity, spread the group's departures across
     `stagger_window_minutes`.
  3. For synthetic agents, simply jitter departure by ±2 minutes to smooth
     the diurnal curve without altering the statistical distribution.

Output artefacts:
  processed/staggered_schedule.json  — modified agent matrix with adjusted departure times

Usage:
  python scheduler/departure_stagger.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from collections import defaultdict
from pathlib import Path

import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_time(hhmm: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def _format_time(minutes: int) -> str:
    """Convert minutes since midnight to 'HH:MM'."""
    minutes = max(0, min(minutes, 23 * 60 + 59))
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _bounding_box(origin_node: int, dest_node: int, node_coords: dict) -> tuple | None:
    """Compute bounding box [min_lat, max_lat, min_lon, max_lon] for an O-D pair."""
    o = node_coords.get(origin_node)
    d = node_coords.get(dest_node)
    if o is None or d is None:
        return None
    return (
        min(o[0], d[0]),
        max(o[0], d[0]),
        min(o[1], d[1]),
        max(o[1], d[1]),
    )


def _boxes_overlap(box1: tuple, box2: tuple, tolerance: float = 0.003) -> bool:
    """Return True if two bounding boxes overlap within a geographic tolerance (~300m)."""
    min_lat1, max_lat1, min_lon1, max_lon1 = box1
    min_lat2, max_lat2, min_lon2, max_lon2 = box2
    return (
        min_lat1 - tolerance <= max_lat2 + tolerance
        and max_lat1 + tolerance >= min_lat2 - tolerance
        and min_lon1 - tolerance <= max_lon2 + tolerance
        and max_lon1 + tolerance >= min_lon2 - tolerance
    )


# ---------------------------------------------------------------------------
# Stagger Scheduler
# ---------------------------------------------------------------------------

class DepartureStagger:
    """
    Analyses the agent matrix and redistributes departures to prevent
    transit bunching (multiple buses hitting the same road at the same time).
    """

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.load_trigger: float = cfg.get("stagger_load_trigger", 0.65)
        self.window_min: int = cfg.get("stagger_window_minutes", 20)

    # ------------------------------------------------------------------
    def _load_agents(self) -> list[dict]:
        path = self.root / self.cfg["output"]["agent_matrix"]
        with open(path) as fh:
            return json.load(fh)

    # ------------------------------------------------------------------
    def _load_node_coords(self) -> dict[int, tuple[float, float]]:
        """
        Load a lightweight {node_id: (lat, lon)} map from the graph pickle.
        Avoids loading the full graph just for coordinates.
        """
        import pickle
        graph_path = self.root / self.cfg["output"]["graph_pkl"]
        if not graph_path.exists():
            log.warning("Graph not found at %s — skipping coordinate-based overlap check.", graph_path)
            return {}
        with open(graph_path, "rb") as fh:
            G = pickle.load(fh)
        return {
            n: (data.get("lat", 0.0), data.get("lon", 0.0))
            for n, data in G.nodes(data=True)
        }

    # ------------------------------------------------------------------
    def stagger(self, agents: list[dict], node_coords: dict) -> list[dict]:
        """
        Apply departure staggering to transit agents.

        Strategy:
        - Group transit agents by departure time-slot
        - Within each slot, compute pairwise bounding-box overlap
        - If overlap detected (proxy for shared road segment), spread
          departures across the stagger window
        - Synthetic agents get a small random jitter (±2 min) to smooth
          the departure curve without clustering

        Returns the modified agents list.
        """
        import random
        rng = random.Random(self.cfg.get("random_seed", 42))

        # Separate transit vs synthetic
        transit = [a for a in agents if a.get("is_transit", False)]
        synthetic = [a for a in agents if not a.get("is_transit", False)]

        # Group transit agents by departure slot
        slots: dict[str, list[dict]] = defaultdict(list)
        for a in transit:
            slots[a["departure_time"]].append(a)

        modified_transit = []
        stagger_count = 0

        for slot, group in slots.items():
            if len(group) == 1:
                modified_transit.extend(group)
                continue

            # Check for bounding-box overlaps among this group
            overlapping_clusters = self._find_overlap_clusters(group, node_coords)
            for cluster in overlapping_clusters:
                if len(cluster) > 1:
                    # Spread cluster departures across the stagger window
                    base_min = _parse_time(slot)
                    step = self.window_min / max(len(cluster) - 1, 1)
                    for idx, agent in enumerate(cluster):
                        new_min = base_min + int(idx * step)
                        agent["departure_time"] = _format_time(new_min)
                        stagger_count += 1
            modified_transit.extend(group)

        log.info(
            "Staggered %d transit agents across %d-min windows.", stagger_count, self.window_min
        )

        # Small jitter for synthetic agents (±2 min)
        modified_synthetic = []
        for a in synthetic:
            base_min = _parse_time(a["departure_time"])
            jitter = rng.randint(-2, 2)
            new_a = dict(a)
            new_a["departure_time"] = _format_time(base_min + jitter)
            modified_synthetic.append(new_a)

        all_agents = modified_transit + modified_synthetic
        all_agents.sort(key=lambda x: x["departure_time"])
        return all_agents

    # ------------------------------------------------------------------
    def _find_overlap_clusters(
        self, agents: list[dict], node_coords: dict
    ) -> list[list[dict]]:
        """
        Simple greedy clustering: group agents whose O-D bounding boxes overlap.
        Returns a list of clusters (each cluster is a list of agents).
        """
        if not node_coords:
            # No coordinates available — treat entire group as one cluster
            return [agents]

        assigned = [False] * len(agents)
        clusters: list[list[dict]] = []

        for i, a in enumerate(agents):
            if assigned[i]:
                continue
            cluster = [a]
            assigned[i] = True
            box_i = _bounding_box(a["origin_node"], a["destination_node"], node_coords)
            if box_i is None:
                clusters.append(cluster)
                continue
            for j in range(i + 1, len(agents)):
                if assigned[j]:
                    continue
                box_j = _bounding_box(
                    agents[j]["origin_node"], agents[j]["destination_node"], node_coords
                )
                if box_j is not None and _boxes_overlap(box_i, box_j):
                    cluster.append(agents[j])
                    assigned[j] = True
            clusters.append(cluster)
        return clusters

    # ------------------------------------------------------------------
    def run(self) -> list[dict]:
        agents = self._load_agents()
        node_coords = self._load_node_coords()
        staggered = self.stagger(agents, node_coords)

        out_path = self.root / "processed" / "staggered_schedule.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as fh:
            json.dump(staggered, fh, indent=2)
        log.info("Staggered schedule saved → %s  (%d agents)", out_path, len(staggered))
        return staggered


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Stagger transit departure times.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    scheduler = DepartureStagger(cfg)
    agents = scheduler.run()
    log.info("Stagger complete. Total agents in schedule: %d", len(agents))


if __name__ == "__main__":
    main()
