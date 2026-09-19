"""
aco/pheromone_map.py
=====================
Manages the full pheromone state for the ACO simulation.

Two-layer pheromone system:

  tau_pos[u][v]  — positive pheromone: accumulated by ants on good paths.
                   Attractant. Classic ACO deposit / evaporation.

  tau_neg[u][v]  — negative pheromone: spiked when a road's Volume/Capacity
                   ratio exceeds a threshold (Mutation A).
                   Repellent. Evaporates faster than positive.

Effective pheromone seen by an ant with weight W_v (Mutation B):
  tau_eff = tau_pos - W_v * tau_neg     (clamped to tau_min)

Design decisions:
  - Stored as plain Python dicts of dicts for sparse-graph compatibility.
    NetworkX edge keys are (u, v) or (u, v, key) for multigraphs; we
    use only (u, v) and sum over parallel edges when reading capacity.
  - All methods are intentionally side-effect-free where possible to ease
    parallel ant construction (each ant reads, colony writes after iteration).
"""

from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)


class PheromoneMap:
    """
    Maintains positive and negative pheromone levels for every directed
    edge (u, v) in the road network graph.

    Parameters
    ----------
    graph : nx.DiGraph
        The enriched road network from pipeline stage 1.
    cfg : dict
        Full config dict; reads tau_init, tau_min, rho, neg_evaporation,
        neg_pheromone_scale, vc_threshold.
    """

    def __init__(self, graph, cfg: dict) -> None:
        self.cfg = cfg
        self.tau_init: float = cfg.get("tau_init", 1.0)
        self.tau_min: float = cfg.get("tau_min", 0.001)
        self.rho: float = cfg.get("rho", 0.1)               # positive evaporation
        self.neg_rho: float = cfg.get("neg_evaporation", 0.15)  # negative evaporates faster
        self.neg_scale: float = cfg.get("neg_pheromone_scale", 5.0)
        self.vc_thresh: float = cfg.get("vc_threshold", 0.7)

        # Initialise pheromone matrices as nested dicts: {u: {v: value}}
        self.tau_pos: dict[Any, dict[Any, float]] = {}
        self.tau_neg: dict[Any, dict[Any, float]] = {}

        for u, v in graph.edges():
            self.tau_pos.setdefault(u, {})[v] = self.tau_init
            self.tau_neg.setdefault(u, {})[v] = 0.0

        log.info(
            "PheromoneMap initialised: %d unique source nodes, τ₀=%.3f, ρ=%.2f",
            len(self.tau_pos),
            self.tau_init,
            self.rho,
        )

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_positive(self, u: Any, v: Any) -> float:
        """Return positive pheromone on edge (u→v), defaulting to tau_min."""
        return self.tau_pos.get(u, {}).get(v, self.tau_min)

    def get_negative(self, u: Any, v: Any) -> float:
        """Return negative pheromone on edge (u→v)."""
        return self.tau_neg.get(u, {}).get(v, 0.0)

    def get_effective(self, u: Any, v: Any, w_v: float) -> float:
        """
        Effective pheromone seen by a vehicle with perception weight W_v.

        tau_eff = max(tau_min, tau_pos[u][v] - W_v * tau_neg[u][v])

        Higher W_v → vehicle is more sensitive to congestion (penalised).
        Lower W_v  → vehicle partially ignores negative pheromone (priority routing).
        """
        pos = self.get_positive(u, v)
        neg = self.get_negative(u, v)
        return max(self.tau_min, pos - w_v * neg)

    # ------------------------------------------------------------------
    # Update — called once per iteration after all ants complete
    # ------------------------------------------------------------------

    def evaporate(self) -> None:
        """
        Apply evaporation to ALL positive pheromone values.
        tau_pos *= (1 - rho), clamped at tau_min.

        Call this BEFORE depositing for the current iteration.
        """
        for u in self.tau_pos:
            for v in self.tau_pos[u]:
                self.tau_pos[u][v] = max(
                    self.tau_min,
                    self.tau_pos[u][v] * (1.0 - self.rho),
                )

    def evaporate_negative(self) -> None:
        """
        Apply faster evaporation to negative pheromone.
        tau_neg *= (1 - neg_rho), clamped at 0.
        """
        for u in self.tau_neg:
            for v in self.tau_neg[u]:
                self.tau_neg[u][v] = max(
                    0.0,
                    self.tau_neg[u][v] * (1.0 - self.neg_rho),
                )

    def deposit(self, path: list[Any], delta: float) -> None:
        """
        Deposit delta pheromone on every edge in path.
        path is a list of node IDs: [n0, n1, n2, ...].
        delta = Q / route_cost  (better routes deposit more).
        """
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            if u in self.tau_pos and v in self.tau_pos[u]:
                self.tau_pos[u][v] += delta

    def spike_negative(self, u: Any, v: Any, current_volume_pce: float,
                       capacity_pce_hr: float) -> None:
        """
        Mutation A — Dynamic Negative Pheromones.

        Computes the V/C ratio and spikes tau_neg based on how far the edge
        is above the congestion threshold:

            spike = neg_scale × max(0, V/C - vc_thresh)²

        This creates a non-linear repulsion: mild congestion is tolerated,
        but severe congestion causes exponentially stronger avoidance.
        """
        if capacity_pce_hr <= 0:
            return
        vc_ratio = current_volume_pce / capacity_pce_hr
        if vc_ratio <= self.vc_thresh:
            return  # below threshold — no negative spike
        excess = vc_ratio - self.vc_thresh
        spike = self.neg_scale * (excess ** 2)
        if u in self.tau_neg and v in self.tau_neg[u]:
            self.tau_neg[u][v] += spike
        else:
            self.tau_neg.setdefault(u, {})[v] = spike

    # ------------------------------------------------------------------
    # Bulk negative spike from edge load dict
    # ------------------------------------------------------------------

    def update_negative_from_loads(
        self, edge_loads: dict[tuple, float], graph
    ) -> None:
        """
        Apply negative pheromone spikes for all currently loaded edges.

        Parameters
        ----------
        edge_loads : {(u, v): current_pce_volume}
        graph      : NetworkX DiGraph with capacity_pce_hr attribute
        """
        self.evaporate_negative()
        for (u, v), volume in edge_loads.items():
            cap = None
            # Handle multigraph: take max capacity across parallel edges
            if graph.has_edge(u, v):
                edge_data = graph[u][v]
                # For multigraph keys are integers; for simple graph it's the dict directly
                if isinstance(edge_data, dict) and all(isinstance(k, int) for k in edge_data):
                    cap = max(
                        d.get("capacity_pce_hr", 600)
                        for d in edge_data.values()
                    )
                else:
                    cap = edge_data.get("capacity_pce_hr", 600)
            if cap is not None:
                self.spike_negative(u, v, volume, cap)

    # ------------------------------------------------------------------
    # Diagnostic helpers
    # ------------------------------------------------------------------

    def most_congested_edges(self, top_n: int = 10) -> list[tuple]:
        """Return the top-N edges by negative pheromone level."""
        all_edges = [
            (u, v, val)
            for u, inner in self.tau_neg.items()
            for v, val in inner.items()
            if val > 0
        ]
        all_edges.sort(key=lambda x: x[2], reverse=True)
        return all_edges[:top_n]

    def strongest_positive_edges(self, top_n: int = 10) -> list[tuple]:
        """Return the top-N edges by positive pheromone (the discovered best paths)."""
        all_edges = [
            (u, v, val)
            for u, inner in self.tau_pos.items()
            for v, val in inner.items()
        ]
        all_edges.sort(key=lambda x: x[2], reverse=True)
        return all_edges[:top_n]
