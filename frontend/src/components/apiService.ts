/**
 * AWS_HACKTHON_AMAZON/apiService.ts
 * =================================
 * Frontend API client connecting the React/Next.js dashboard to the FastAPI backend.
 * Base URL defaults to http://localhost:8000 (configurable via VITE_API_BASE_URL or NEXT_PUBLIC_API_URL).
 */

const API_BASE_URL =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_API_URL || process.env?.VITE_API_BASE_URL)) ||
  'http://localhost:8000';

export interface BackendStatus {
  service: string;
  status: string;
  city: string;
  country: string;
  graph_loaded: boolean;
  num_nodes: number;
  num_edges: number;
  agent_matrix_loaded: boolean;
  num_agents: number;
  active_jobs: number;
}

export interface SimulationSummary {
  city: string;
  n_agents_total: number;
  n_agents_routed: number;
  overall_mean_travel_time_s: number;
  overall_mean_delay_s: number;
  overall_mean_detour_ratio: number;
  per_vehicle_class: Record<
    string,
    {
      count: number;
      mean_travel_time_s: number;
      mean_delay_s: number;
      mean_detour_ratio: number;
    }
  >;
}

export interface EdgeLoadFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
  properties: {
    u: number;
    v: number;
    highway: string;
    lanes: number;
    capacity_pce_hr: number;
    vehicle_count: number;
    flow_pce: number;
    vc_ratio: number;
    congestion_level: 'free' | 'moderate' | 'congested' | 'severe';
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: EdgeLoadFeature[];
}

export const apiService = {
  /**
   * Health-check and current simulation engine metadata
   */
  async getStatus(): Promise<BackendStatus | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/status:', err);
      return null;
    }
  },

  /**
   * Get simulation summary statistics
   */
  async getSummary(): Promise<SimulationSummary | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/results/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/results/summary:', err);
      return null;
    }
  },

  /**
   * Get edge loads and V/C ratios as GeoJSON
   */
  async getEdgeLoads(): Promise<GeoJsonFeatureCollection | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/network/loads`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/network/loads:', err);
      return null;
    }
  },

  /**
   * Trigger an asynchronous ACO simulation run
   */
  async triggerSimulationRun(iterations?: number, colonySize?: number): Promise<{ job_id: string; status: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/simulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterations, colony_size: colonySize }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/simulation/run:', err);
      return null;
    }
  },

  /**
   * Connect to real-time Server-Sent Events stream of agent routes
   */
  connectAgentStream(
    onMessage: (chunk: any[]) => void,
    onError?: (err: any) => void
  ): () => void {
    try {
      const eventSource = new EventSource(`${API_BASE_URL}/api/v1/agents/stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (parseErr) {
          console.error('Error parsing SSE data:', parseErr);
        }
      };
      eventSource.onerror = (err) => {
        if (onError) onError(err);
        eventSource.close();
      };
      return () => eventSource.close();
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Poll simulation status by job ID
   */
  async pollSimulationStatus(jobId: string): Promise<{ job_id: string; status: string; summary?: any; error?: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/simulation/status/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/simulation/status:', err);
      return null;
    }
  },

  /**
   * Get paginated route results
   */
  async getRoutes(page: number = 1, page_size: number = 50, vehicleClass?: string): Promise<any | null> {
    try {
      let url = `${API_BASE_URL}/api/v1/results/routes?page=${page}&page_size=${page_size}`;
      if (vehicleClass) url += `&vehicle_class=${vehicleClass}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/results/routes:', err);
      return null;
    }
  },

  /**
   * Get the road network graph
   */
  async getNetworkGraph(max_nodes: number = 2000): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/network/graph?max_nodes=${max_nodes}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/network/graph:', err);
      return null;
    }
  },

  /**
   * Get pheromone snapshot
   */
  async getPheromones(top_n: number = 200): Promise<GeoJsonFeatureCollection | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/network/pheromones?top_n=${top_n}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('FastAPI backend not reachable at /api/v1/network/pheromones:', err);
      return null;
    }
  }
};
