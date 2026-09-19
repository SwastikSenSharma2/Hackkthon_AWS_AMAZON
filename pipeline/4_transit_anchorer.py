"""
pipeline/4_transit_anchorer.py
================================
Stage 4 of the preprocessing pipeline.

Responsibilities:
  - Load pune_transit_stops.json (GeoJSON FeatureCollection)
  - For each transit stop, snap it to the nearest graph node using a
    KD-tree spatial index for O(log N) lookup
  - Load pune_transit_routes.csv (route metadata)
  - For each route, generate a high-priority transit agent as an
    Origin-Destination pair (origin = first matched stop, dest = last matched stop)
    with vehicle_class = "transit_bus" and priority_weight W_v = 0.5
  - The ACO engine will compute the optimal path between these O-D pairs
    and cache the result as the "fixed route" for the remainder of the simulation
  - Persist transit_agents.json

Output artefacts:
  processed/transit_agents.json

Usage:
  python pipeline/4_transit_anchorer.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import pickle
import sys
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import yaml

try:
    from pipeline.s3_utils import load_json_from_path_or_s3, load_csv_from_path_or_s3
except ImportError:
    from s3_utils import load_json_from_path_or_s3, load_csv_from_path_or_s3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# KD-tree nearest-node lookup (scipy optional; pure-Python fallback)
# ---------------------------------------------------------------------------

def _build_kdtree_index(G: nx.DiGraph) -> tuple[list, np.ndarray]:
    """
    Build a KD-tree index over node (lat, lon) coordinates.
    Returns (node_ids_list, coords_array_radians).
    """
    node_ids = list(G.nodes())
    coords = np.array(
        [[math.radians(G.nodes[n]["lat"]), math.radians(G.nodes[n]["lon"])]
         for n in node_ids],
        dtype=np.float64,
    )
    return node_ids, coords


def _haversine_distance(lat1_r: float, lon1_r: float,
                        lat2_r: float, lon2_r: float) -> float:
    """Haversine distance in metres between two points in radians."""
    R = 6_371_000.0
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(min(a, 1.0)))


def nearest_node(lat: float, lon: float,
                 node_ids: list, coords_rad: np.ndarray) -> tuple[Any, float]:
    """
    Brute-force nearest-node search.  For ~5,000-node graphs this is fast
    enough; scipy KDTree is used when available for larger graphs.

    Returns (node_id, distance_m).
    """
    try:
        from scipy.spatial import KDTree  # type: ignore
        # Use 3D Euclidean approximation on unit sphere for speed
        lat_r = math.radians(lat)
        lon_r = math.radians(lon)
        xyz_query = np.array([
            [math.cos(lat_r) * math.cos(lon_r),
             math.cos(lat_r) * math.sin(lon_r),
             math.sin(lat_r)]
        ])
        xyz_all = np.column_stack([
            np.cos(coords_rad[:, 0]) * np.cos(coords_rad[:, 1]),
            np.cos(coords_rad[:, 0]) * np.sin(coords_rad[:, 1]),
            np.sin(coords_rad[:, 0]),
        ])
        tree = KDTree(xyz_all)
        _, idx = tree.query(xyz_query, k=1)
        idx = int(idx[0])
    except ImportError:
        # Fall back to brute-force
        lat_r = math.radians(lat)
        lon_r = math.radians(lon)
        dists = [
            _haversine_distance(lat_r, lon_r, coords_rad[i, 0], coords_rad[i, 1])
            for i in range(len(node_ids))
        ]
        idx = int(np.argmin(dists))

    matched_nid = node_ids[idx]
    dist_m = _haversine_distance(
        math.radians(lat), math.radians(lon),
        coords_rad[idx, 0], coords_rad[idx, 1],
    )
    return matched_nid, dist_m


# ---------------------------------------------------------------------------
# TransitAnchorer
# ---------------------------------------------------------------------------

class TransitAnchorer:
    """
    Snaps transit stop coordinates to the road network graph and builds
    high-priority transit agent O-D pairs.

    Transit agent schema (per agent):
    {
      "agent_id":         "transit_<route_id>_<trip_idx>",
      "route_id":         "100",
      "origin_node":      6925879402,
      "destination_node": 7018375889,
      "departure_time":   "06:30",          # earliest feasible departure in window
      "vehicle_class":    "transit_bus",
      "pce_value":        3.0,
      "priority_weight":  0.5,
      "is_fixed_route":   false,            # ACO computes path; result gets cached
      "num_trips":        130               # daily trip frequency from GTFS metadata
    }
    """

    def __init__(self, cfg: dict, G: nx.DiGraph) -> None:
        self.cfg = cfg
        self.G = G
        self.root = Path(__file__).resolve().parent.parent

        # Precompute KD-tree index once for all stop lookups
        self.node_ids, self.coords_rad = _build_kdtree_index(G)
        log.info(
            "KD-tree index built over %d graph nodes.", len(self.node_ids)
        )

        # Transit agent vehicle class parameters
        self.vehicle_class = "transit_bus"
        self.pce = cfg.get("pce", {}).get("bus", 3.0)
        self.w_v = cfg.get("vehicle_weights", {}).get("transit_bus", 0.5)

    # ------------------------------------------------------------------
    def _load_stops(self) -> list[dict]:
        path = self.cfg["data"]["transit_stops"]
        log.info("Loading transit stops from %s …", path)
        geojson = load_json_from_path_or_s3(path, root_dir=self.root)
        stops = []
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            coords = feature["geometry"]["coordinates"]  # [lon, lat]
            stops.append(
                {
                    "stop_id": props.get("stop_id"),
                    "stop_name": props.get("stop_name", ""),
                    "lon": coords[0],
                    "lat": coords[1],
                }
            )
        log.info("Loaded %d transit stops.", len(stops))
        return stops

    # ------------------------------------------------------------------
    def _load_routes(self) -> list[dict]:
        path = self.cfg["data"]["transit_routes"]
        log.info("Loading transit routes from %s …", path)
        df = load_csv_from_path_or_s3(path, root_dir=self.root, dtype=str)
        routes = df.to_dict(orient="records")
        log.info("Loaded %d transit routes.", len(routes))
        return routes

    # ------------------------------------------------------------------
    def _snap_stops(self, stops: list[dict]) -> dict[Any, Any]:
        """
        For each stop, find nearest graph node.
        Returns {stop_id: {"node_id": ..., "snap_distance_m": ...}}.
        Stops that snap > 500m from any node are flagged.
        """
        snapped: dict[Any, Any] = {}
        far_count = 0
        for stop in stops:
            nid, dist_m = nearest_node(
                stop["lat"], stop["lon"], self.node_ids, self.coords_rad
            )
            if dist_m > 500:
                far_count += 1
            snapped[stop["stop_id"]] = {
                "node_id": nid,
                "snap_distance_m": round(dist_m, 1),
                "stop_name": stop["stop_name"],
            }
        if far_count:
            log.warning(
                "%d stops snapped >500m from nearest node (outside graph boundary).",
                far_count,
            )
        return snapped

    # ------------------------------------------------------------------
    def _assign_departure_time(self, route_idx: int, num_trips: int) -> str:
        """
        Distribute transit departures across the simulation window.
        High-frequency routes start earlier; low-frequency start at window open.
        """
        start_h = self.cfg.get("sim_start_hour", 6)
        end_h = self.cfg.get("sim_end_hour", 11)
        window_min = (end_h - start_h) * 60
        if num_trips > 0:
            interval_min = max(1, window_min // num_trips)
        else:
            interval_min = 30
        offset_min = (route_idx * interval_min) % window_min
        total_min = start_h * 60 + offset_min
        return f"{total_min // 60:02d}:{total_min % 60:02d}"

    # ------------------------------------------------------------------
    def build(self) -> list[dict]:
        stops = self._load_stops()
        routes = self._load_routes()
        snapped = self._snap_stops(stops)

        # Build a stop_id → node_id lookup for fast route endpoint resolution
        stop_node_map: dict[Any, Any] = {
            sid: info["node_id"] for sid, info in snapped.items()
        }

        # We do not have ordered stop sequences per route, so we use the
        # first and last stops from the global stop list that appear to
        # belong to the route's geographic footprint as O-D endpoints.
        #
        # Practical approach for this dataset:
        #   - Pair the route with the two stops whose IDs are numerically
        #     closest to the route_id (a loose proxy for geographic grouping)
        #   - This is a placeholder until a GTFS stop_times.txt is available.
        #   - The ACO engine will resolve the actual path.
        #
        # If a GTFS stop_times.txt becomes available, replace this block with:
        #   ordered_stops = stop_times_df[stop_times_df.route_id == route_id]
        #                     .sort_values("stop_sequence")["stop_id"].tolist()
        #   origin_node = stop_node_map[ordered_stops[0]]
        #   dest_node   = stop_node_map[ordered_stops[-1]]

        all_stop_ids = [s["stop_id"] for s in stops if s["stop_id"] in stop_node_map]
        n_stops = len(all_stop_ids)

        agents: list[dict] = []
        skipped = 0

        for i, route in enumerate(routes):
            route_id = route.get("route_id", f"R{i}")
            try:
                num_trips = int(route.get("num_trips", 1))
            except (ValueError, TypeError):
                num_trips = 1

            # Assign O-D: use modular indexing across the stop list
            # so each route gets a unique pair spread across the network
            origin_stop_id = all_stop_ids[i % n_stops]
            dest_stop_id = all_stop_ids[(i + n_stops // 2) % n_stops]

            origin_node = stop_node_map.get(origin_stop_id)
            dest_node = stop_node_map.get(dest_stop_id)

            if origin_node is None or dest_node is None or origin_node == dest_node:
                skipped += 1
                continue

            # Check both nodes actually exist in the graph
            if origin_node not in self.G or dest_node not in self.G:
                skipped += 1
                continue

            departure = self._assign_departure_time(i, num_trips)

            agents.append(
                {
                    "agent_id": f"transit_{route_id}_{i:04d}",
                    "route_id": str(route_id),
                    "route_name": route.get("route_long_name", ""),
                    "origin_node": int(origin_node),
                    "destination_node": int(dest_node),
                    "departure_time": departure,
                    "vehicle_class": self.vehicle_class,
                    "pce_value": self.pce,
                    "priority_weight": self.w_v,
                    "is_fixed_route": False,   # ACO resolves; result is cached
                    "num_trips": num_trips,
                }
            )

        log.info(
            "Transit agents built: %d  (skipped %d with missing/same-node O-D)",
            len(agents),
            skipped,
        )
        return agents

    # ------------------------------------------------------------------
    def save(self, agents: list[dict]) -> Path:
        out_path = self.root / self.cfg["output"]["transit_agents"]
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as fh:
            json.dump(agents, fh, indent=2)
        log.info("Transit agents saved → %s", out_path)
        return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Snap transit stops and build transit agent list.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    # Load the processed graph
    graph_path = Path(__file__).resolve().parent.parent / cfg["output"]["graph_pkl"]
    if not graph_path.exists():
        sys.exit(
            f"Graph not found at {graph_path}. "
            "Run pipeline/1_graph_builder.py first."
        )
    log.info("Loading graph from %s …", graph_path)
    with open(graph_path, "rb") as fh:
        G: nx.DiGraph = pickle.load(fh)

    anchorer = TransitAnchorer(cfg, G)
    agents = anchorer.build()
    anchorer.save(agents)


if __name__ == "__main__":
    main()
