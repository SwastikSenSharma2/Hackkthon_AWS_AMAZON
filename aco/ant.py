"""
aco/ant.py
============
Represents a single virtual ant navigating the road network.

Each ant encapsulates one agent's routing attempt for a single ACO iteration.
Ants are stateful during construction of their path, then become read-only
result objects used by the colony to deposit pheromones.

The ant applies all five mutations at decision time:
  A — reads effective pheromone (tau_pos - W_v*tau_neg) from PheromoneMap
  B — W_v scaling built into PheromoneMap.get_effective()
  C — directional_filter() prunes backward edges before probability calc
  D — check_memoization_cache() short-circuits path construction
  E — turn_penalty() is added to travel_time_s during cost accumulation
"""

from __future__ import annotations

import logging
import math
import random
from typing import Any, Optional

import networkx as nx

from aco.mutations import (
    directional_filter,
    check_memoization_cache,
    turn_penalty,
)
from aco.pheromone_map import PheromoneMap

log = logging.getLogger(__name__)

# Maximum steps before the ant gives up (prevents infinite loops on
# poorly-connected subgraphs)
_MAX_STEPS = 500


class Ant:
    """
    A single virtual ant that constructs a route from origin to destination.

    Parameters
    ----------
    agent : dict
        Agent entry from the agent matrix with keys:
        agent_id, origin_node, destination_node, vehicle_class,
        pce_value, priority_weight, departure_time.
    G : nx.DiGraph
        Enriched road network graph.
    pheromone_map : PheromoneMap
        Shared pheromone state (read only during path construction).
    cache : dict
        Shared memoization cache (read during construction; write by colony).
    cfg : dict
        Full config dict.
    rng : random.Random
        Per-ant random number generator (seeded externally for reproducibility).
    """

    def __init__(
        self,
        agent: dict,
        G: nx.DiGraph,
        pheromone_map: PheromoneMap,
        cache: dict,
        cfg: dict,
        rng: Optional[random.Random] = None,
    ) -> None:
        self.agent = agent
        self.G = G
        self.pheromone_map = pheromone_map
        self.cache = cache
        self.cfg = cfg
        self.rng = rng or random.Random()

        # Route state
        self.origin: Any = agent["origin_node"]
        self.destination: Any = agent["destination_node"]
        self.vehicle_class: str = agent.get("vehicle_class", "car_single")
        self.w_v: float = float(agent.get("priority_weight", 1.0))
        self.pce: float = float(agent.get("pce_value", 1.0))

        # Result
        self.path: list[Any] = []
        self.total_cost: float = 0.0   # seconds
        self.success: bool = False
        self.cache_hit: bool = False

        # ACO params
        self.alpha: float = cfg.get("alpha", 1.0)
        self.beta: float = cfg.get("beta", 2.5)
        self.q: float = cfg.get("q_deposit", 100.0)

        # Mutation parameters
        self.backward_tol: float = cfg.get("backward_tolerance", 0.05)
        self.cache_inv_thresh: float = cfg.get("cache_invalidation_threshold", 1.5)
        self.turn_penalties: dict = cfg.get("turn_penalties", {})
        self.angle_thresholds: dict = cfg.get("turn_angle_thresholds", {})

    # ------------------------------------------------------------------
    # Main construction method
    # ------------------------------------------------------------------

    def build_path(self) -> None:
        """
        Construct a complete route from origin to destination.

        Algorithm:
        1. Start at origin node.
        2. At each step:
           a. Check memoization cache (Mutation D) — if hit, append cached tail.
           b. Build directional candidate list (Mutation C).
           c. Compute selection probabilities for each candidate.
           d. Roll the weighted die — choose next node.
           e. Move; accumulate edge travel time + turn penalty (Mutation E).
        3. Stop when destination is reached or MAX_STEPS exceeded.
        """
        if self.origin not in self.G or self.destination not in self.G:
            log.debug(
                "Agent %s: origin or destination node not in graph.",
                self.agent["agent_id"],
            )
            return

        current = self.origin
        self.path = [current]
        visited: set[Any] = {current}
        prev_node: Optional[Any] = None
        step = 0

        while current != self.destination and step < _MAX_STEPS:
            step += 1

            # ---- Mutation D: Check memoization cache ----
            cached_tail = check_memoization_cache(
                self.cache,
                current,
                self.destination,
                self.pheromone_map,
                self.cache_inv_thresh,
            )
            if cached_tail is not None:
                # Append the tail (skip the first element — it's `current`)
                tail_cost = self._compute_path_cost(cached_tail)
                self.path.extend(cached_tail[1:])
                self.total_cost += tail_cost
                self.cache_hit = True
                self.success = (self.path[-1] == self.destination)
                return

            # ---- Get candidate neighbours ----
            raw_successors = [
                v for v in self.G.successors(current) if v not in visited
            ]
            if not raw_successors:
                # Dead-end — ant fails
                break

            # ---- Mutation C: Directional filter ----
            candidates = directional_filter(
                current,
                raw_successors,
                self.destination,
                self.G,
                self.backward_tol,
            )

            # ---- Compute selection probabilities ----
            next_node = self._choose_next(current, candidates, prev_node)
            if next_node is None:
                break

            # ---- Accumulate cost ----
            edge_cost = self._edge_cost(current, next_node)
            t_penalty = turn_penalty(
                prev_node, current, next_node,
                self.G, self.turn_penalties, self.angle_thresholds,
            )
            self.total_cost += edge_cost + t_penalty

            prev_node = current
            current = next_node
            self.path.append(current)
            visited.add(current)

        self.success = (current == self.destination)

    # ------------------------------------------------------------------
    # Probabilistic next-node selection
    # ------------------------------------------------------------------

    def _choose_next(
        self, current: Any, candidates: list[Any], prev_node: Optional[Any]
    ) -> Optional[Any]:
        """
        Roll the weighted probabilistic die to select the next node.

        For each candidate v:
          tau_eff   = pheromone_map.get_effective(current, v, w_v)
          eta       = heuristic visibility = 1 / travel_time_s (stored on edge)
          score_v   = tau_eff^alpha × eta^beta

        Probability of choosing v = score_v / sum(scores)

        This is the core ACO transition rule with Mutation B (heterogeneous
        perception) already baked into get_effective() via W_v.
        """
        scores: list[float] = []
        for v in candidates:
            tau_eff = self.pheromone_map.get_effective(current, v, self.w_v)
            eta = self._get_eta(current, v)
            score = (tau_eff ** self.alpha) * (eta ** self.beta)
            scores.append(max(score, 1e-10))

        total = sum(scores)
        if total == 0:
            return self.rng.choice(candidates)

        # Weighted random selection
        r = self.rng.random() * total
        cumulative = 0.0
        for v, score in zip(candidates, scores):
            cumulative += score
            if r <= cumulative:
                return v
        return candidates[-1]  # fallback

    # ------------------------------------------------------------------
    # Cost helpers
    # ------------------------------------------------------------------

    def _get_eta(self, u: Any, v: Any) -> float:
        """Fetch pre-computed heuristic visibility η = 1/travel_time_s."""
        edge_data = self.G.get_edge_data(u, v)
        if edge_data is None:
            return 1e-6
        # Handle multigraph (keys are 0, 1, ...) vs simple graph
        if isinstance(edge_data, dict) and all(isinstance(k, int) for k in edge_data):
            # Multigraph: pick the edge with highest eta (shortest travel time)
            return max(
                (d.get("eta", 1e-6) for d in edge_data.values()),
                default=1e-6,
            )
        return float(edge_data.get("eta", 1e-6))

    def _edge_cost(self, u: Any, v: Any) -> float:
        """Return free-flow travel time (seconds) for edge u→v."""
        edge_data = self.G.get_edge_data(u, v)
        if edge_data is None:
            return 60.0  # default 1-minute fallback
        if isinstance(edge_data, dict) and all(isinstance(k, int) for k in edge_data):
            return min(
                d.get("travel_time_s", 60.0) for d in edge_data.values()
            )
        return float(edge_data.get("travel_time_s", 60.0))

    def _compute_path_cost(self, path: list[Any]) -> float:
        """Compute total travel time for a node sequence (used for cached tails)."""
        cost = 0.0
        for i in range(len(path) - 1):
            cost += self._edge_cost(path[i], path[i + 1])
        return cost

    # ------------------------------------------------------------------
    # Deposit amount
    # ------------------------------------------------------------------

    def deposit_amount(self) -> float:
        """
        Pheromone deposit for this ant's path.
        Better (lower cost) routes deposit more:  delta = Q / cost
        Failed routes deposit nothing.
        """
        if not self.success or self.total_cost <= 0:
            return 0.0
        return self.q / self.total_cost

    # ------------------------------------------------------------------
    # Serialisation (for result streaming / storage)
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent["agent_id"],
            "vehicle_class": self.vehicle_class,
            "departure_time": self.agent.get("departure_time"),
            "origin_node": int(self.origin),
            "destination_node": int(self.destination),
            "path": [int(n) for n in self.path],
            "path_length": len(self.path),
            "total_cost_s": round(self.total_cost, 2),
            "success": self.success,
            "cache_hit": self.cache_hit,
            "priority_weight": self.w_v,
        }
