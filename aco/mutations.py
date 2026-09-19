"""
aco/mutations.py
==================
The five custom mutations that distinguish this ACO implementation from the
classic textbook algorithm.  Every mutation is a self-contained, pure function
with no side-effects, making them individually testable and interchangeable.

MUTATION A — Dynamic Negative Pheromones
  Spikes a repellent signal based on real-time V/C ratio.
  Lives in PheromoneMap.spike_negative() and is called here as a helper.

MUTATION B — Heterogeneous Perception
  Different vehicle classes perceive the same edge differently via W_v scaling.

MUTATION C — Directional Candidate List
  Prunes edges that move the ant geometrically backwards toward the destination.

MUTATION D — Volatile Suffix Memoization
  Caches optimal route tails; invalidates when congestion spikes on the cached path.

MUTATION E — Intersection and Turn Penalties
  Adds geometry-based delay (right turns across traffic, U-turns) to node transitions.
"""

from __future__ import annotations

import math
from typing import Any, Optional

import networkx as nx


# ===========================================================================
# MUTATION A — Dynamic Negative Pheromones
# (Primary logic is in PheromoneMap.spike_negative; this is a standalone helper)
# ===========================================================================

def negative_pheromone_spike(
    current_volume_pce: float,
    capacity_pce_hr: float,
    neg_scale: float = 5.0,
    vc_threshold: float = 0.70,
) -> float:
    """
    Compute the negative pheromone spike value for an edge.

        spike = neg_scale × max(0, V/C − vc_threshold)²

    The quadratic term ensures mild congestion is tolerated while
    severe overload generates disproportionately strong repulsion.

    Parameters
    ----------
    current_volume_pce  : PCE units currently assigned to this edge
    capacity_pce_hr     : maximum PCE / hr from capacity table
    neg_scale           : config['neg_pheromone_scale']
    vc_threshold        : config['vc_threshold'] — V/C level above which
                          negative pheromone is generated

    Returns
    -------
    float : pheromone spike value (≥ 0)
    """
    if capacity_pce_hr <= 0:
        return 0.0
    vc_ratio = current_volume_pce / capacity_pce_hr
    excess = max(0.0, vc_ratio - vc_threshold)
    return neg_scale * (excess ** 2)


# ===========================================================================
# MUTATION B — Heterogeneous Perception
# ===========================================================================

def heterogeneous_perception(
    tau_neg: float,
    vehicle_class: str,
    vehicle_weights: dict[str, float],
) -> float:
    """
    Mutation B — scale the negative pheromone perceived by a vehicle
    according to its class-specific priority multiplier W_v.

        perceived_neg = W_v × tau_neg

    This means:
      - transit_bus  (W_v=0.5) sees HALF the repulsion → routes through busy arterials
      - car_single   (W_v=2.0) sees DOUBLE the repulsion → pushed to side streets

    Parameters
    ----------
    tau_neg         : raw negative pheromone on an edge
    vehicle_class   : e.g. 'transit_bus', 'car_single', 'truck_freight'
    vehicle_weights : config['vehicle_weights']

    Returns
    -------
    float : scaled negative pheromone perception
    """
    w_v = vehicle_weights.get(vehicle_class, 1.0)
    return w_v * tau_neg


# ===========================================================================
# MUTATION C — Directional Candidate List
# ===========================================================================

def directional_filter(
    current_node: Any,
    neighbors: list[Any],
    destination_node: Any,
    G: nx.DiGraph,
    backward_tolerance: float = 0.05,
) -> list[Any]:
    """
    Mutation C — prune edges that move the ant geometrically backwards.

    For each neighbor v of current_node, compute:
        dist_current_to_dest = haversine(current_node, destination_node)
        dist_neighbor_to_dest = haversine(v, destination_node)

    If moving to v INCREASES straight-line distance to destination by more
    than `backward_tolerance` fraction, exclude v from the candidate list.

    A small tolerance (5%) prevents dead-ends where the ant gets trapped
    because every forward move was pruned by local geometry.

    Parameters
    ----------
    current_node       : current graph node ID
    neighbors          : list of adjacent node IDs (successors in DiGraph)
    destination_node   : target node ID
    G                  : enriched NetworkX DiGraph with lat/lon node attributes
    backward_tolerance : fraction of d(current→dest) allowed as "backward" step

    Returns
    -------
    list[Any] : filtered candidate neighbor list (may equal input if all pass)
    """
    current_lat = G.nodes[current_node].get("lat", 0.0)
    current_lon = G.nodes[current_node].get("lon", 0.0)
    dest_lat = G.nodes[destination_node].get("lat", 0.0)
    dest_lon = G.nodes[destination_node].get("lon", 0.0)

    d_current = _haversine(current_lat, current_lon, dest_lat, dest_lon)
    # If already at or very close to destination, don't filter
    if d_current < 1.0:
        return neighbors

    threshold = d_current * (1.0 + backward_tolerance)

    filtered = []
    for v in neighbors:
        v_lat = G.nodes[v].get("lat", 0.0)
        v_lon = G.nodes[v].get("lon", 0.0)
        d_neighbor = _haversine(v_lat, v_lon, dest_lat, dest_lon)
        if d_neighbor <= threshold:
            filtered.append(v)

    # Safety: if the filter removed everything, return the original list
    # (the ant might be in a cul-de-sac and needs to backtrack)
    return filtered if filtered else neighbors


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres."""
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(min(a, 1.0)))


# ===========================================================================
# MUTATION D — Volatile Suffix Memoization
# ===========================================================================

def check_memoization_cache(
    cache: dict[tuple, dict],
    current_node: Any,
    destination_node: Any,
    pheromone_map,
    invalidation_threshold: float = 1.5,
) -> Optional[list[Any]]:
    """
    Mutation D — Volatile Suffix Memoization.

    Checks whether the cache holds a valid pre-computed tail route from
    `current_node` to `destination_node`.  The cache entry is invalidated
    and deleted if any edge on the cached tail has accumulated negative
    pheromone above `invalidation_threshold`.

    Parameters
    ----------
    cache                   : shared dict {(node, dest): {"path": [...], "cost": float}}
    current_node            : node where the ant currently stands
    destination_node        : routing destination
    pheromone_map           : PheromoneMap instance (to read tau_neg)
    invalidation_threshold  : tau_neg level that triggers cache eviction

    Returns
    -------
    list[Any] | None : cached path (including current_node) if valid, else None
    """
    key = (current_node, destination_node)
    entry = cache.get(key)
    if entry is None:
        return None

    cached_path: list[Any] = entry["path"]

    # Volatile check: scan every edge of the cached tail for congestion spikes
    for i in range(len(cached_path) - 1):
        u, v = cached_path[i], cached_path[i + 1]
        neg = pheromone_map.get_negative(u, v)
        if neg >= invalidation_threshold:
            # Cache is stale — evict it and force fresh recalculation
            del cache[key]
            return None

    return cached_path


def store_in_cache(
    cache: dict[tuple, dict],
    path: list[Any],
    destination_node: Any,
    cost: float,
    max_cache_size: int = 10_000,
) -> None:
    """
    Store the tail of a completed ant path in the memoization cache.

    For every suffix of `path` ending at `destination_node`, we store
    that sub-path so future ants can short-circuit their search.

    Parameters
    ----------
    cache            : shared cache dict (mutated in place)
    path             : full node list from this ant's route
    destination_node : final node in path
    cost             : total route cost (travel time seconds)
    max_cache_size   : evict oldest entry when cache exceeds this size
    """
    if not path or path[-1] != destination_node:
        return

    # Store every suffix starting from index i
    for i in range(len(path)):
        if i == len(path) - 1:
            break  # no useful suffix from the last node
        tail = path[i:]
        key = (path[i], destination_node)
        if key not in cache:
            # Rough cost proportional to remaining tail length
            tail_cost = cost * len(tail) / len(path)
            cache[key] = {"path": tail, "cost": tail_cost}
            if len(cache) > max_cache_size:
                # Evict the first inserted key (oldest)
                oldest = next(iter(cache))
                del cache[oldest]


# ===========================================================================
# MUTATION E — Intersection and Turn Penalties
# ===========================================================================

def turn_penalty(
    prev_node: Any,
    current_node: Any,
    next_node: Any,
    G: nx.DiGraph,
    turn_penalty_cfg: dict[str, float],
    angle_thresholds: dict[str, float],
) -> float:
    """
    Mutation E — Intersection and Turn Penalties.

    Computes the geometric delay (seconds) incurred by transitioning from
    edge (prev→current) to edge (current→next) based on the bearing change.

    Bearing change classification:
      |Δbearing| ≤ straight_max    → straight  (0s penalty)
      Δbearing  >  right_min       → right across traffic (45s)
      Δbearing  <  left_min (neg)  → left merge (15s)
      |Δbearing| ≥ 150°            → U-turn (60s)

    Parameters
    ----------
    prev_node       : node the ant came FROM
    current_node    : node the ant is currently AT (the intersection)
    next_node       : node the ant intends to go TO
    G               : enriched DiGraph with lat/lon attributes
    turn_penalty_cfg    : config['turn_penalties']
    angle_thresholds    : config['turn_angle_thresholds']

    Returns
    -------
    float : delay in seconds
    """
    # Coordinates
    def _coords(n: Any) -> tuple[float, float]:
        return G.nodes[n].get("lat", 0.0), G.nodes[n].get("lon", 0.0)

    if prev_node is None:
        # First step — no incoming edge, no turn penalty
        return 0.0

    prev_lat, prev_lon = _coords(prev_node)
    curr_lat, curr_lon = _coords(current_node)
    next_lat, next_lon = _coords(next_node)

    bearing_in = _bearing(prev_lat, prev_lon, curr_lat, curr_lon)
    bearing_out = _bearing(curr_lat, curr_lon, next_lat, next_lon)

    delta = bearing_out - bearing_in
    # Normalise to [-180, 180]
    delta = ((delta + 180) % 360) - 180

    straight_max = angle_thresholds.get("straight_max", 30.0)
    right_min = angle_thresholds.get("right_min", 30.0)
    left_min = angle_thresholds.get("left_min", -30.0)

    if abs(delta) >= 150:
        return float(turn_penalty_cfg.get("u_turn", 60))
    elif abs(delta) <= straight_max:
        return float(turn_penalty_cfg.get("straight", 0))
    elif delta > right_min:
        return float(turn_penalty_cfg.get("right_across_traffic", 45))
    elif delta < left_min:
        return float(turn_penalty_cfg.get("left_merge", 15))
    else:
        return float(turn_penalty_cfg.get("unknown", 10))


def _bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute initial bearing (degrees, 0=North, clockwise) between two WGS-84 points."""
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlon_r = math.radians(lon2 - lon1)
    x = math.sin(dlon_r) * math.cos(lat2_r)
    y = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon_r)
    return (math.degrees(math.atan2(x, y)) + 360) % 360
