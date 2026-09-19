import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoadSegment } from '../types';

interface RoadAnalysisDrawerProps {
  road: RoadSegment | null;
  onClose: () => void;
  onOptimize: (road: RoadSegment) => void;
  onInspectSchoolFleet: () => void;
}

export const RoadAnalysisDrawer: React.FC<RoadAnalysisDrawerProps> = ({
  road,
  onClose,
  onOptimize,
  onInspectSchoolFleet,
}) => {
  if (!road) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end items-end sm:items-stretch"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-[480px] h-[85vh] sm:h-full bg-white/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-slate-200/80 p-6 sm:p-8 flex flex-col overflow-y-auto shadow-2xl rounded-t-3xl sm:rounded-none"
        >
          {/* Mobile Handle */}
          <div className="flex sm:hidden justify-center pb-2">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                    road.status === 'critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-teal-100 text-teal-800 border border-teal-200'
                  }`}
                >
                  {road.status === 'critical' ? 'Critical Bottleneck' : road.status}
                </span>
                <span className="text-xs text-slate-500 font-medium">{road.code}</span>
              </div>
              <h2 className="font-extrabold text-xl sm:text-2xl text-slate-900 mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {road.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {road.zone} • {road.lengthKm} km segment
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-wider block">Flow / Capacity</span>
              <p className="text-lg font-extrabold text-slate-900 mt-1">
                {road.flow} <span className="text-xs text-slate-500 font-normal">/ {road.capacity} v/h</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/70">
              <span className="text-[10.5px] text-rose-700 font-semibold uppercase tracking-wider block">Utilization</span>
              <p className="text-lg font-extrabold text-rose-700 mt-1">{road.utilization}%</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-wider block">Average Speed</span>
              <p className="text-lg font-extrabold text-rose-600 mt-1">
                {road.speed} <span className="text-xs text-slate-500 font-normal">km/h (Norm: {road.normalSpeed})</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10.5px] text-slate-500 font-semibold uppercase tracking-wider block">Corridor Health</span>
              <p className="text-sm font-bold text-amber-600 mt-1.5">-65% Throughput</p>
            </div>
          </div>

          {/* Vehicle Distribution */}
          <div className="mt-6">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Vehicle Category Distribution</span>
              <span className="text-slate-500">{road.flow} v/h</span>
            </div>
            <div className="h-2.5 rounded-full flex overflow-hidden bg-slate-100">
              <div style={{ width: `${road.vehicleDistribution.cars}%` }} className="bg-sky-500" />
              <div style={{ width: `${road.vehicleDistribution.publicTransport}%` }} className="bg-indigo-500" />
              <div style={{ width: `${road.vehicleDistribution.schoolBuses}%` }} className="bg-amber-500" />
              <div style={{ width: `${road.vehicleDistribution.freight}%` }} className="bg-purple-500" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Cars: {road.vehicleDistribution.cars}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Public Transit: {road.vehicleDistribution.publicTransport}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-amber-800">School Buses: {road.vehicleDistribution.schoolBuses}% (38)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-semibold text-purple-800">Freight: {road.vehicleDistribution.freight}% (126)</span>
              </div>
            </div>
          </div>

          {/* Prediction Timeline */}
          <div className="mt-6">
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Predictive Congestion Forecast (06:30 – 08:00)
            </span>
            <div className="flex flex-col gap-2 mt-3">
              {road.prediction.map((pt) => {
                const isPeak = pt.congestion >= 90;
                return (
                  <div key={pt.time} className="flex items-center gap-3 text-xs">
                    <span className={`w-10 font-semibold ${isPeak ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      {pt.time}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pt.congestion}%` }}
                        className={`h-full rounded-full ${
                          pt.congestion >= 90
                            ? 'bg-rose-500'
                            : pt.congestion >= 70
                            ? 'bg-orange-500'
                            : pt.congestion >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className={`w-10 text-right font-bold ${isPeak ? 'text-rose-600' : 'text-slate-700'}`}>
                      {pt.congestion}%
                    </span>
                    <span className="w-12 text-right text-slate-400 text-[11px]">{pt.speed} km/h</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Root Cause Alert Box */}
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Root Cause Identified</span>
            <p className="text-xs text-amber-900 mt-1 leading-relaxed">
              38 Greenwood School buses dispatched simultaneously at 06:30 create critical platoon shockwaves at Varthur junction.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-auto pt-6 flex flex-col gap-2.5">
            <motion.button
              onClick={() => onOptimize(road)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-gradient-primary w-full py-3.5 rounded-full font-bold text-sm cursor-pointer shadow-md text-center"
            >
              Optimize Traffic Network →
            </motion.button>

            <button
              onClick={onInspectSchoolFleet}
              className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer transition-all"
            >
              Inspect Greenwood School Fleet (50 Buses)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
export default RoadAnalysisDrawer;
