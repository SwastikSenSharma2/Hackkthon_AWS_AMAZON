"""
aco/colony.py
==============
The Colony orchestrates the full ACO iteration loop.

Responsibilities:
  - Spawn `colony_size` ants for each agent batch
  - Run the iteration loop (evaporate → build paths → deposit → update neg phero)
  - Maintain the shared memoization cache (Mutation D)
  - Track edge loads (PCE volume on each edge per time-step)
  - Return the best discovered routes for each agent

Colony ↔ Simulation interface:
  - simulation/runner.py calls Colony.route_batch(agents, time_step) once
    per 5-minute clock tick
  - Colony returns a list of Ant result dicts for writing and API streaming
"""

from __future__ import annotations

import logging
import random
from collections import defaultdict
from typing import Any

import networkx as nx
from tqdm import tqdm

from aco.ant import Ant
from aco.mutations import store_in_cache
from aco.pheromone_map import PheromoneMap

log = logging.getLogger(__name__)


class Colony:
    """
    Manages a swarm of virtual ants solving concurrent routing problems.

    For each group of agents departing in the same time-step, the colony
    runs `n_iterations` rounds of the ACO loop.  Each round:
      1. Evaporate positive pheromone
      2. For each agent, spawn `colony_size` ants (independent path searches)
      3. Select the best ant (lowest cost) as the agent's route for this iteration
      4. Deposit pheromone proportional to route quality
      5. Update negative pheromone from current edge loads
      6. Cache tail suffixes for future ants (Mutation D)

    Parameters
    ----------
    G : nx.DiGraph
        Enriched road network graph.
    cfg : dict
        Full config dict.
    pheromone_map : PheromoneMap
        Shared pheromone state (persists across all time-steps).
    """

    def __init__(
        self,
        G: nx.DiGraph,
        cfg: dict,
        pheromone_map: PheromoneMap,
    ) -> None:
        self.G = G
        self.cfg = cfg
        self.pheromone_map = pheromone_map

        self.colony_size: int = cfg.get("colony_size", 50)
        self.n_iterations: int = cfg.get("iterations", 100)
        self.q: float = cfg.get("q_deposit", 100.0)
        self.cache_max: int = cfg.get("cache_max_size", 10_000)
        self.seed: int = cfg.get("random_seed", 42)

        # Shared volatile memoization cache (Mutation D)
        # {(node, destination): {"path": [...], "cost": float}}
        self.cache: dict[tuple, dict] = {}

        # Running edge load accumulator (PCE units) — reset each time-step
        # {(u, v): total PCE assigned this time-step}
        self.edge_loads: dict[tuple, float] = defaultdict(float)

        # Master RNG for reproducible colony behaviour
        self._master_rng = random.Random(self.seed)

    # ------------------------------------------------------------------
    # Public API — called by simulation/runner.py
    # ------------------------------------------------------------------

    def route_batch(
        self,
        agents: list[dict],
        time_step_label: str = "",
        show_progress: bool = True,
    ) -> list[dict]:
        """
        Route a batch of agents departing in the same 5-minute time-step.

        For each agent, the colony runs multiple ants across multiple
        iterations and returns the best route found.

        Parameters
        ----------
        agents          : list of agent dicts from the agent matrix
        time_step_label : e.g. "08:30" — used in logging only
        show_progress   : show tqdm progress bar

        Returns
        -------
        list[dict] : one result dict per agent (from Ant.to_dict())
        """
        if not agents:
            return []

        log.info(
            "[%s] Routing %d agents — %d iterations × %d ants",
            time_step_label, len(agents), self.n_iterations, self.colony_size,
        )

        # Reset per-time-step edge loads
        self.edge_loads = defaultdict(float)

        results: list[dict] = []

        agent_iter = tqdm(agents, desc=f"[{time_step_label}] agents", leave=False) \
            if show_progress else agents

        for agent in agent_iter:
            best_ant = self._solve_for_agent(agent)
            if best_ant.success:
                self._register_edge_loads(best_ant.path, best_ant.pce)
            results.append(best_ant.to_dict())

        # After all agents are routed, update negative pheromones from
        # the accumulated edge loads for this time-step
        self.pheromone_map.update_negative_from_loads(
            dict(self.edge_loads), self.G
        )

        # Logging summary
        n_success = sum(1 for r in results if r["success"])
        n_cache = sum(1 for r in results if r["cache_hit"])
        avg_cost = (
            sum(r["total_cost_s"] for r in results if r["success"]) / max(n_success, 1)
        )
        log.info(
            "[%s] Done — success: %d/%d  cache_hits: %d  avg_cost: %.0fs",
            time_step_label, n_success, len(agents), n_cache, avg_cost,
        )

        return results

    # ------------------------------------------------------------------
    # Per-agent iteration loop
    # ------------------------------------------------------------------

    def _solve_for_agent(self, agent: dict) -> Ant:
        """
        Run `n_iterations` ACO rounds for a single agent.

        Within each iteration, spawn `colony_size` ants in parallel
        (Python threads would help here on a GPU machine; kept serial
        for portability on the weak laptop target).

        Returns the best Ant found across all iterations.
        """
        best_ant: Ant | None = None

        for iteration in range(self.n_iterations):
            # Evaporate positive pheromone once per iteration
            self.pheromone_map.evaporate()

            iteration_ants: list[Ant] = []
            for _ in range(self.colony_size):
                rng = random.Random(self._master_rng.randint(0, 2**31))
                ant = Ant(
                    agent=agent,
                    G=self.G,
                    pheromone_map=self.pheromone_map,
                    cache=self.cache,
                    cfg=self.cfg,
                    rng=rng,
                )
                ant.build_path()
                iteration_ants.append(ant)

            # Deposit pheromone for successful ants in this iteration
            successful = [a for a in iteration_ants if a.success]
            for ant in successful:
                delta = ant.deposit_amount()
                if delta > 0:
                    self.pheromone_map.deposit(ant.path, delta)

            # Cache the best tail of this iteration
            if successful:
                iter_best = min(successful, key=lambda a: a.total_cost)
                store_in_cache(
                    self.cache,
                    iter_best.path,
                    iter_best.destination,
                    iter_best.total_cost,
                    self.cache_max,
                )
                if best_ant is None or iter_best.total_cost < best_ant.total_cost:
                    best_ant = iter_best

        # If no successful ant found across all iterations, return a failed ant
        if best_ant is None:
            rng = random.Random(self._master_rng.randint(0, 2**31))
            best_ant = Ant(agent, self.G, self.pheromone_map, self.cache, self.cfg, rng)
            best_ant.build_path()

        return best_ant

    # ------------------------------------------------------------------
    # Edge load tracking
    # ------------------------------------------------------------------

    def _register_edge_loads(self, path: list[Any], pce: float) -> None:
        """
        Add this agent's PCE contribution to every edge it uses.
        Edge loads drive the negative pheromone update at the end of the batch.
        """
        for i in range(len(path) - 1):
            self.edge_loads[(path[i], path[i + 1])] += pce

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def pheromone_summary(self) -> dict:
        """Return a summary of current pheromone state for API streaming."""
        top_pos = self.pheromone_map.strongest_positive_edges(20)
        top_neg = self.pheromone_map.most_congested_edges(20)
        return {
            "top_positive_edges": [
                {"u": int(u), "v": int(v), "tau_pos": round(val, 4)}
                for u, v, val in top_pos
            ],
            "top_negative_edges": [
                {"u": int(u), "v": int(v), "tau_neg": round(val, 4)}
                for u, v, val in top_neg
            ],
            "cache_size": len(self.cache),
            "edge_loads": {
                f"{u}_{v}": round(load, 2)
                for (u, v), load in list(self.edge_loads.items())[:50]
            },
        }
