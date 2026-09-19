import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FREIGHT_SHIFT_LIST } from '../mockData';

interface FreightManagementViewProps {
  onBackToDashboard: () => void;
}

export const FreightManagementView: React.FC<FreightManagementViewProps> = ({
  onBackToDashboard,
}) => {
  const [freightList, setFreightList] = useState(FREIGHT_SHIFT_LIST);

  const toggleShift = (id: string) => {
    setFreightList((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'Shifted' ? 'Pending' : 'Shifted' }
          : item
      )
    );
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
            background: 'rgba(168,85,247,0.1)',
            color: '#7c3aed',
            border: '1px solid rgba(168,85,247,0.2)',
          }}
        >
          NETWORK-AWARE FREIGHT SCHEDULER
        </span>
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>ACTIVE FREIGHT VEHICLES</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>412</p>
          <p style={{ fontSize: '11.5px', color: '#7c3aed', marginTop: '2px' }}>East Zone Logistics Corridor</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(254,242,242,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>PEAK CORRIDOR FREIGHT</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>126</p>
          <p style={{ fontSize: '11.5px', color: '#f87171', marginTop: '2px' }}>Varthur &amp; ORR Merge</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(240,253,250,0.9)', border: '1px solid rgba(13,148,136,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#0d9488', textTransform: 'uppercase', fontWeight: 600 }}>RECOMMENDED SHIFT</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>48</p>
          <p style={{ fontSize: '11.5px', color: '#0f766e', marginTop: '2px' }}>Non-urgent heavy freight</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>POTENTIAL DELAY AVOIDED</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>11 min</p>
          <p style={{ fontSize: '11.5px', color: '#0d9488', marginTop: '2px' }}>For all corridor commuters</p>
        </div>
      </div>

      {/* Timeline Shift Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '24px 28px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(226,232,240,0.8)',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Freight Transit Slotting Timeline (05:00 to 12:00)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
              Shifting 48 heavy freight vehicles outside the 07:15-08:15 school bus peak window to protect corridor throughput
            </p>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(13,148,136,0.12)',
              color: '#0d9488',
              fontWeight: 700,
              border: '1px solid rgba(13,148,136,0.2)',
            }}
          >
            -134 PCU Peak Load
          </span>
        </div>

        {/* Timeline Bar */}
        <div style={{ position: 'relative', marginTop: '24px', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
            <span>05:00 Early</span>
            <span>06:00</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>07:15 – 08:15 PEAK (School Rush)</span>
            <span>09:00</span>
            <span>10:30</span>
            <span>12:00 Midday</span>
          </div>

          <div style={{ height: '36px', borderRadius: '8px', background: 'rgba(241,245,249,0.8)', display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: '25%', background: 'rgba(13,148,136,0.2)', borderRight: '1px dashed rgba(148,163,184,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10.5px', color: '#0d9488', fontWeight: 600 }}>+18 Shifted Early (05:45)</span>
            </div>
            <div style={{ width: '35%', background: 'rgba(239,68,68,0.15)', borderRight: '1px dashed rgba(148,163,184,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>Peak Congestion Buffer - Restricted</span>
            </div>
            <div style={{ width: '40%', background: 'rgba(13,148,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10.5px', color: '#0d9488', fontWeight: 600 }}>+30 Shifted Off-Peak (08:45+)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Shift Manifest Table */}
      <div
        style={{
          background: 'rgba(255,255,255,0.88)',
          borderRadius: '16px',
          border: '1px solid rgba(226,232,240,0.8)',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Scheduled Freight Dispatches (48 Optimized Trips)
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Collaborative fleet scheduling with major logistics carriers
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)', color: '#94a3b8' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>TRUCK / FLEET</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>OPERATOR</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>CORRIDOR</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>ORIGINAL WINDOW</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>RECOMMENDED WINDOW</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>CO2 SAVED</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {freightList.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid rgba(226,232,240,0.6)',
                  }}
                >
                  <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#7c3aed', display: 'inline-block' }} />
                      <span>{item.truckId}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>({item.tonnage}T)</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#475569' }}>{item.operator}</td>
                  <td style={{ padding: '12px 8px', color: '#64748b' }}>{item.corridor}</td>
                  <td style={{ padding: '12px 8px', color: '#ef4444' }}>{item.currentWindow}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#0d9488' }}>
                    {item.recommendedWindow}
                  </td>
                  <td style={{ padding: '12px 8px', color: '#0d9488', fontWeight: 600 }}>{item.co2ReductionKg} kg</td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => toggleShift(item.id)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background:
                          item.status === 'Shifted'
                            ? 'rgba(13,148,136,0.12)'
                            : 'rgba(245,158,11,0.12)',
                        color: item.status === 'Shifted' ? '#0d9488' : '#d97706',
                        border:
                          item.status === 'Shifted'
                            ? '1px solid rgba(13,148,136,0.3)'
                            : '1px solid rgba(245,158,11,0.3)',
                        cursor: 'pointer',
                      }}
                    >
                      {item.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default FreightManagementView;
