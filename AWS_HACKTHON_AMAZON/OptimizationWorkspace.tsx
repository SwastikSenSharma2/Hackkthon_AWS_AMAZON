import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface OptimizationWorkspaceProps {
  onGeneratePlan: () => void;
  onBackToDashboard: () => void;
}

export const OptimizationWorkspace: React.FC<OptimizationWorkspaceProps> = ({
  onGeneratePlan,
  onBackToDashboard,
}) => {
  const [maxBusDelay, setMaxBusDelay] = useState(10);
  const [maxDetourPct, setMaxDetourPct] = useState(15);
  const [schoolTargetArrival] = useState('07:00');
  const [freightShiftWindow] = useState('11:00 - 16:00');

  const [priorities] = useState({
    emergency: 'Critical (Priority 1)',
    schoolBuses: 'High (Priority 2)',
    publicTransport: 'High (Priority 2)',
    carpools: 'Medium (Priority 3)',
    freight: 'Configurable (Time-Shifted)',
    privateCars: 'Standard (Equilibrium)',
  });

  const priorityColor = (val: string) => {
    if (val.includes('Critical')) return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' };
    if (val.includes('High')) return { bg: 'rgba(13,148,136,0.1)', text: '#0d9488', border: 'rgba(13,148,136,0.2)' };
    return { bg: 'rgba(241,245,249,0.9)', text: '#64748b', border: 'rgba(226,232,240,0.8)' };
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#64748b',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>Back to Overview</span>
        </button>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '999px',
            background: 'rgba(13,148,136,0.12)',
            color: '#0d9488',
            border: '1px solid rgba(13,148,136,0.2)',
          }}
        >
          ALGORITHMIC OPTIMIZATION WORKSPACE
        </span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
          Network Optimization Parameters &amp; Constraints
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Configure multi-modal weights, priority classes, and boundary limits for the FLOWOPT global traffic equilibrium solver.
        </p>
      </div>

      {/* Grid: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Vehicle Priority Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          }}
        >
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Vehicle Category Priority Matrix
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(priorities).map(([key, val]) => {
              const pc = priorityColor(val);
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(248,250,252,0.9)',
                    border: '1px solid rgba(226,232,240,0.8)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#0d9488', display: 'inline-block' }} />
                    <span style={{ fontSize: '13px', color: '#0f172a', textTransform: 'capitalize' }}>
                      {key === 'schoolBuses' ? 'School Buses' : key === 'publicTransport' ? 'Public Transport (BMTC)' : key}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: pc.bg,
                      color: pc.text,
                      border: `1px solid ${pc.border}`,
                    }}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Operational Constraints */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          }}
        >
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Operational Constraints &amp; Hard Bounds
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0f172a' }}>
                <span>Maximum Allowed Bus Delay:</span>
                <strong style={{ color: '#0d9488' }}>{maxBusDelay} min</strong>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={maxBusDelay}
                onChange={(e) => setMaxBusDelay(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: '#0d9488' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0f172a' }}>
                <span>Maximum Route Detour Tolerance:</span>
                <strong style={{ color: '#0d9488' }}>{maxDetourPct}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={maxDetourPct}
                onChange={(e) => setMaxDetourPct(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: '#0d9488' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>School Arrival Deadline</span>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Hard arrival constraint for 50 buses</p>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#d97706' }}>{schoolTargetArrival} AM</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '10px', background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>Freight Shift Off-Peak Window</span>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Non-peak multi-axle carrier corridor</p>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0d9488' }}>{freightShiftWindow}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <motion.button
          onClick={onGeneratePlan}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 34px',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(13,148,136,0.3)',
          }}
        >
          <span>Generate Global Network Optimization</span>
          <span>-&gt;</span>
        </motion.button>
      </div>
    </div>
  );
};
export default OptimizationWorkspace;
