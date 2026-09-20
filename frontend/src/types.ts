export type ViewTab = 
  | 'overview' 
  | 'live-traffic' 
  | 'school-buses' 
  | 'public-transport' 
  | 'freight' 
  | 'optimization' 
  | 'simulation' 
  | 'reports'
  | 'workspace'
  | 'before-after';

export type TrafficStatus = 'low' | 'moderate' | 'high' | 'critical' | 'Normal' | 'Congested' | 'Critical';

export interface VehicleDistribution {
  cars: number;
  twoWheelers?: number;
  publicTransport: number;
  schoolBuses: number;
  freight: number;
  buses?: number;
  commercial?: number;
}

export interface PredictionPoint {
  time: string;
  speed: number;
  congestion: number;
  flow?: number;
  utilization?: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  code: string;
  zone?: string;
  lengthKm: number;
  freeFlowSpeedKmh: number;
  normalSpeed: number;
  speed: number;
  currentSpeedKmh: number;
  flow: number;
  baselineVolume: number;
  optimizedVolume: number;
  capacity: number;
  capacityVehHr: number;
  utilization: number;
  status: any;
  pathData: string;
  centerPoint: { x: number; y: number };
  coordinates?: { x: number; y: number }[];
  schoolBusCount: number;
  freightCount: number;
  publicBusCount: number;
  delayMinutes: number;
  vehicleDistribution: VehicleDistribution;
  prediction: PredictionPoint[];
  bottleneckDescription?: string;
  criticalHour?: string;
  rerouteOptions?: {
    name: string;
    capacityAvailablePct: number;
    delayAddedMin: number;
  }[];
}

export interface SimulationMetrics {
  avgSpeedKmh?: number;
  averageSpeedKmh?: number;
  totalDelayHours?: number;
  bottleneckCongestionPct?: number;
  congestionPct?: number;
  co2EmissionsTons?: number;
  co2EmissionsKg?: number;
  schoolBusesOnTimePct?: number;
  freightDelaysMin?: number;
  busDelayMin?: number;
  bottlenecksCount?: number;
  publicTransitAdherencePct?: number;
  totalNetworkVehicles?: number;
  avoidedDelayCommuterHours?: number;
  iteration?: number;
  convergenceScore?: number;
}

export interface SchoolBus {
  busId: string;
  routeName: string;
  driverName: string;
  studentCount?: number;
  studentsCount: number;
  capacity: number;
  occupancyRate: number;
  status: 'Direct' | 'Rerouted' | 'Retimed' | 'Critical' | 'Optimized';
  currentRoute: string;
  currentDeparture: string;
  currentEta: string;
  recommendedRoute: string;
  recommendedDeparture: string;
  recommendedEta: string;
  delayAvoidedMin: number;
  currentCorridor?: string;
  recommendedCorridor?: string;
}

export interface PublicTransportRoute {
  id: string;
  routeId: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  activeBuses: number;
  delayMin: number;
  avgDelayMin: number;
  headwayMin: number;
  ridershipPerHour: number;
  compliancePct: number;
  crowdLevel: 'Low' | 'Medium' | 'High' | 'Severe';
  priorityActive: boolean;
  status: 'On-Time' | 'Slight Delay' | 'Congested' | 'critical' | 'moderate';
  stopsCount?: number;
  passengerLoadPct?: number;
}

export interface FreightShift {
  id: string;
  truckId: string;
  company: string;
  operator: string;
  corridor: string;
  vehicleType: string;
  tonnage: number;
  count: number;
  currentWindow: string;
  originalWindow: string;
  recommendedWindow: string;
  status: 'Pending' | 'Shifted';
  co2SavedKg: number;
  co2ReductionKg: number;
  routeCorridor: string;
}

export interface OptimizationPillar {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  impact: string;
  category: string;
  what: string;
  why: string;
  details?: string;
  metrics: { label: string; val: string }[];
}
