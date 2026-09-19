"""
pipeline/3_fleet_composer.py
==============================
Stage 3 of the preprocessing pipeline.

Responsibilities:
  - Ingest the Pune vehicle registration modal share data (2014-2020)
  - Project modal share percentages to the most recent available year
  - Map raw vehicle categories to the simulation's vehicle classes
  - Assign Priority Weight (W_v) and PCE value from config to each class
  - Build and persist a weighted sampling distribution for synthetic agent generation

Output artefacts:
  processed/fleet_distribution.json

Usage:
  python pipeline/3_fleet_composer.py --config config/pune_config.yaml
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import pandas as pd
import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mapping from modal share CSV categories to simulation vehicle classes
# ---------------------------------------------------------------------------
# The modal share CSV has these vehicle types (column "Type of Vehicle"):
#   Buses, Light Motor Vehicles, Goods Carrier Vehicles, Two Wheelers,
#   Four Wheelers, Miscellaneous, Total
#
# We map them to simulation vehicle classes that correspond to keys in
# config.vehicle_weights and config.pce.
_MODAL_MAP: dict[str, list[str]] = {
    "Two Wheelers":           ["motorbike"],
    "Buses":                  ["transit_bus"],
    # LMV and Four Wheelers are both personal cars/taxis; split as pool vs single
    "Light Motor Vehicles":   ["car_pool", "car_single"],
    "Four Wheelers":          ["car_pool", "car_single"],
    "Goods Carrier Vehicles": ["truck_freight", "truck_essential"],
    "Miscellaneous":          ["motorbike"],    # mostly auto-rickshaws — treat as motorbike-equivalent
}

# Within a multi-class mapping, default split ratios
_SPLIT_RATIOS: dict[str, list[float]] = {
    "car_pool_car_single":              [0.25, 0.75],  # 25% pool, 75% single occupancy
    "truck_freight_truck_essential":    [0.70, 0.30],  # 70% non-essential
}


class FleetComposer:
    """
    Builds a weighted sampling distribution over simulation vehicle classes
    from real-world vehicle registration data.

    The distribution is a list of dicts:
    [
      {
        "vehicle_class": "motorbike",
        "weight": 0.52,          # share of total fleet (0-1, sums to 1)
        "pce": 0.75,
        "priority_weight": 1.5   # W_v — from config
      },
      ...
    ]
    """

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.vehicle_weights: dict[str, float] = cfg.get("vehicle_weights", {})
        self.pce_map: dict[str, float] = cfg.get("pce", {})

    # ------------------------------------------------------------------
    def _load_modal_share(self) -> pd.DataFrame:
        path = self.root / self.cfg["data"]["modal_share"]
        log.info("Loading modal share from %s …", path)
        df = pd.read_csv(path)
        log.info("Columns: %s", df.columns.tolist())
        log.info("Vehicle types: %s", df["Type of Vehicle"].tolist())
        return df

    # ------------------------------------------------------------------
    def _extract_counts(self, df: pd.DataFrame) -> dict[str, float]:
        """
        Return the most recent year's counts for each vehicle type,
        excluding the 'Total' row.
        """
        # Year columns — pick the most recent with data (rightmost non-null)
        year_cols = [c for c in df.columns if c not in ("_id", "Type of Vehicle")]

        counts: dict[str, float] = {}
        for _, row in df.iterrows():
            vtype = str(row["Type of Vehicle"]).strip()
            if vtype == "Total":
                continue
            # Walk year columns right-to-left and pick the first non-zero value
            val = 0.0
            for yr in reversed(year_cols):
                try:
                    v = float(str(row[yr]).replace(",", ""))
                    if v > 0:
                        val = v
                        break
                except (ValueError, TypeError):
                    pass
            counts[vtype] = val

        log.info("Raw vehicle counts: %s", counts)
        return counts

    # ------------------------------------------------------------------
    def _map_to_vehicle_classes(self, counts: dict[str, float]) -> dict[str, float]:
        """
        Distribute raw category counts into simulation vehicle classes.
        Returns {vehicle_class: raw_count}.
        """
        class_counts: dict[str, float] = {}

        for raw_cat, count in counts.items():
            target_classes = _MODAL_MAP.get(raw_cat)
            if target_classes is None:
                log.debug("No mapping for category '%s' — skipped.", raw_cat)
                continue

            if len(target_classes) == 1:
                cls = target_classes[0]
                class_counts[cls] = class_counts.get(cls, 0.0) + count
            else:
                # Use pre-defined split ratios
                split_key = "_".join(target_classes)
                ratios = _SPLIT_RATIOS.get(split_key, [1.0 / len(target_classes)] * len(target_classes))
                for cls, ratio in zip(target_classes, ratios):
                    class_counts[cls] = class_counts.get(cls, 0.0) + count * ratio

        return class_counts

    # ------------------------------------------------------------------
    def build(self) -> list[dict]:
        df = self._load_modal_share()
        counts = self._extract_counts(df)
        class_counts = self._map_to_vehicle_classes(counts)

        total = sum(class_counts.values())
        if total == 0:
            log.warning("All vehicle class counts are zero — using uniform distribution.")
            total = 1.0

        distribution: list[dict] = []
        for cls, count in sorted(class_counts.items()):
            weight = count / total
            entry = {
                "vehicle_class": cls,
                "weight": round(weight, 6),
                "pce": self.pce_map.get(
                    # normalise key: car_pool → car, truck_freight → truck, etc.
                    cls.split("_")[0] if "_" in cls else cls,
                    1.0,
                ),
                "priority_weight": self.vehicle_weights.get(cls, 1.0),
            }
            distribution.append(entry)
            log.info(
                "  %-20s  weight=%.3f  pce=%.2f  W_v=%.2f",
                cls, weight, entry["pce"], entry["priority_weight"],
            )

        # Ensure weights sum to exactly 1.0 (fix float rounding)
        total_w = sum(d["weight"] for d in distribution)
        if distribution and abs(total_w - 1.0) > 1e-6:
            distribution[-1]["weight"] += 1.0 - total_w
            distribution[-1]["weight"] = round(distribution[-1]["weight"], 6)

        return distribution

    # ------------------------------------------------------------------
    def save(self, distribution: list[dict]) -> Path:
        out_dir = self.root / self.cfg["output"]["processed_dir"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = self.root / self.cfg["output"]["fleet_dist"]
        with open(out_path, "w") as fh:
            json.dump(distribution, fh, indent=2)
        log.info("Fleet distribution saved → %s", out_path)
        return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Build fleet vehicle-class distribution.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    composer = FleetComposer(cfg)
    dist = composer.build()
    composer.save(dist)

    log.info("Fleet summary: %d vehicle classes", len(dist))
    for entry in dist:
        log.info(
            "  %s  %.1f%% of fleet",
            entry["vehicle_class"],
            entry["weight"] * 100,
        )


if __name__ == "__main__":
    main()
