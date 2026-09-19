"""
pipeline/1_graph_builder.py
============================
Stage 1 of the preprocessing pipeline.

Responsibilities:
  - Parse the GraphML road network (OSMnx-generated) into a NetworkX DiGraph
  - Compute straight-line (Haversine) distances between connected nodes
    for the heuristic visibility function η
  - Normalise raw edge attributes (highway type, lanes) to a capacity
    baseline using the IRC 106 / HCM values from config
  - Convert capacity values into Passenger Car Equivalent (PCE) units
  - Persist the processed graph to  processed/graph.pkl

Output artefacts:
  processed/graph.pkl       — pickle of the fully annotated NetworkX DiGraph

Usage:
  python pipeline/1_graph_builder.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import logging
import math
import os
import pickle
import sys
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import yaml

try:
    from pipeline.s3_utils import load_graphml_from_path_or_s3
except ImportError:
    from s3_utils import load_graphml_from_path_or_s3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Haversine distance (metres) — pure Python, no extra dependency
# ---------------------------------------------------------------------------
_R_EARTH = 6_371_000.0  # metres


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in metres between two WGS-84 points."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * _R_EARTH * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# Capacity normalisation helpers
# ---------------------------------------------------------------------------

def _parse_lanes(raw: Any) -> int:
    """
    OSMnx stores lanes as a string, a list of strings, or None.
    Return a best-guess integer lane count.
    """
    if raw is None:
        return 1
    if isinstance(raw, (int, float)):
        return max(1, int(raw))
    if isinstance(raw, list):
        # Multiple parallel edges may have different lane counts; take the max.
        try:
            return max(int(v) for v in raw if v is not None)
        except (ValueError, TypeError):
            return 1
    try:
        return max(1, int(str(raw).split(";")[0].strip()))
    except (ValueError, TypeError):
        return 1


def _parse_highway(raw: Any) -> str:
    """Return a single canonical highway tag from a potentially list-valued attribute."""
    if isinstance(raw, list):
        return raw[0] if raw else "unclassified"
    return str(raw) if raw else "unclassified"


def _edge_capacity_pce(highway: str, lanes: int, cap_table: dict[str, int]) -> float:
    """
    Compute edge capacity in Passenger Car Equivalents per hour.

    capacity_pce = base_capacity_per_lane × lanes

    where base_capacity_per_lane comes from the config capacity_table.
    """
    base = cap_table.get(highway, cap_table.get("default", 600))
    return float(base * lanes)


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

class GraphBuilder:
    """
    Parses a GraphML road network and enriches it with routing attributes
    required by the ACO engine.

    Attributes added to every NODE:
      lat, lon                  — WGS-84 coordinates (float)

    Attributes added to every EDGE  (u, v, key):
      length_m                  — physical length in metres (float)
      straight_line_m           — Haversine dist between endpoints (float)
      lanes                     — parsed integer lane count
      highway                   — canonical OSM highway tag (str)
      capacity_pce_hr           — max flow in PCE / hr (float)
      speed_kmh                 — design speed (float, default inferred from highway)
      travel_time_s             — free-flow travel time in seconds (float)
      oneway                    — bool
    """

    # Default design speeds (km/h) by highway type when maxspeed is absent
    _DEFAULT_SPEEDS: dict[str, float] = {
        "motorway": 80,
        "motorway_link": 60,
        "trunk": 60,
        "trunk_link": 50,
        "primary": 50,
        "primary_link": 40,
        "secondary": 40,
        "secondary_link": 30,
        "tertiary": 30,
        "tertiary_link": 25,
        "unclassified": 25,
        "residential": 20,
        "living_street": 10,
        "service": 15,
        "default": 25,
    }

    def __init__(self, config: dict) -> None:
        self.cfg = config
        self.cap_table: dict[str, int] = config["capacity_table"]
        self.project_root = Path(__file__).resolve().parent.parent

    # ------------------------------------------------------------------
    def load_graphml(self) -> nx.DiGraph:
        network_path = self.cfg["data"]["road_network"]
        log.info("Reading GraphML from %s …", network_path)
        G: nx.DiGraph = load_graphml_from_path_or_s3(network_path, root_dir=self.project_root)
        log.info("Raw graph: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())
        return G

    # ------------------------------------------------------------------
    def enrich_nodes(self, G: nx.DiGraph) -> None:
        """
        Extract latitude / longitude from the GraphML 'd4' (y=lat) and
        'd5' (x=lon) data keys, and store them as float attributes.
        OSMnx GraphML uses y=latitude, x=longitude convention.
        """
        missing = 0
        for nid, data in G.nodes(data=True):
            try:
                # OSMnx stores y=lat, x=lon
                lat = float(data.get("y", data.get("d4", 0.0)))
                lon = float(data.get("x", data.get("d5", 0.0)))
            except (ValueError, TypeError):
                lat, lon = 0.0, 0.0
                missing += 1
            G.nodes[nid]["lat"] = lat
            G.nodes[nid]["lon"] = lon

        if missing:
            log.warning("%d nodes had missing coordinate data.", missing)

    # ------------------------------------------------------------------
    def enrich_edges(self, G: nx.DiGraph) -> None:
        """
        For every directed edge (u, v), compute and attach routing attributes.
        Multi-edges (same u,v with different keys) are all processed.
        """
        no_length = 0

        for u, v, key, data in G.edges(keys=True, data=True):
            u_data = G.nodes[u]
            v_data = G.nodes[v]

            # --- straight-line distance --------------------------------
            slm = haversine(u_data["lat"], u_data["lon"], v_data["lat"], v_data["lon"])
            G[u][v][key]["straight_line_m"] = slm

            # --- physical length (prefer stored, fall back to Haversine) --
            raw_len = data.get("length", data.get("d15", None))
            try:
                length_m = float(raw_len) if raw_len is not None else slm
            except (ValueError, TypeError):
                length_m = slm
            if raw_len is None:
                no_length += 1
            G[u][v][key]["length_m"] = length_m

            # --- highway tag & lanes -----------------------------------
            highway = _parse_highway(data.get("highway", data.get("d10", "unclassified")))
            lanes = _parse_lanes(data.get("lanes", data.get("d17", None)))
            G[u][v][key]["highway"] = highway
            G[u][v][key]["lanes"] = lanes

            # --- capacity (PCE / hr) -----------------------------------
            cap = _edge_capacity_pce(highway, lanes, self.cap_table)
            G[u][v][key]["capacity_pce_hr"] = cap

            # --- design speed -----------------------------------------
            raw_speed = data.get("maxspeed", data.get("d20", None))
            try:
                if raw_speed is not None:
                    # handle "50 mph", "50", ["50", "60"] etc.
                    raw_speed_str = raw_speed if isinstance(raw_speed, str) else str(raw_speed[0])
                    speed_kmh = float(raw_speed_str.replace("mph", "").replace("km/h", "").strip().split(";")[0])
                    if "mph" in str(raw_speed).lower():
                        speed_kmh *= 1.60934
                else:
                    speed_kmh = self._DEFAULT_SPEEDS.get(highway, self._DEFAULT_SPEEDS["default"])
            except (ValueError, TypeError):
                speed_kmh = self._DEFAULT_SPEEDS.get(highway, self._DEFAULT_SPEEDS["default"])
            G[u][v][key]["speed_kmh"] = speed_kmh

            # --- free-flow travel time (seconds) ----------------------
            if speed_kmh > 0:
                travel_time_s = (length_m / 1000.0) / speed_kmh * 3600.0
            else:
                travel_time_s = length_m * 0.1  # 10 m/s fallback
            G[u][v][key]["travel_time_s"] = travel_time_s

            # --- heuristic visibility η = 1 / travel_time_s ----------
            G[u][v][key]["eta"] = 1.0 / max(travel_time_s, 0.1)

            # --- oneway flag ------------------------------------------
            oneway_raw = data.get("oneway", data.get("d12", "False"))
            G[u][v][key]["oneway"] = str(oneway_raw).lower() in ("true", "yes", "1")

        if no_length:
            log.info(
                "%d edges had no stored length — Haversine approximation used.",
                no_length,
            )

    # ------------------------------------------------------------------
    def build(self) -> nx.DiGraph:
        G = self.load_graphml()
        log.info("Enriching nodes with coordinates …")
        self.enrich_nodes(G)
        log.info("Enriching edges with capacity / speed / travel-time …")
        self.enrich_edges(G)
        log.info(
            "Graph built: %d nodes, %d edges",
            G.number_of_nodes(),
            G.number_of_edges(),
        )
        return G

    # ------------------------------------------------------------------
    def save(self, G: nx.DiGraph) -> Path:
        out_dir = self.project_root / self.cfg["output"]["processed_dir"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "graph.pkl"
        with open(out_path, "wb") as fh:
            pickle.dump(G, fh, protocol=pickle.HIGHEST_PROTOCOL)
        log.info("Graph saved → %s", out_path)
        return out_path


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Build and persist the road network graph.")
    parser.add_argument(
        "--config",
        default="config/pune_config.yaml",
        help="Path to the city config YAML (default: config/pune_config.yaml)",
    )
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config file not found: {cfg_path}")

    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    builder = GraphBuilder(cfg)
    G = builder.build()
    builder.save(G)

    # Quick sanity summary
    lengths = [d["length_m"] for _, _, d in G.edges(data=True)]
    log.info(
        "Edge length summary: min=%.1fm  median=%.1fm  max=%.1fm",
        np.min(lengths),
        np.median(lengths),
        np.max(lengths),
    )
    capacities = [d["capacity_pce_hr"] for _, _, d in G.edges(data=True)]
    log.info(
        "Edge capacity summary: min=%.0f  median=%.0f  max=%.0f  (PCE/hr)",
        np.min(capacities),
        np.median(capacities),
        np.max(capacities),
    )


if __name__ == "__main__":
    main()
