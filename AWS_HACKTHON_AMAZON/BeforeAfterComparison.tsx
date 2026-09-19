import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BEFORE_AFTER_DATA } from '../mockData';

interface BeforeAfterComparisonProps {
  onApplyOptimization: () => void;
  onBackToSimulation: () => void;
  onBackToDashboard: () => void;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  onApplyOptimization,
  onBackToSimulation,
  onBackToDashboard,
}) => {
  const [isApplied, setIsApplied] = useState(false);

  const handleApply = () => {
    setIsApplied(true);
    setTimeout(() => {
      onApplyOptimization();
    }, 1800);
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={onBackToSimulation}
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
          <span>Back to Simulation</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'rgba(13,148,136,0.12)',
              color: '#0d9488',
              border: '1px solid rgba(13,148,136,0.25)',
            }}
          >
            NETWORK EQUILIBRIUM IMPACT REPORT
          </span>
        </div>
      </div>

      {/* Main Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '28px 32px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(13,148,136,0.2)',
          boxShadow: '0 12px 50px rgba(15,23,42,0.08)',
          marginBottom: '32px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(13,148,136,0.12)',
            color: '#0d9488',
            border: '1px solid rgba(13,148,136,0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Proven Network Transformation
        </span>

        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '34px',
            fontWeight: 700,
            color: '#0f172a',
            marginTop: '14px',
            letterSpacing: '-0.02em',
          }}
        >
          4,820 Commuter Hours Saved Daily
        </h1>

        <p style={{ fontSize: '15px', color: '#475569', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
          By coordinating 50 school buses, shifting 48 freight dispatches, and implementing multi-corridor equilibrium, FLOWOPT eliminates the Varthur morning gridlock.
        </p>

        {/* 4 Highlight Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '28px',
          }}
        >
          {[
            { label: 'CONGESTION REDUCTION', value: '-17%', sub: '91% down to 74%' },
            { label: 'BUS DELAY REDUCTION', value: '-53%', sub: '15 min down to 7 min' },
            { label: 'AVERAGE SPEED GAIN', value: '+46%', sub: '13 km/h up to 19 km/h' },
            { label: 'BOTTLENECKS ELIMINATED', value: '6 of 7', sub: 'Corridors restored' },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                padding: '18px',
                borderRadius: '16px',
                background: 'rgba(248,250,252,0.9)',
                border: '1px solid rgba(226,232,240,0.8)',
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                {m.label}
              </span>
              <p style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>
                {m.value}
              </p>
              <p style={{ fontSize: '11.5px', color: '#64748b' }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Side-by-Side Detailed Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        {/* Current State */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(254,242,242,0.9)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#ef4444', display: 'inline-block' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Current (Unoptimized)</h2>
            </div>
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>Independent Shortest Paths</span>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginTop: '8px', lineHeight: 1.45 }}>
            Every driver and school bus navigates individually via standard GPS navigation apps, funnelling 38 buses onto Varthur Main simultaneously.
          </p>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Varthur Congestion Rate</span>
              <strong style={{ color: '#ef4444', fontSize: '15px' }}>{BEFORE_AFTER_DATA.current.congestionPct}% (Critical)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Average Bus Delay</span>
              <strong style={{ color: '#ef4444', fontSize: '15px' }}>{BEFORE_AFTER_DATA.current.busDelayMin} minutes late</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Corridor Throughput Speed</span>
              <strong style={{ color: '#ef4444', fontSize: '15px' }}>{BEFORE_AFTER_DATA.current.averageSpeedKmh} km/h</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Total Delay Waste</span>
              <strong style={{ color: '#ef4444', fontSize: '15px' }}>8,200 commuter-hours</strong>
            </div>
          </div>
        </motion.div>

        {/* FLOWOPT Optimized */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(240,253,250,0.9)',
            border: '1px solid rgba(13,148,136,0.25)',
            boxShadow: '0 8px 30px rgba(13,148,136,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#0d9488', display: 'inline-block' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>FLOWOPT Optimized</h2>
            </div>
            <span style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>Multi-Commodity Equilibrium</span>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginTop: '8px', lineHeight: 1.45 }}>
            18 buses shifted to Sarjapur bypass, 14-minute staggered dispatch window, and 48 freight trucks shifted outside the school rush hour.
          </p>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Varthur Congestion Rate</span>
              <strong style={{ color: '#0d9488', fontSize: '15px' }}>{BEFORE_AFTER_DATA.optimized.congestionPct}% (Free Flow)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Average Bus Delay</span>
              <strong style={{ color: '#0d9488', fontSize: '15px' }}>{BEFORE_AFTER_DATA.optimized.busDelayMin} minutes (On-Time)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Corridor Throughput Speed</span>
              <strong style={{ color: '#0d9488', fontSize: '15px' }}>{BEFORE_AFTER_DATA.optimized.averageSpeedKmh} km/h (+46%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px' }}>
              <span style={{ color: '#475569', fontSize: '13px' }}>Total Delay Saved</span>
              <strong style={{ color: '#0d9488', fontSize: '15px' }}>4,820 hours saved / day</strong>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTAs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            padding: '12px 24px',
            borderRadius: '999px',
            background: 'rgba(241,245,249,0.9)',
            border: '1px solid rgba(226,232,240,0.8)',
            color: '#475569',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Return to Traffic Command Center
        </button>

        <motion.button
          onClick={handleApply}
          disabled={isApplied}
          whileHover={{ scale: isApplied ? 1 : 1.04 }}
          whileTap={{ scale: isApplied ? 1 : 0.96 }}
          style={{
            padding: '14px 34px',
            borderRadius: '999px',
            background: isApplied
              ? '#0d9488'
              : 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: isApplied ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 24px rgba(13,148,136,0.3)',
          }}
        >
          {isApplied ? (
            <span>Plan Dispatched to BTP &amp; Fleet Operators!</span>
          ) : (
            <>
              <span>Apply &amp; Dispatch Optimization Plan</span>
              <span>-&gt;</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};
export default BeforeAfterComparison;
