import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoadSegment, SimulationMetrics } from '../types';
import { TrafficMap } from './TrafficMap';
import { apiService, BackendStatus, SimulationSummary } from './apiService';

interface SimulationEngineProps {
  roads: RoadSegment[];
  onSelectRoad: (road: RoadSegment) => void;
  onViewBeforeAfter: () => void;
}

const processingStages = [
  { step: 1, label: 'Analyzing Traffic Network & O-D Demand Matrix', duration: 700 },
  { step: 2, label: 'Predicting Congestion Bottlenecks (06:30 - 08:00)', duration: 800 },
  { step: 3, label: 'Evaluating Multi-Corridor Route Equilibrium', duration: 800 },
  { step: 4, label: 'Optimizing Staggered School Bus Departure Windows', duration: 700 },
  { step: 5, label: 'Simulation Complete - Optimal Equilibrium Found', duration: 500 },
];

export const SimulationEngine: React.FC<SimulationEngineProps> = ({
  roads,
  onSelectRoad,
  onViewBeforeAfter,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [liveSummary, setLiveSummary] = useState<SimulationSummary | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(-1);
  const [isSimulationDone, setIsSimulationDone] = useState(false);
  const [isOptimizedActive, setIsOptimizedActive] = useState(true);

  const timeSteps = ['06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00'];
  const [selectedTimeIdx, setSelectedTimeIdx] = useState(4);
  const [isPlayingTime, setIsPlayingTime] = useState(false);

  const [vehicleVolumePct, setVehicleVolumePct] = useState(80);
  const [schoolBusesCount, setSchoolBusesCount] = useState(50);
  const [freightShiftActive, setFreightShiftActive] = useState(true);

  // Check backend status on mount
  useEffect(() => {
    apiService.getStatus().then((status) => {
      if (status) setBackendStatus(status);
    });
    apiService.getSummary().then((summary) => {
      if (summary) setLiveSummary(summary);
    });
  }, []);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setIsSimulationDone(false);
    setCurrentStageIdx(0);

    // Call live FastAPI backend if available
    try {
      await apiService.triggerSimulationRun(100, 50);
    } catch (e) {
      console.warn('Backend simulation trigger skipped (running frontend demo mode)');
    }
  };

  useEffect(() => {
    if (!isRunning || currentStageIdx < 0) return;
    if (currentStageIdx < processingStages.length) {
      const timer = setTimeout(() => {
        if (currentStageIdx === processingStages.length - 1) {
          setIsRunning(false);
          setIsSimulationDone(true);
          setIsOptimizedActive(true);
        } else {
          setCurrentStageIdx((prev) => prev + 1);
        }
      }, processingStages[currentStageIdx].duration);
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStageIdx]);

  useEffect(() => {
    if (!isPlayingTime) return;
    const interval = setInterval(() => {
      setSelectedTimeIdx((prev) => (prev + 1) % timeSteps.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPlayingTime]);

  const activeTime = timeSteps[selectedTimeIdx];

  // If live backend data is available and simulation is done, prefer it for travel time display
  const liveAvgSpeedKmh = liveSummary
    ? Math.round(3600 / Math.max(liveSummary.overall_mean_travel_time_s, 1) * 0.5)
    : null;

  const currentMetrics: SimulationMetrics = isOptimizedActive
    ? {
        congestionPct: selectedTimeIdx === 4 ? 74 : selectedTimeIdx >= 3 ? 68 : 45,
        busDelayMin: selectedTimeIdx === 4 ? 7 : 4,
        averageSpeedKmh: isSimulationDone && liveAvgSpeedKmh ? liveAvgSpeedKmh : (selectedTimeIdx === 4 ? 19 : 28),
        bottlenecksCount: 1,
        totalNetworkVehicles: liveSummary ? liveSummary.n_agents_total : Math.round(8420 * (vehicleVolumePct / 80)),
        avoidedDelayCommuterHours: 4820,
      }
    : {
        congestionPct: selectedTimeIdx === 4 ? 91 : selectedTimeIdx >= 3 ? 84 : 58,
        busDelayMin: selectedTimeIdx === 4 ? 15 : 9,
        averageSpeedKmh: selectedTimeIdx === 4 ? 13 : 21,
        bottlenecksCount: 7,
        totalNetworkVehicles: liveSummary ? liveSummary.n_agents_total : Math.round(8420 * (vehicleVolumePct / 80)),
        avoidedDelayCommuterHours: 0,
      };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* Simulation Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(13,148,136,0.12)',
                color: '#0d9488',
                border: '1px solid rgba(13,148,136,0.3)',
              }}
            >
              FLOWOPT SIMULATION ENGINE
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Scenario: Morning School Traffic (06:30 to 08:00)
            </span>
            {/* Live backend status indicator */}
            {backendStatus && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: backendStatus.graph_loaded ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                  color: backendStatus.graph_loaded ? '#16a34a' : '#64748b',
                  border: `1px solid ${backendStatus.graph_loaded ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.3)'}`,
                }}
              >
                {backendStatus.graph_loaded
                  ? `Backend Live (${backendStatus.num_nodes.toLocaleString()} nodes)`
                  : 'Demo Mode'}
              </span>
            )}
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '26px',
              fontWeight: 700,
              color: '#0f172a',
              marginTop: '6px',
            }}
          >
            Network Equilibrium Simulation
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '999px',
              background: 'rgba(241,245,249,0.8)',
              border: '1px solid rgba(226,232,240,0.8)',
            }}
          >
            <button
              onClick={() => setIsOptimizedActive(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: !isOptimizedActive ? 700 : 500,
                color: !isOptimizedActive ? '#ffffff' : '#64748b',
                background: !isOptimizedActive ? 'rgba(239,68,68,0.75)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Current (Unoptimized)
            </button>
            <button
              onClick={() => setIsOptimizedActive(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: isOptimizedActive ? 700 : 500,
                color: isOptimizedActive ? '#ffffff' : '#64748b',
                background: isOptimizedActive ? '#0d9488' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              FLOWOPT Equilibrium
            </button>
          </div>

          <motion.button
            onClick={handleRunSimulation}
            disabled={isRunning}
            whileHover={{ scale: isRunning ? 1 : 1.04 }}
            whileTap={{ scale: isRunning ? 1 : 0.96 }}
            style={{
              padding: '10px 24px',
              borderRadius: '999px',
              background: isRunning
                ? 'rgba(148,163,184,0.3)'
                : 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(13,148,136,0.25)',
            }}
          >
            {isRunning ? (
              <span>Optimizing Network...</span>
            ) : (
              <span>Run Simulation</span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Processing Banner */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '18px 24px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(13,148,136,0.3)',
              backdropFilter: 'blur(16px)',
              marginBottom: '20px',
              boxShadow: '0 8px 32px rgba(13,148,136,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#0d9488', fontWeight: 700, fontSize: '13.5px' }}>
                  FLOWOPT Distributed Optimizer Active
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#0d9488', fontWeight: 700 }}>
                Step {currentStageIdx + 1} of {processingStages.length}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {processingStages.map((stage, idx) => {
                const isPast = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div
                    key={stage.step}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isCurrent
                        ? 'rgba(13,148,136,0.12)'
                        : isPast
                        ? 'rgba(13,148,136,0.06)'
                        : 'rgba(241,245,249,0.6)',
                      border: isCurrent
                        ? '1px solid #0d9488'
                        : isPast
                        ? '1px solid rgba(13,148,136,0.25)'
                        : '1px solid rgba(226,232,240,0.8)',
                      fontSize: '11px',
                      color: isCurrent ? '#0d9488' : isPast ? '#0f766e' : '#94a3b8',
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    <div>{isPast ? 'Done' : `${stage.step}.`}</div>
                    <div style={{ marginTop: '2px', lineHeight: 1.2 }}>{stage.label.split(' ')[0]} {stage.label.split(' ')[1]}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left: Map + Time Scrubber */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ height: '480px' }}>
            <TrafficMap
              roads={roads}
              selectedRoadId={null}
              onSelectRoad={onSelectRoad}
              isOptimizedView={isOptimizedActive}
              activeTime={activeTime}
            />
          </div>

          {/* Time Scrubber */}
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(226,232,240,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
            }}
          >
            <button
              onClick={() => setIsPlayingTime(!isPlayingTime)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                background: isPlayingTime ? '#ef4444' : '#0d9488',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {isPlayingTime ? 'II' : 'P'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {timeSteps.map((time, idx) => {
                const isSelected = selectedTimeIdx === idx;
                const isPeak = time === '07:30';
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTimeIdx(idx)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: isSelected
                        ? isOptimizedActive
                          ? 'rgba(13,148,136,0.15)'
                          : 'rgba(239,68,68,0.15)'
                        : 'rgba(241,245,249,0.8)',
                      border: isSelected
                        ? `1px solid ${isOptimizedActive ? '#0d9488' : '#ef4444'}`
                        : '1px solid rgba(226,232,240,0.8)',
                      color: isSelected ? (isOptimizedActive ? '#0d9488' : '#ef4444') : '#64748b',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div>{time}</div>
                    {isPeak && (
                      <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 800 }}>PEAK</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Telemetry + Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Metrics Card */}
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.88)',
              border: `1px solid ${isOptimizedActive ? 'rgba(13,148,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
              boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isOptimizedActive ? '#0d9488' : '#ef4444',
                  textTransform: 'uppercase',
                }}
              >
                {isOptimizedActive ? 'EQUILIBRIUM TELEMETRY' : 'UNCOORDINATED TELEMETRY'}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{activeTime} Peak</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Network Congestion</span>
                  <strong style={{ color: isOptimizedActive ? '#0d9488' : '#ef4444' }}>
                    {currentMetrics.congestionPct}%
                  </strong>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(226,232,240,0.8)', marginTop: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${currentMetrics.congestionPct}%`,
                      height: '100%',
                      background: isOptimizedActive ? '#0d9488' : '#ef4444',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(241,245,249,0.8)' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>BUS DELAY</span>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: isOptimizedActive ? '#0d9488' : '#ef4444' }}>
                    {currentMetrics.busDelayMin} min
                  </p>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(241,245,249,0.8)' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>AVG SPEED</span>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {currentMetrics.averageSpeedKmh} km/h
                  </p>
                </div>
              </div>

              <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(241,245,249,0.8)' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>CRITICAL BOTTLENECKS</span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: isOptimizedActive ? '#0d9488' : '#ef4444' }}>
                  {currentMetrics.bottlenecksCount} corridor {isOptimizedActive ? '(Sub-critical)' : '(Gridlock)'}
                </p>
              </div>
            </div>
          </div>

          {/* Scenario Inputs */}
          <div
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(226,232,240,0.8)',
              boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
              Scenario Inputs
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569' }}>
                  <span>Vehicle Volume:</span>
                  <strong style={{ color: '#0f172a' }}>{vehicleVolumePct}%</strong>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={vehicleVolumePct}
                  onChange={(e) => setVehicleVolumePct(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', accentColor: '#0d9488' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569' }}>
                  <span>School Fleet:</span>
                  <strong style={{ color: '#d97706' }}>{schoolBusesCount} Buses</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={schoolBusesCount}
                  onChange={(e) => setSchoolBusesCount(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', accentColor: '#d97706' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#475569' }}>Freight Peak Shift</span>
                <button
                  onClick={() => setFreightShiftActive(!freightShiftActive)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    background: freightShiftActive ? 'rgba(13,148,136,0.12)' : 'rgba(241,245,249,0.8)',
                    color: freightShiftActive ? '#0d9488' : '#94a3b8',
                    border: freightShiftActive ? '1px solid rgba(13,148,136,0.3)' : '1px solid rgba(226,232,240,0.8)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {freightShiftActive ? 'Active (48 Shifted)' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* Jump to Before/After */}
          <button
            onClick={onViewBeforeAfter}
            style={{
              padding: '12px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(13,148,136,0.25)',
            }}
          >
            <span>Inspect Full Before vs After Report</span>
            <span>-&gt;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
