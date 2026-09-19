import React from 'react';
import { ViewTab } from '../types';

interface MobileBottomNavProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenGuide: () => void;
}

// Simple SVG icon components
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const BusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M2 11h20" />
    <path d="M7 17v2" />
    <path d="M17 17v2" />
    <path d="M2 7h20" />
  </svg>
);

const SimulateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const ReportIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const HelpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const iconMap: Record<ViewTab, React.FC> = {
  overview: HomeIcon,
  'live-traffic': MapIcon,
  'school-buses': BusIcon,
  simulation: SimulateIcon,
  reports: ReportIcon,
  optimization: SimulateIcon,
  'public-transport': BusIcon,
  freight: ReportIcon,
  workspace: SimulateIcon,
  'before-after': ReportIcon,
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenGuide,
}) => {
  const items: { id: ViewTab; label: string }[] = [
    { id: 'overview', label: 'Home' },
    { id: 'live-traffic', label: 'Map' },
    { id: 'school-buses', label: 'Buses' },
    { id: 'simulation', label: 'Simulate' },
    { id: 'reports', label: 'Impact' },
  ];

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 70,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -4px 24px rgba(15,23,42,0.08)',
      }}
    >
      {items.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = iconMap[item.id] || HomeIcon;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: isActive ? '#0d9488' : '#94a3b8',
              cursor: 'pointer',
              padding: '6px 2px',
              borderRadius: '12px',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  width: '16px',
                  height: '3px',
                  borderRadius: '999px',
                  background: '#0d9488',
                }}
              />
            )}
            <Icon />
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: isActive ? 700 : 500,
                marginTop: '3px',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Quick Guide Trigger */}
      <button
        onClick={onOpenGuide}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          color: '#2563eb',
          cursor: 'pointer',
          padding: '6px 2px',
          flex: 0.9,
        }}
      >
        <HelpIcon />
        <span style={{ fontSize: '10.5px', fontWeight: 600, marginTop: '3px' }}>
          Help
        </span>
      </button>
    </nav>
  );
};
export default MobileBottomNav;
