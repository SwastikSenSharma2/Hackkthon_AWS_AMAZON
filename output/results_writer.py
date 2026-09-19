"""
output/results_writer.py
==========================
Writes simulation outputs to disk in formats consumable by both the
FastAPI backend (JSON) and the Next.js frontend (SSE streaming).

Files written:
  output/routes.json          — all agent routes (node sequences + costs)
  output/edge_loads.csv       — per-edge PCE load across all time-steps
  output/transit_schedule.csv — departure times and routes for transit agents
  output/pheromone_snapshot.json — final pheromone state for map rendering
  output/summary.json         — simulation-wide statistics
"""

from __future__ import annotations

import csv
import json
import logging
from collections import defaultdict
from pathlib import Path

log = logging.getLogger(__name__)


class ResultsWriter:
    """
    Manages output file handles and writes results incrementally
    as the simulation advances step by step.
    """

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.out_dir = self.root / cfg["output"]["results_dir"]
        self.out_dir.mkdir(parents=True, exist_ok=True)

        # All routes accumulated in memory, written at the end
        self._routes: list[dict] = []

        # Edge load accumulator: {(u, v): {time_slot: pce_load}}
        self._edge_load_log: dict[tuple, dict[str, float]] = defaultdict(dict)

        # Transit-only schedule list
        self._transit_rows: list[dict] = []

        # Open CSV writer for edge loads (streaming)
        edge_load_path = self.out_dir / "edge_loads.csv"
        self._edge_load_fh = open(edge_load_path, "w", newline="", encoding="utf-8")
        self._edge_load_writer = csv.DictWriter(
            self._edge_load_fh,
            fieldnames=["time_slot", "u", "v", "pce_load"],
        )
        self._edge_load_writer.writeheader()
        log.info("Results writer initialised → %s", self.out_dir)

    # ------------------------------------------------------------------
    def write_step(
        self,
        time_slot: str,
        step_results: list[dict],
        edge_loads: dict,
        pheromone_map,
    ) -> None:
        """
        Persist results for a single 5-minute time-step.
        Called by the simulation runner after every Colony.route_batch().
        """
        # Accumulate routes
        for r in step_results:
            r["time_slot"] = time_slot
            self._routes.append(r)
            if r.get("vehicle_class", "").startswith("transit"):
                self._transit_rows.append(
                    {
                        "time_slot": time_slot,
                        "agent_id": r.get("agent_id"),
                        "route_id": r.get("agent_id", "").split("_")[1]
                        if "_" in r.get("agent_id", "")
                        else "",
                        "origin_node": r.get("origin_node"),
                        "destination_node": r.get("destination_node"),
                        "departure_time": r.get("departure_time"),
                        "total_cost_s": r.get("total_cost_s"),
                        "success": r.get("success"),
                        "path_length": r.get("path_length"),
                    }
                )

        # Write edge loads to CSV (streaming — no buffering)
        for (u, v), load in edge_loads.items():
            self._edge_load_writer.writerow(
                {
                    "time_slot": time_slot,
                    "u": int(u),
                    "v": int(v),
                    "pce_load": round(load, 3),
                }
            )
        self._edge_load_fh.flush()

    # ------------------------------------------------------------------
    def write_summary(self, summary: dict) -> None:
        """
        Write the final summary and close all files.
        Called once at the end of the simulation.
        """
        # routes.json
        routes_path = self.out_dir / "routes.json"
        with open(routes_path, "w") as fh:
            json.dump(self._routes, fh, indent=2)
        log.info("Routes written → %s  (%d routes)", routes_path, len(self._routes))

        # transit_schedule.csv
        if self._transit_rows:
            transit_path = self.out_dir / "transit_schedule.csv"
            with open(transit_path, "w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=self._transit_rows[0].keys())
                writer.writeheader()
                writer.writerows(self._transit_rows)
            log.info(
                "Transit schedule written → %s  (%d trips)",
                transit_path,
                len(self._transit_rows),
            )

        # summary.json
        summary_path = self.out_dir / "summary.json"
        with open(summary_path, "w") as fh:
            json.dump(summary, fh, indent=2)
        log.info("Summary written → %s", summary_path)

        # Close streaming files
        self._edge_load_fh.close()

    # ------------------------------------------------------------------
    def routes_as_geojson(self, G) -> dict:
        """
        Convert the accumulated routes to a GeoJSON FeatureCollection
        for map rendering.  Each route is a LineString feature.
        """
        features = []
        for r in self._routes:
            path = r.get("path", [])
            coords = []
            for n in path:
                lat = G.nodes[n].get("lat", 0.0)
                lon = G.nodes[n].get("lon", 0.0)
                coords.append([lon, lat])  # GeoJSON: [lon, lat]
            if len(coords) < 2:
                continue
            feature = {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "agent_id": r.get("agent_id"),
                    "vehicle_class": r.get("vehicle_class"),
                    "total_cost_s": r.get("total_cost_s"),
                    "time_slot": r.get("time_slot"),
                    "success": r.get("success"),
                },
            }
            features.append(feature)

        return {"type": "FeatureCollection", "features": features}

    # ------------------------------------------------------------------
    def pheromone_geojson(self, pheromone_map, G, top_n: int = 200) -> dict:
        """
        Export the top-N strongest positive pheromone edges as a GeoJSON
        LineString collection.  Used by the Folium map renderer and
        the /api/v1/network/pheromones endpoint.
        """
        top_edges = pheromone_map.strongest_positive_edges(top_n)
        features = []
        for u, v, tau in top_edges:
            u_lat = G.nodes[u].get("lat", 0.0) if u in G.nodes else 0.0
            u_lon = G.nodes[u].get("lon", 0.0) if u in G.nodes else 0.0
            v_lat = G.nodes[v].get("lat", 0.0) if v in G.nodes else 0.0
            v_lon = G.nodes[v].get("lon", 0.0) if v in G.nodes else 0.0
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[u_lon, u_lat], [v_lon, v_lat]],
                },
                "properties": {"tau_pos": round(tau, 4), "u": int(u), "v": int(v)},
            }
            features.append(feature)
        return {"type": "FeatureCollection", "features": features}
