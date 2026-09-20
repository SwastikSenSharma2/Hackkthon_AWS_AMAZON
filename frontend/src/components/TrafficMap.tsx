import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoadSegment, TrafficStatus } from '../types';

interface TrafficMapProps {
  roads: RoadSegment[];
  selectedRoadId: string | null;
  onSelectRoad: (road: RoadSegment) => void;
  isOptimizedView?: boolean;
  showSchoolBuses?: boolean;
  showFreight?: boolean;
  showPublicTransit?: boolean;
  activeTime?: string;
}

export const TrafficMap: React.FC<TrafficMapProps> = ({
  roads,
  selectedRoadId,
  onSelectRoad,
  isOptimizedView = false,
  activeTime = '07:30',
}) => {
  const [hoveredRoadId, setHoveredRoadId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'school' | 'freight' | 'public'>('all');

  const getStatusColor = (status: TrafficStatus, isOptimized: boolean, roadId: string) => {
    if (isOptimized && (roadId === 'road-varthur' || roadId === 'road-hinjawadi')) {
      return '#d97706'; // Amber moderate
    }
    if (isOptimized && (roadId === 'road-gunjur' || roadId === 'road-baner')) {
      return '#059669'; // Teal/emerald
    }
    switch (status) {
      case 'critical':
        return '#e11d48';
      case 'high':
        return '#ea580c';
      case 'moderate':
        return '#d97706';
      case 'low':
      default:
        return '#059669';
    }
  };

  const hoveredRoad = roads.find((r) => r.id === hoveredRoadId);

  return (
    <div className="flex flex-col w-full h-full gap-3">
      {/* Map Surface */}
      <div className="relative w-full flex-1 min-h-[360px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-md bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c1322]">
        {/* Subtle grid texture */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          <defs>
            <pattern id="dark-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dark-grid)" />
        </svg>

        {/* Map Header & Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-2 shadow-xs">
              <span
                className={`w-2 h-2 rounded-full ${isOptimizedView ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`}
              />
              <span>{isOptimizedView ? 'FLOWOPT Optimized' : 'Live Observed Traffic'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-sky-400 font-bold">{activeTime}</span>
            </div>

            {/* Quick Status Legend */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Mod</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Critical</span>
            </div>
          </div>

          {/* Layer Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Traffic' },
              { id: 'school', label: 'School Fleet (50)' },
              { id: 'freight', label: 'Freight (412)' },
              { id: 'public', label: 'PMPML Buses' },
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                  activeLayer === layer.id
                    ? 'bg-sky-500 text-white font-semibold shadow-xs'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Map SVG Surface */}
        <svg viewBox="0 0 720 540" preserveAspectRatio="xMidYMid meet" className="w-full h-full block">
          <defs>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Varthur Lake Graphic */}
          <path
            d="M 430,280 Q 480,270 520,310 T 470,360 Z"
            fill="rgba(14, 165, 233, 0.18)"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text x="450" y="325" fill="rgba(186, 230, 253, 0.7)" fontSize="9" fontFamily="'Inter', sans-serif" fontWeight="500">
            Varthur Lake
          </text>

          {/* Secondary connector road networks */}
          <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" fill="none">
            <path d="M 180,240 L 450,110" />
            <path d="M 110,90 L 450,110" />
            <path d="M 320,230 L 280,360" />
            <path d="M 450,260 L 460,390" />
            <path d="M 180,360 L 280,360" />
            <path d="M 620,310 L 680,420" />
          </g>

          {/* Primary Monitored Road Segments */}
          {roads.map((road) => {
            const isSelected = selectedRoadId === road.id;
            const isHovered = hoveredRoadId === road.id;
            const color = getStatusColor(road.status, isOptimizedView, road.id);

            return (
              <g
                key={road.id}
                onClick={() => onSelectRoad(road)}
                onMouseEnter={() => setHoveredRoadId(road.id)}
                onMouseLeave={() => setHoveredRoadId(null)}
                className="cursor-pointer"
              >
                {/* Halo */}
                <path
                  d={road.pathData}
                  fill="none"
                  stroke={isSelected ? '#ffffff' : color}
                  strokeWidth={isSelected ? 16 : isHovered ? 12 : 8}
                  strokeOpacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.15}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Road Base */}
                <path
                  d={road.pathData}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Road Congestion Line */}
                <path
                  d={road.pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 5.5 : 4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: road.status === 'critical' && !isOptimizedView ? 'url(#glow-rose)' : undefined,
                    transition: 'stroke 0.5s ease',
                  }}
                />

                {/* Animated Particles */}
                <path
                  d={road.pathData}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="4 16"
                  strokeLinecap="round"
                  opacity={0.85}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="100"
                    to="0"
                    dur={road.status === 'critical' ? '6s' : '2.2s'}
                    repeatCount="indefinite"
                  />
                </path>

                {/* Road Label Badge */}
                <g transform={`translate(${road.centerPoint.x}, ${road.centerPoint.y})`}>
                  <rect
                    x="-55"
                    y="-13"
                    width="110"
                    height="26"
                    rx="13"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke={isSelected ? '#ffffff' : color}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <circle cx="-42" cy="0" r="3.5" fill={color} />
                  <text
                    x="-32"
                    y="4"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="'Inter', sans-serif"
                  >
                    {road.id === 'road-varthur'
                      ? isOptimizedView
                        ? 'Varthur: 74%'
                        : 'Varthur: 92%'
                      : road.id === 'road-gunjur'
                      ? isOptimizedView
                        ? 'Gunjur: 48%'
                        : 'Gunjur Alt: 34%'
                      : road.name.split(' ')[0]}
                  </text>
                </g>
              </g>
            );
          })}

          {/* School Buses Layer */}
          {(activeLayer === 'all' || activeLayer === 'school') && (
            <g>
              {!isOptimizedView ? (
                <>
                  <g transform="translate(360, 248)">
                    <rect x="-18" y="-11" width="36" height="22" rx="6" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                      38 Bus
                    </text>
                  </g>
                  <g transform="translate(480, 270)">
                    <circle cx="0" cy="0" r="4" fill="#f59e0b" />
                    <text x="8" y="3" fill="#fcd34d" fontSize="8" fontWeight="600">Bus 101-138 Delay</text>
                  </g>
                </>
              ) : (
                <>
                  <g transform="translate(360, 248)">
                    <rect x="-18" y="-11" width="36" height="22" rx="6" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                      32 Bus
                    </text>
                  </g>
                  <g transform="translate(360, 385)">
                    <rect x="-18" y="-11" width="36" height="22" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
                      18 Bus
                    </text>
                  </g>
                  <path
                    d="M 360,258 Q 330,320 360,375"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                  >
                    <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1.5s" repeatCount="indefinite" />
                  </path>
                  <text x="270" y="325" fill="#38bdf8" fontSize="9" fontWeight="600">
                    +18 Buses Shifted
                  </text>
                </>
              )}
            </g>
          )}

          {/* Freight Layer */}
          {(activeLayer === 'all' || activeLayer === 'freight') && (
            <g>
              {!isOptimizedView ? (
                <g transform="translate(490, 275)">
                  <rect x="-14" y="-8" width="28" height="16" rx="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                    126 Trk
                  </text>
                </g>
              ) : (
                <g transform="translate(490, 275)">
                  <rect x="-14" y="-8" width="28" height="16" rx="4" fill="#059669" stroke="#ffffff" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                    Shifted
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Destination Landmark */}
          <g transform="translate(620, 310)">
            <circle cx="0" cy="0" r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
            <circle cx="0" cy="0" r="18" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <g transform="translate(14, 4)">
              <rect x="0" y="-12" width="130" height="22" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="#0284c7" strokeWidth="1" />
              <text x="6" y="2" fill="#ffffff" fontSize="8.5" fontWeight="700">
                Greenwood Int'l School
              </text>
              <text x="6" y="12" fill="#38bdf8" fontSize="7.5">
                Target: 07:00 AM Arrival
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {hoveredRoad && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="hidden sm:block absolute bottom-3 left-3 p-3 rounded-xl bg-slate-900/95 border border-slate-700 backdrop-blur-md z-30 max-w-[280px] shadow-lg"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-bold text-white">{hoveredRoad.name}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    color: getStatusColor(hoveredRoad.status, isOptimizedView, hoveredRoad.id),
                    background: `${getStatusColor(hoveredRoad.status, isOptimizedView, hoveredRoad.id)}22`,
                  }}
                >
                  {hoveredRoad.status}
                </span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-300">
                <span>Flow: {hoveredRoad.flow} v/h</span>
                <span className="text-emerald-400 font-semibold">Speed: {hoveredRoad.speed} km/h</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile-Friendly Road Selector */}
      <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1">
        {roads.map((r) => {
          const isSelected = selectedRoadId === r.id;
          const isCrit = r.status === 'critical';
          return (
            <button
              key={r.id}
              onClick={() => onSelectRoad(r)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : isCrit
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCrit ? 'bg-rose-500' : 'bg-teal-500'}`} />
              <span>{r.name.split(' ')[0]}</span>
              <span className="text-[11px] font-bold">
                {isOptimizedView && r.id === 'road-varthur' ? '74%' : `${r.utilization}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default TrafficMap;
