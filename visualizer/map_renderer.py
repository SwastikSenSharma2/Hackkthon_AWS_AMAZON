"""
visualizer/map_renderer.py
============================
Renders the simulation results as an interactive Folium HTML map.

Layers:
  1. Road network edges — coloured by V/C ratio (green → yellow → red)
  2. Pheromone trails  — thickness proportional to tau_pos value
  3. Transit routes    — bold blue polylines
  4. Agent paths       — coloured by vehicle class
  5. Intersection markers — Alankar, Jehangir, RTO Chowk with congestion data

Output:
  output/pune_pheromone_map.html   — self-contained interactive HTML file

Usage:
  python visualizer/map_renderer.py --config config/pune_config.yaml
"""

from __future__ import annotations

import json
import logging
import pickle
import sys
from pathlib import Path

import yaml

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)

# Vehicle class → display colour mapping
_CLASS_COLOURS: dict[str, str] = {
    "transit_bus":     "#1565C0",   # deep blue
    "school_bus":      "#F9A825",   # amber
    "car_pool":        "#2E7D32",   # dark green
    "car_single":      "#B71C1C",   # deep red
    "motorbike":       "#6A1B9A",   # purple
    "truck_freight":   "#4E342E",   # brown
    "truck_essential": "#00695C",   # teal
}

# VC-ratio colour ramp: low → high
def _vc_colour(vc_ratio: float) -> str:
    """Return a hex colour on a green→yellow→red gradient for a V/C ratio."""
    vc_ratio = max(0.0, min(vc_ratio, 1.5))
    if vc_ratio < 0.5:
        # Green
        return "#00C853"
    elif vc_ratio < 0.7:
        # Yellow-green
        g = int(200 - (vc_ratio - 0.5) / 0.2 * 100)
        return f"#C8{g:02X}00"
    elif vc_ratio < 1.0:
        # Orange → red
        r = int(200 + (vc_ratio - 0.7) / 0.3 * 55)
        return f"#{r:02X}3200"
    else:
        # Saturated red (gridlock)
        return "#B71C1C"


class MapRenderer:
    """
    Builds a Folium HTML map layered with pheromone trails, traffic loads,
    and agent routes.
    """

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.root = Path(__file__).resolve().parent.parent
        self.out_dir = self.root / cfg["output"]["results_dir"]
        self.out_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    def _load_graph(self):
        graph_path = self.root / self.cfg["output"]["graph_pkl"]
        if not graph_path.exists():
            sys.exit(f"Graph not found: {graph_path}")
        with open(graph_path, "rb") as fh:
            return pickle.load(fh)

    def _load_routes(self) -> list[dict]:
        routes_path = self.out_dir / "routes.json"
        if not routes_path.exists():
            log.warning("routes.json not found — map will show network only.")
            return []
        with open(routes_path) as fh:
            return json.load(fh)

    def _load_edge_loads(self) -> dict[tuple, float]:
        """Load aggregated edge loads (sum PCE across all time-steps)."""
        import csv
        loads: dict[tuple, float] = {}
        edge_path = self.out_dir / "edge_loads.csv"
        if not edge_path.exists():
            return loads
        with open(edge_path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                key = (int(row["u"]), int(row["v"]))
                loads[key] = loads.get(key, 0.0) + float(row["pce_load"])
        return loads

    # ------------------------------------------------------------------
    def render(self) -> Path:
        try:
            import folium
            from folium.plugins import HeatMap
        except ImportError:
            sys.exit("folium not installed. Run: pip install folium")

        G = self._load_graph()
        routes = self._load_routes()
        edge_loads = self._load_edge_loads()

        # Centre map on Pune
        lats = [G.nodes[n]["lat"] for n in G.nodes() if G.nodes[n].get("lat", 0)]
        lons = [G.nodes[n]["lon"] for n in G.nodes() if G.nodes[n].get("lon", 0)]
        center = [sum(lats) / max(len(lats), 1), sum(lons) / max(len(lons), 1)]

        m = folium.Map(
            location=center,
            zoom_start=14,
            tiles="CartoDB dark_matter",
        )

        # ---- Layer 1: Road network (V/C coloured) --------------------
        road_layer = folium.FeatureGroup(name="Road Network (V/C ratio)", show=True)
        for u, v, data in G.edges(data=True):
            u_lat = G.nodes[u].get("lat", 0)
            u_lon = G.nodes[u].get("lon", 0)
            v_lat = G.nodes[v].get("lat", 0)
            v_lon = G.nodes[v].get("lon", 0)
            if u_lat == 0 or v_lat == 0:
                continue

            load = edge_loads.get((u, v), 0.0)
            cap = data.get("capacity_pce_hr", 600)
            vc = load / max(cap, 1)
            colour = _vc_colour(vc)

            folium.PolyLine(
                locations=[[u_lat, u_lon], [v_lat, v_lon]],
                color=colour,
                weight=1.5,
                opacity=0.6,
                tooltip=f"V/C={vc:.2f}  load={load:.1f} PCE  cap={cap:.0f}",
            ).add_to(road_layer)
        road_layer.add_to(m)

        # ---- Layer 2: Agent routes (by vehicle class) ----------------
        route_layer = folium.FeatureGroup(name="Agent Routes", show=False)
        for r in routes[:300]:  # cap at 300 for browser performance
            path = r.get("path", [])
            vc = r.get("vehicle_class", "car_single")
            colour = _CLASS_COLOURS.get(vc, "#9E9E9E")
            coords = []
            for n in path:
                if n in G.nodes:
                    coords.append([G.nodes[n]["lat"], G.nodes[n]["lon"]])
            if len(coords) < 2:
                continue
            folium.PolyLine(
                locations=coords,
                color=colour,
                weight=2,
                opacity=0.7,
                tooltip=(
                    f"{r.get('agent_id')} | {vc} | "
                    f"{r.get('total_cost_s', 0)/60:.1f} min"
                ),
            ).add_to(route_layer)
        route_layer.add_to(m)

        # ---- Layer 3: Transit routes (thick blue) --------------------
        transit_layer = folium.FeatureGroup(name="Transit Routes", show=True)
        for r in routes:
            if not r.get("vehicle_class", "").startswith("transit"):
                continue
            path = r.get("path", [])
            coords = [
                [G.nodes[n]["lat"], G.nodes[n]["lon"]]
                for n in path if n in G.nodes
            ]
            if len(coords) < 2:
                continue
            folium.PolyLine(
                locations=coords,
                color="#1565C0",
                weight=4,
                opacity=0.85,
                tooltip=f"Transit: {r.get('agent_id')}",
            ).add_to(transit_layer)
        transit_layer.add_to(m)

        # ---- Layer 4: Known intersection markers ---------------------
        intersection_map_path = (
            self.root / self.cfg["data"]["intersection_nodes"]
        )
        if intersection_map_path.exists():
            with open(intersection_map_path) as fh:
                imap = json.load(fh)
            marker_layer = folium.FeatureGroup(name="CCTV Intersections", show=True)
            for name, node_id in imap.items():
                if node_id in G.nodes:
                    lat = G.nodes[node_id]["lat"]
                    lon = G.nodes[node_id]["lon"]
                    folium.CircleMarker(
                        location=[lat, lon],
                        radius=10,
                        color="#FFD700",
                        fill=True,
                        fill_color="#FFD700",
                        fill_opacity=0.9,
                        tooltip=name,
                        popup=folium.Popup(
                            f"<b>{name}</b><br>Node ID: {node_id}", max_width=250
                        ),
                    ).add_to(marker_layer)
            marker_layer.add_to(m)

        # ---- Legend --------------------------------------------------
        legend_html = """
        <div style="
            position: fixed; bottom: 30px; left: 30px; z-index: 1000;
            background: rgba(20,20,30,0.92); border-radius: 8px;
            padding: 14px 18px; color: #fff; font-family: Arial, sans-serif;
            font-size: 13px; box-shadow: 0 2px 12px rgba(0,0,0,0.5);">
          <b>ACO Traffic Routing — Pune</b><br><br>
          <span style="color:#00C853">&#9644;</span> V/C &lt; 0.5 (free flow)<br>
          <span style="color:#C8A000">&#9644;</span> V/C 0.5–0.7 (mild)<br>
          <span style="color:#D03200">&#9644;</span> V/C 0.7–1.0 (congested)<br>
          <span style="color:#B71C1C">&#9644;</span> V/C &gt; 1.0 (gridlock)<br><br>
          <span style="color:#1565C0">&#9644;</span> Transit bus<br>
          <span style="color:#F9A825">&#9644;</span> School bus<br>
          <span style="color:#2E7D32">&#9644;</span> Carpool<br>
          <span style="color:#B71C1C">&#9644;</span> Single-occupancy car<br>
          <span style="color:#4E342E">&#9644;</span> Freight truck<br>
        </div>
        """
        m.get_root().html.add_child(folium.Element(legend_html))

        # Layer control
        folium.LayerControl(collapsed=False).add_to(m)

        # Save
        out_path = self.root / self.cfg["output"]["map_html"]
        m.save(str(out_path))
        log.info("Map saved → %s", out_path)
        return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Render simulation results as Folium map.")
    parser.add_argument("--config", default="config/pune_config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.exists():
        sys.exit(f"Config not found: {cfg_path}")
    with open(cfg_path) as fh:
        cfg = yaml.safe_load(fh)

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    renderer = MapRenderer(cfg)
    out = renderer.render()
    log.info("Open in browser: file://%s", out.resolve())


if __name__ == "__main__":
    main()
