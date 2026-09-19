import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BMTC_PUBLIC_ROUTES } from '../mockData';
import { PublicTransportRoute } from '../types';

interface PublicTransportViewProps {
  onBackToDashboard: () => void;
}

export const PublicTransportView: React.FC<PublicTransportViewProps> = ({
  onBackToDashboard,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<PublicTransportRoute>(BMTC_PUBLIC_ROUTES[2]);
  const [isPriorityActive, setIsPriorityActive] = useState(true);

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
            background: 'rgba(59,130,246,0.1)',
            color: '#2563eb',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          BMTC TRANSIT TELEMETRY (184 BUSES)
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
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>ACTIVE BUSES</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>184</p>
          <p style={{ fontSize: '11.5px', color: '#0d9488', marginTop: '2px' }}>East Bengaluru IT Corridor</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>ON-TIME FLEET</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>157</p>
          <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>85.3% compliance</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(254,242,242,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>DELAYED BUSES</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>27</p>
          <p style={{ fontSize: '11.5px', color: '#f87171', marginTop: '2px' }}>14 on Varthur route 333-P</p>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>AVERAGE DELAY</span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>8 min</p>
          <p style={{ fontSize: '11.5px', color: '#0d9488', marginTop: '2px' }}>Reduced from 16 min</p>
        </div>
      </div>

      {/* Routes Grid + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Route List */}
        <div
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Monitored BMTC Arterial Corridors
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {BMTC_PUBLIC_ROUTES.map((route) => {
              const isSelected = selectedRoute.routeId === route.routeId;
              return (
                <div
                  key={route.routeId}
                  onClick={() => setSelectedRoute(route)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(59,130,246,0.08)' : 'rgba(248,250,252,0.8)',
                    border: isSelected ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(226,232,240,0.8)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        Route {route.code}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>({route.routeId})</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {route.origin} to {route.destination}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background:
                          route.status === 'critical'
                            ? 'rgba(239,68,68,0.12)'
                            : route.status === 'moderate'
                            ? 'rgba(245,158,11,0.12)'
                            : 'rgba(13,148,136,0.12)',
                        color:
                          route.status === 'critical'
                            ? '#ef4444'
                            : route.status === 'moderate'
                            ? '#d97706'
                            : '#0d9488',
                      }}
                    >
                      {route.delayMin} min delay
                    </span>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {route.activeBuses} buses active
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Route Telemetry */}
        <div
          style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(59,130,246,0.08)',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
              TRANSIT PRIORITY CONTROLLER
            </span>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              Route {selectedRoute.code} Telemetry
            </h3>

            <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
              {selectedRoute.origin} to {selectedRoute.destination}
            </p>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>RIDERSHIP THROUGHPUT</span>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {selectedRoute.ridershipPerHour.toLocaleString()} passengers / hr
                </p>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>SCHEDULE COMPLIANCE</span>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0d9488', marginTop: '2px' }}>
                  {selectedRoute.compliancePct}% on schedule
                </p>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: isPriorityActive ? 'rgba(13,148,136,0.08)' : 'rgba(248,250,252,0.9)',
                  border: isPriorityActive ? '1px solid rgba(13,148,136,0.25)' : '1px solid rgba(226,232,240,0.8)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                    Dynamic Green Wave Signal Priority
                  </span>
                  <input
                    type="checkbox"
                    checked={isPriorityActive}
                    onChange={(e) => setIsPriorityActive(e.target.checked)}
                    style={{ accentColor: '#0d9488', width: '16px', height: '16px' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Extends green signal phase by +8s when high-occupancy bus approaches junction.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              onClick={onBackToDashboard}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Traffic Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PublicTransportView;
