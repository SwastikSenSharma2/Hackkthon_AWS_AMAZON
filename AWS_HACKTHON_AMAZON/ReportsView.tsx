import React from 'react';
import { motion } from 'framer-motion';

interface ReportsViewProps {
  onBackToDashboard: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToDashboard }) => {
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
          EXECUTIVE MOBILITY AUDIT - BENGALURU EAST
        </span>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
          Network Optimization Analytics &amp; Impact Audit
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Consolidated performance reporting across 142,800 monitored vehicle journeys and 5 key arterial corridors.
        </p>
      </div>

      {/* 4 Large Audit Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            TOTAL MONITORED VEHICLES
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>142,800</p>
          <p style={{ fontSize: '11.5px', color: '#0d9488', marginTop: '2px' }}>Peak morning window analysis</p>
        </div>

        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(240,253,250,0.9)', border: '1px solid rgba(13,148,136,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#0d9488', textTransform: 'uppercase', fontWeight: 600 }}>
            AVOIDED COMMUTER DELAY
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>4,820 hrs</p>
          <p style={{ fontSize: '11.5px', color: '#0f766e', marginTop: '2px' }}>Saved daily across network</p>
        </div>

        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            PUBLIC BUS ON-TIME RATE
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>94.2%</p>
          <p style={{ fontSize: '11.5px', color: '#0d9488', marginTop: '2px' }}>Up from 68.4% without priority</p>
        </div>

        <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            ESTIMATED CO2 REDUCTION
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>6,420 kg</p>
          <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Reduced idling emissions</p>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Corridor Congestion Comparison */}
        <div
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Corridor Peak Load: Observed vs FLOWOPT
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { name: 'Varthur Main Road (SH-35)', before: 92, after: 74, reduction: '-18%' },
              { name: 'Outer Ring Road (Marathahalli)', before: 85, after: 72, reduction: '-13%' },
              { name: 'Sarjapur-Gunjur Bypass', before: 34, after: 48, reduction: '+14% (Absorbed)' },
              { name: 'Whitefield Main (ITPL)', before: 64, after: 58, reduction: '-6%' },
              { name: 'Old Airport Road', before: 66, after: 60, reduction: '-6%' },
            ].map((c) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#0f172a', marginBottom: '4px' }}>
                  <span>{c.name}</span>
                  <span style={{ fontWeight: 700, color: c.reduction.includes('-') ? '#0d9488' : '#d97706' }}>
                    {c.after}% ({c.reduction})
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(226,232,240,0.8)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${c.after}%`, height: '100%', background: '#0d9488', borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Split & Fleet Distribution */}
        <div
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Network Modal Split &amp; Passenger Car Equivalents
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Private Passenger Cars (Single Occupant)', pct: 62, count: '5,220 v/h', color: '#3b82f6' },
              { label: 'BMTC Public Transit Buses (High Capacity)', pct: 18, count: '184 buses', color: '#2563eb' },
              { label: 'School Transport Fleets (Greenwood + 4 Schools)', pct: 7, count: '120 buses', color: '#d97706' },
              { label: 'Commercial Heavy Freight & Linehaul', pct: 13, count: '412 trucks', color: '#7c3aed' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, display: 'inline-block' }} />
                    <span style={{ color: '#0f172a' }}>{item.label}</span>
                  </div>
                  <strong style={{ color: item.color }}>{item.pct}%</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', marginLeft: '16px' }}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReportsView;
