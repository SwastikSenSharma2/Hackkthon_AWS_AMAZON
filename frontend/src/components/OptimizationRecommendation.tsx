import React from 'react';
import { motion } from 'framer-motion';
import { OPTIMIZATION_PILLARS, BEFORE_AFTER_DATA } from '../mockData';

interface OptimizationRecommendationProps {
  onOpenSchoolBusOptimization: () => void;
  onLaunchSimulation: () => void;
  onBackToDashboard: () => void;
}

export const OptimizationRecommendation: React.FC<OptimizationRecommendationProps> = ({
  onOpenSchoolBusOptimization,
  onLaunchSimulation,
  onBackToDashboard,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToDashboard}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 transition-colors"
        >
          <span>←</span>
          <span>Back to Live Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
            NETWORK EQUILIBRIUM SOLVER V4
          </span>
          <span className="text-xs text-slate-400 font-medium">Generated 07:15 AM</span>
        </div>
      </div>

      {/* Main Problem Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-50 via-white to-sky-50 border border-rose-200/80 shadow-md mb-8"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white uppercase">
            Critical Bottleneck
          </span>
          <span className="text-xs text-slate-500 font-medium">Corridor SH-35 (Varthur Main Road)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Varthur Road is projected to exceed 90% capacity at 07:30.
        </h1>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-3xl font-normal">
          Uncoordinated shortest-path routing concentrates 38 of 50 Greenwood International school buses and 126 peak freight vehicles on the same corridor during the morning peak. FLOWOPT has computed a multi-commodity network optimization plan.
        </p>
      </motion.div>

      {/* 4 Actionable Pillars (WHAT / WHY / IMPACT) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          FLOWOPT Multi-Layer Action Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPTIMIZATION_PILLARS.map((pillar, idx) => (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="luminous-card p-6 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {pillar.category}
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {pillar.title}
                </h3>

                <div className="mt-4 flex flex-col gap-3 text-xs">
                  <div>
                    <span className="font-bold text-teal-700 uppercase tracking-wider block">WHAT CHANGES?</span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{pillar.what}</p>
                  </div>

                  <div>
                    <span className="font-bold text-amber-700 uppercase tracking-wider block">WHY THIS ACTION?</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{pillar.why}</p>
                  </div>

                  <div>
                    <span className="font-bold text-indigo-700 uppercase tracking-wider block">EXPECTED IMPACT</span>
                    <p className="text-indigo-900 font-semibold mt-0.5 leading-relaxed">{pillar.impact}</p>
                  </div>
                </div>
              </div>

              {pillar.category === 'Fleet Routing' && (
                <button
                  onClick={onOpenSchoolBusOptimization}
                  className="mt-4 py-2 px-3 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Inspect 50 School Buses Manifest</span>
                  <span>→</span>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Side-by-Side Before vs After Preview */}
      <div className="luminous-card p-6 sm:p-8 rounded-3xl mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Projected Network Transformation</h3>
            <p className="text-xs sm:text-sm text-slate-500">Uncoordinated individual routes vs FLOWOPT collective equilibrium</p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
            -53% Bus Delays • -17% Congestion
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">CURRENT UNOPTIMIZED</span>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">CONGESTION</span>
                <p className="text-xl font-extrabold text-rose-700">{BEFORE_AFTER_DATA.current.congestionPct}%</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">BUS DELAY</span>
                <p className="text-xl font-extrabold text-rose-700">{BEFORE_AFTER_DATA.current.busDelayMin}m</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">AVG SPEED</span>
                <p className="text-xl font-extrabold text-slate-800">{BEFORE_AFTER_DATA.current.averageSpeedKmh} km/h</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">FLOWOPT OPTIMIZED</span>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <span className="text-[10px] text-teal-700 font-semibold uppercase">CONGESTION</span>
                <p className="text-xl font-extrabold text-teal-700">{BEFORE_AFTER_DATA.optimized.congestionPct}%</p>
              </div>
              <div>
                <span className="text-[10px] text-teal-700 font-semibold uppercase">BUS DELAY</span>
                <p className="text-xl font-extrabold text-teal-700">{BEFORE_AFTER_DATA.optimized.busDelayMin}m</p>
              </div>
              <div>
                <span className="text-[10px] text-teal-700 font-semibold uppercase">AVG SPEED</span>
                <p className="text-xl font-extrabold text-teal-700">{BEFORE_AFTER_DATA.optimized.averageSpeedKmh} km/h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onOpenSchoolBusOptimization}
          className="px-5 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-200 cursor-pointer shadow-xs"
        >
          View School Bus Plan (50 Buses)
        </button>

        <motion.button
          onClick={onLaunchSimulation}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-gradient-primary px-7 py-3 rounded-full text-xs sm:text-sm font-bold cursor-pointer"
        >
          Run Live Network Simulation →
        </motion.button>
      </div>
    </div>
  );
};
export default OptimizationRecommendation;
