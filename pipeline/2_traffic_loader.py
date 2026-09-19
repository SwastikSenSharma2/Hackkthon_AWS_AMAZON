"""
pipeline/2_traffic_loader.py
=============================
Stage 2 of the preprocessing pipeline.

Responsibilities:
  - Load pune_traffic_clean.csv (already aggregated into 5-min buckets)
  - Compute / validate the congestion_score (PCE-weighted vehicle density)
  - Map the 3 camera intersections to their graph node IDs
  - Build a normalised diurnal traffic curve (probability density per 5-min slot)
    capturing when the Pune morning rush peaks — this drives departure-time sampling
  - Persist artefacts to the processed/ directory

Output artefacts:
  processed/diurnal_curve.json          — hour+minute → probability weight
  processed/intersection_congestion.json — {intersection: {node_id, timeseries}}

Usage:
  python pipeline/2_traffic_loader.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Weights used to compute the congestion proxy score from vehicle counts.
# These match prepare_training_data.py but use IRC 106 PCE values from config.
_DEFAULT_PCE = {"car": 1.0, "motorbike": 0.75, "bus": 3.0, "truck": 3.7}


# ---------------------------------------------------------------------------
# TrafficLoader
# ---------------------------------------------------------------------------

class TrafficLoader:
    """
    Loads and transforms raw traffic count data into two artefacts consumed
    by the ACO simulation:

    1. Diurnal curve  — normalised probability density over 5-min slots
       Used by agent_matrix.py to sample departure timestamps so that
       synthetic commuters replicate observed rush-hour build-up.

    2. Intersection congestion timeseries — per-node V/C proxy over time
       Used by the ACO engine to initialise negative pheromones and to
       validate pheromone convergence against observed data.
    """

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.pce = cfg.get("pce", _DEFAULT_PCE)

        # Simulation temporal window
        self.sim_start = cfg.get("sim_start_hour", 6)
        self.sim_end = cfg.get("sim_end_hour", 11)

    # ------------------------------------------------------------------
    def _load_raw(self) -> pd.DataFrame:
        path = self.root / self.cfg["data"]["traffic_clean"]
        log.info("Loading traffic data from %s …", path)
        df = pd.read_csv(path, parse_dates=["bucket"])
        log.info("Loaded %d rows across %d time buckets.", len(df), df["bucket"].nunique())
        return df

    # ------------------------------------------------------------------
    def _compute_congestion_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Congestion proxy (PCE-weighted concurrent density):
            score = car_mean×1.0 + motorbike_mean×0.75 + bus_mean×3.0 + truck_mean×3.7

        If `congestion_score` already exists (train_dataset), we keep it but
        recompute to ensure consistency with current PCE config values.
        """
        df = df.copy()
        df["congestion_score"] = (
            df["car_mean"] * self.pce.get("car", 1.0)
            + df["motorbike_mean"] * self.pce.get("motorbike", 0.75)
            + df["bus_mean"] * self.pce.get("bus", 3.0)
            + df["truck_mean"] * self.pce.get("truck", 3.7)
        )
        return df

    # ------------------------------------------------------------------
    def _build_diurnal_curve(self, df: pd.DataFrame) -> dict:
        """
        Build a normalised probability mass function over 5-min slots
        within the simulation window [sim_start_hour, sim_end_hour).

        The PMF is keyed by (hour, minute) tuples and values sum to 1.0.
        Slots outside the window receive weight 0.

        Strategy:
          - Group by (hour, minute) across all days / intersections / directions
          - Sum the congestion_score (total demand proxy)
          - Clip to the simulation window
          - Normalise so weights sum to 1
        """
        df = df.copy()
        df["hour"] = df["bucket"].dt.hour
        df["minute"] = df["bucket"].dt.minute

        # Restrict to simulation window
        mask = (df["hour"] >= self.sim_start) & (df["hour"] < self.sim_end)
        window_df = df[mask]

        if window_df.empty:
            log.warning(
                "No traffic data in simulation window [%d:00, %d:00). "
                "Using uniform distribution.",
                self.sim_start,
                self.sim_end,
            )
            # Uniform fallback
            slots = []
            for h in range(self.sim_start, self.sim_end):
                for m in range(0, 60, 5):
                    slots.append({"hour": h, "minute": m, "weight": 1.0})
            total = sum(s["weight"] for s in slots)
            curve = {f"{s['hour']:02d}:{s['minute']:02d}": s["weight"] / total for s in slots}
            return curve

        agg = (
            window_df.groupby(["hour", "minute"])["congestion_score"]
            .sum()
            .reset_index()
        )
        total = agg["congestion_score"].sum()
        if total == 0:
            total = 1.0

        curve: dict[str, float] = {}
        for _, row in agg.iterrows():
            key = f"{int(row['hour']):02d}:{int(row['minute']):02d}"
            curve[key] = float(row["congestion_score"]) / total

        log.info(
            "Diurnal curve built: %d slots, peak at %s (weight=%.4f)",
            len(curve),
            max(curve, key=curve.get),
            max(curve.values()),
        )
        return curve

    # ------------------------------------------------------------------
    def _build_intersection_congestion(
        self, df: pd.DataFrame, node_map: dict[str, int]
    ) -> dict:
        """
        Build a per-intersection, per-direction timeseries of congestion scores
        mapped to graph node IDs.

        Output structure:
        {
          "AlankarChowk": {
            "node_id": 6925879402,
            "timeseries": [
              {"bucket": "2023-01-11T09:00:00", "direction": "DOWN",
               "congestion_score": 29.05, "hour": 9, "minute": 0},
              ...
            ]
          },
          ...
        }
        """
        # Reverse map: "Alankar Chowk, Pune, India" → "AlankarChowk"
        name_map = {
            "Alankar Chowk, Pune, India": "AlankarChowk",
            "Jehangir Chowk, Pune, India": "JehangirChowk",
            "RTO Chowk, Pune, India": "RTOChowk",
        }

        result: dict[str, dict] = {}
        for full_name, node_id in node_map.items():
            short = name_map.get(full_name, full_name.split(",")[0].replace(" ", ""))
            sub = df[df["intersection"] == short].copy()
            if sub.empty:
                log.warning("No traffic rows for intersection '%s'.", short)
                continue

            sub["hour"] = sub["bucket"].dt.hour
            sub["minute"] = sub["bucket"].dt.minute

            records = []
            for _, row in sub.iterrows():
                records.append(
                    {
                        "bucket": row["bucket"].isoformat(),
                        "direction": row["Direction"],
                        "congestion_score": round(float(row["congestion_score"]), 4),
                        "hour": int(row["hour"]),
                        "minute": int(row["minute"]),
                    }
                )

            result[short] = {"node_id": int(node_id), "timeseries": records}
            log.info(
                "  %s → node %d  (%d records)",
                short,
                node_id,
                len(records),
            )

        return result

    # ------------------------------------------------------------------
    def run(self) -> tuple[dict, dict]:
        """
        Execute the full loading pipeline.

        Returns:
            (diurnal_curve, intersection_congestion)
        """
        df = self._load_raw()
        df = self._compute_congestion_score(df)

        # Load intersection → node ID mapping
        node_map_path = self.root / self.cfg["data"]["intersection_nodes"]
        with open(node_map_path) as fh:
            node_map: dict[str, int] = json.load(fh)
        log.info("Intersection node map loaded: %s", list(node_map.keys()))

        diurnal_curve = self._build_diurnal_curve(df)
        intersection_cong = self._build_intersection_congestion(df, node_map)

        # Persist
        out_dir = self.root / self.cfg["output"]["processed_dir"]
        out_dir.mkdir(parents=True, exist_ok=True)

        diurnal_path = self.root / self.cfg["output"]["diurnal_curve"]
        with open(diurnal_path, "w") as fh:
            json.dump(diurnal_curve, fh, indent=2)
        log.info("Diurnal curve saved → %s", diurnal_path)

        ic_path = out_dir / "intersection_congestion.json"
        with open(ic_path, "w") as fh:
            json.dump(intersection_cong, fh, indent=2)
        log.info("Intersection congestion timeseries saved → %s", ic_path)

        return diurnal_curve, intersection_cong

    # ------------------------------------------------------------------
    def print_summary(self, diurnal: dict) -> None:
        """Print peak / off-peak congestion statistics for quick sanity-check."""
        if not diurnal:
            return
        peak_slot = max(diurnal, key=diurnal.get)
        peak_weight = diurnal[peak_slot]
        # Top-5 slots
        top5 = sorted(diurnal.items(), key=lambda x: x[1], reverse=True)[:5]
        log.info("=== Diurnal Curve Summary ===")
        log.info("Peak slot: %s  (%.2f%% of morning traffic)", peak_slot, peak_weight * 100)
        log.info("Top-5 peak slots:")
        for slot, w in top5:
            log.info("   %s  →  %.2f%%", slot, w * 100)


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Load and normalise Pune traffic data.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    loader = TrafficLoader(cfg)
    diurnal, intersection_cong = loader.run()
    loader.print_summary(diurnal)

    log.info(
        "Intersections with data: %s",
        ", ".join(intersection_cong.keys()),
    )


if __name__ == "__main__":
    main()
