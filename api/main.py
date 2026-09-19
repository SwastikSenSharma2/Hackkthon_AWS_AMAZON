"""
api/main.py
============
FastAPI application exposing simulation data to the Next.js frontend.

Endpoints:

  GET  /api/v1/status
       Health-check and current simulation metadata.

  GET  /api/v1/agents
       Return the full agent matrix (paginated).

  GET  /api/v1/agents/stream
       Server-Sent Events stream — pushes agent route results in real-time
       as the simulation runs.  Chunks are emitted every `stream_chunk_agents`
       agents (config key).

  GET  /api/v1/network/graph
       Return all nodes and edges as a lightweight JSON payload for
       initial map rendering on the frontend.

  GET  /api/v1/network/pheromones
       Return the top-N strongest positive pheromone edges as GeoJSON.

  GET  /api/v1/network/loads
       Return the current edge load (V/C ratios) as a GeoJSON FeatureCollection.

  GET  /api/v1/results/summary
       Return the simulation summary (overall + per-vehicle-class stats).

  GET  /api/v1/results/routes
       Return routes.json content (paginated).

  POST /api/v1/simulation/run
       Trigger a new simulation run asynchronously (returns job_id).

  GET  /api/v1/simulation/status/{job_id}
       Poll the status of a background simulation run.

CORS is configured to allow all origins during development (tighten for prod).

Usage:
  uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Or from the project root:
  python -m uvicorn api.main:app --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import pickle
import sys
import uuid
from collections import defaultdict
from pathlib import Path
from typing import AsyncGenerator, Optional

import yaml
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# Allow import from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ACO Traffic Routing API",
    description=(
        "Ant Colony Optimisation-based urban traffic routing engine "
        "for Pune (generalisable to any city). "
        "Exposes simulation data for Next.js frontend consumption."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to Next.js origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Config & paths (loaded once at startup)
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
_CONFIG_PATH = ROOT / "config" / "pune_config.yaml"

def _load_cfg() -> dict:
    if not _CONFIG_PATH.exists():
        raise RuntimeError(f"Config not found: {_CONFIG_PATH}")
    with open(_CONFIG_PATH) as fh:
        return yaml.safe_load(fh)

# ---------------------------------------------------------------------------
# In-memory state
# ---------------------------------------------------------------------------

_config: dict = {}
_graph = None                     # nx.DiGraph — loaded lazily
_job_registry: dict[str, dict] = {}   # job_id → {status, result_path, error}


@app.on_event("startup")
async def startup_event() -> None:
    global _config
    try:
        _config = _load_cfg()
        log.info("Config loaded. City: %s", _config.get("city", "?"))
    except Exception as e:
        log.error("Failed to load config: %s", e)


def _get_graph():
    global _graph, _config
    if _graph is not None:
        return _graph
    if not _config:
        _config = _load_cfg()
    graph_path = ROOT / _config["output"]["graph_pkl"]
    if not graph_path.exists():
        return None
    with open(graph_path, "rb") as fh:
        _graph = pickle.load(fh)
    log.info("Graph loaded: %d nodes, %d edges", _graph.number_of_nodes(), _graph.number_of_edges())
    return _graph


def _out(filename: str) -> Path:
    return ROOT / _config["output"]["results_dir"] / filename


def _proc(filename: str) -> Path:
    return ROOT / _config["output"]["processed_dir"] / filename


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/status", tags=["Meta"])
async def status():
    """Health-check and simulation metadata."""
    G = _get_graph()
    routes_path = _out("routes.json")
    summary_path = _out("summary.json")
    return {
        "status": "ok",
        "city": _config.get("city", ""),
        "graph_loaded": G is not None,
        "graph_nodes": G.number_of_nodes() if G else 0,
        "graph_edges": G.number_of_edges() if G else 0,
        "routes_available": routes_path.exists(),
        "summary_available": summary_path.exists(),
        "config": {
            "alpha": _config.get("alpha"),
            "beta": _config.get("beta"),
            "rho": _config.get("rho"),
            "colony_size": _config.get("colony_size"),
            "iterations": _config.get("iterations"),
            "n_synthetic_agents": _config.get("n_synthetic_agents"),
        },
    }


# ---------------------------------------------------------------------------

@app.get("/api/v1/agents", tags=["Agents"])
async def get_agents(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    vehicle_class: Optional[str] = Query(None),
):
    """Return the agent matrix (paginated, optionally filtered by vehicle class)."""
    matrix_path = _proc("agent_matrix.json")
    if not matrix_path.exists():
        raise HTTPException(status_code=404, detail="Agent matrix not found. Run the pipeline first.")
    with open(matrix_path) as fh:
        agents: list[dict] = json.load(fh)

    if vehicle_class:
        agents = [a for a in agents if a.get("vehicle_class") == vehicle_class]

    total = len(agents)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "agents": agents[start:end],
    }


# ---------------------------------------------------------------------------

@app.get("/api/v1/agents/stream", tags=["Agents"])
async def stream_agents():
    """
    Server-Sent Events stream of agent route results.
    Reads routes.json and streams in configurable chunks.
    The Next.js frontend can consume this with EventSource.
    """
    routes_path = _out("routes.json")
    if not routes_path.exists():
        raise HTTPException(
            status_code=404,
            detail="routes.json not found. Run the simulation first.",
        )

    chunk_size: int = _config.get("stream_chunk_agents", 50)

    async def event_generator() -> AsyncGenerator[str, None]:
        with open(routes_path) as fh:
            routes: list[dict] = json.load(fh)
        for i in range(0, len(routes), chunk_size):
            chunk = routes[i : i + chunk_size]
            payload = json.dumps({"chunk_index": i // chunk_size, "agents": chunk})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.05)   # throttle to avoid overwhelming the client
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------

@app.get("/api/v1/network/graph", tags=["Network"])
async def get_network_graph(
    max_nodes: int = Query(2000, ge=100, le=10000),
):
    """
    Return a lightweight graph representation for frontend map initialisation.
    Nodes include lat/lon; edges include highway type and length.
    Downsampled to `max_nodes` for browser performance.
    """
    G = _get_graph()
    if G is None:
        raise HTTPException(status_code=404, detail="Graph not loaded. Run pipeline/1_graph_builder.py first.")

    # Sample nodes if graph is very large
    all_nodes = list(G.nodes())
    if len(all_nodes) > max_nodes:
        import random
        rng = random.Random(42)
        sampled_nodes = set(rng.sample(all_nodes, max_nodes))
    else:
        sampled_nodes = set(all_nodes)

    nodes_out = []
    for n in sampled_nodes:
        d = G.nodes[n]
        nodes_out.append({
            "id": int(n),
            "lat": d.get("lat", 0.0),
            "lon": d.get("lon", 0.0),
            "highway": d.get("highway", ""),
        })

    edges_out = []
    for u, v, data in G.edges(data=True):
        if u in sampled_nodes and v in sampled_nodes:
            edges_out.append({
                "u": int(u),
                "v": int(v),
                "length_m": round(data.get("length_m", 0), 1),
                "highway": data.get("highway", ""),
                "capacity_pce_hr": round(data.get("capacity_pce_hr", 0), 0),
            })

    return {"nodes": nodes_out, "edges": edges_out,
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges()}


# ---------------------------------------------------------------------------

@app.get("/api/v1/network/pheromones", tags=["Network"])
async def get_pheromones(top_n: int = Query(200, ge=10, le=2000)):
    """
    Return the top-N strongest pheromone edges as a GeoJSON FeatureCollection.
    Suitable for rendering as a heatmap overlay on the Next.js Mapbox/Leaflet map.
    """
    pheromone_path = _out("pheromone_snapshot.json")
    if not pheromone_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Pheromone snapshot not found. Run the simulation first.",
        )
    with open(pheromone_path) as fh:
        data = json.load(fh)
    # Return top_n edges
    features = data.get("features", [])[:top_n]
    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------

@app.get("/api/v1/network/loads", tags=["Network"])
async def get_edge_loads():
    """
    Return aggregated edge PCE loads as a GeoJSON FeatureCollection.
    Each edge feature includes the V/C ratio for colour mapping.
    """
    G = _get_graph()
    if G is None:
        raise HTTPException(status_code=404, detail="Graph not available.")

    edge_csv = _out("edge_loads.csv")
    if not edge_csv.exists():
        raise HTTPException(status_code=404, detail="edge_loads.csv not found. Run simulation first.")

    import csv
    loads: dict[tuple, float] = defaultdict(float)
    with open(edge_csv, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            loads[(int(row["u"]), int(row["v"]))] += float(row["pce_load"])

    features = []
    for (u, v), load in loads.items():
        if u not in G or v not in G:
            continue
        cap = G[u][v].get("capacity_pce_hr", 600) if G.has_edge(u, v) else 600
        vc_ratio = load / max(cap, 1)
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [G.nodes[u]["lon"], G.nodes[u]["lat"]],
                    [G.nodes[v]["lon"], G.nodes[v]["lat"]],
                ],
            },
            "properties": {
                "u": int(u), "v": int(v),
                "pce_load": round(load, 2),
                "capacity_pce_hr": round(cap, 0),
                "vc_ratio": round(vc_ratio, 3),
            },
        })

    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------

@app.get("/api/v1/results/summary", tags=["Results"])
async def get_summary():
    """Return the simulation summary statistics."""
    summary_path = _out("summary.json")
    if not summary_path.exists():
        raise HTTPException(status_code=404, detail="summary.json not found.")
    with open(summary_path) as fh:
        return json.load(fh)


@app.get("/api/v1/results/routes", tags=["Results"])
async def get_routes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    vehicle_class: Optional[str] = Query(None),
    success_only: bool = Query(False),
):
    """Return agent routes (paginated, filterable)."""
    routes_path = _out("routes.json")
    if not routes_path.exists():
        raise HTTPException(status_code=404, detail="routes.json not found.")
    with open(routes_path) as fh:
        routes: list[dict] = json.load(fh)
    if vehicle_class:
        routes = [r for r in routes if r.get("vehicle_class") == vehicle_class]
    if success_only:
        routes = [r for r in routes if r.get("success", False)]
    total = len(routes)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size,
            "routes": routes[start : start + page_size]}


# ---------------------------------------------------------------------------
# Background simulation trigger
# ---------------------------------------------------------------------------

def _run_simulation_sync(job_id: str, cfg_override: dict) -> None:
    """
    Run the simulation synchronously in a background thread.
    Updates the job registry with status and output path.
    """
    try:
        _job_registry[job_id]["status"] = "running"
        from simulation.runner import SimulationRunner
        cfg = _load_cfg()
        cfg.update(cfg_override)
        runner = SimulationRunner(cfg=cfg, show_progress=False)
        summary = runner.run()
        _job_registry[job_id]["status"] = "complete"
        _job_registry[job_id]["summary"] = summary
    except Exception as exc:
        _job_registry[job_id]["status"] = "error"
        _job_registry[job_id]["error"] = str(exc)
        log.error("Simulation job %s failed: %s", job_id, exc)


@app.post("/api/v1/simulation/run", tags=["Simulation"])
async def trigger_simulation(
    background_tasks: BackgroundTasks,
    agents: Optional[int] = Query(None, description="Override n_synthetic_agents"),
    iterations: Optional[int] = Query(None, description="Override ACO iterations"),
):
    """
    Trigger a new simulation run in the background.
    Returns a job_id to poll with /api/v1/simulation/status/{job_id}.
    """
    job_id = str(uuid.uuid4())[:8]
    cfg_override: dict = {}
    if agents is not None:
        cfg_override["n_synthetic_agents"] = agents
    if iterations is not None:
        cfg_override["iterations"] = iterations

    _job_registry[job_id] = {"status": "queued", "summary": None, "error": None}
    background_tasks.add_task(_run_simulation_sync, job_id, cfg_override)
    log.info("Simulation job %s queued.", job_id)
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/v1/simulation/status/{job_id}", tags=["Simulation"])
async def simulation_status(job_id: str):
    """Poll the status of a background simulation job."""
    job = _job_registry.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return {"job_id": job_id, **job}
