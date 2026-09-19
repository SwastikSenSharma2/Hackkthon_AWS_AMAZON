import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onOpenDashboard: () => void;
  onLaunchFlagshipDemo: () => void;
  onOpenBeginnerGuide: () => void;
  onSelectRoad: (roadId: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenDashboard,
  onLaunchFlagshipDemo,
  onOpenBeginnerGuide,
  onSelectRoad,
}) => {
  return (
    <section className="relative w-full min-h-[92vh] flex flex-col justify-between overflow-hidden luminous-bg">
      {/* Background Subtle Constellation Network SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="light-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#light-grid)" />

        {/* Orbit curved trajectory lines */}
        <path d="M -100 200 C 300 150, 700 350, 1200 100" fill="none" stroke="url(#orbit-grad)" strokeWidth="1.5" />
        <path d="M 200 -50 C 450 300, 850 450, 1400 300" fill="none" stroke="url(#orbit-grad)" strokeWidth="1.5" />
        <path d="M 50 600 C 400 450, 900 650, 1350 400" fill="none" stroke="url(#orbit-grad)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Constellation Nodes */}
        <circle cx="280" cy="180" r="4" fill="#6366f1" />
        <circle cx="280" cy="180" r="10" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.3" />

        <circle cx="480" cy="270" r="3.5" fill="#8b5cf6" />
        <circle cx="720" cy="240" r="4.5" fill="#0284c7" />
        <circle cx="950" cy="140" r="3" fill="#a855f7" />
        <circle cx="620" cy="480" r="4" fill="#38bdf8" />
        <circle cx="860" cy="380" r="3" fill="#6366f1" />

        {/* Connection rays */}
        <line x1="280" y1="180" x2="480" y2="270" stroke="rgba(139, 92, 246, 0.25)" strokeWidth="1" />
        <line x1="480" y1="270" x2="720" y2="240" stroke="rgba(2, 132, 199, 0.25)" strokeWidth="1" />
        <line x1="720" y1="240" x2="950" y2="140" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
      </svg>

      {/* Hero Content (Left-Anchored Matching Reference Image) */}
      <div className="relative z-10 pt-28 sm:pt-36 md:pt-40 px-6 sm:px-12 md:px-20 max-w-4xl">
        {/* Pre-header: Teal Dash Tag */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="w-6 h-[2px] bg-teal-600 rounded-full" />
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-teal-700 uppercase">
            Network intelligence for moving cities
          </span>
        </motion.div>

        {/* Headline: "Optimize traffic. Not just routes." */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 sm:mt-8 font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] leading-[1.05] tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <span className="text-slate-900 block">Optimize traffic.</span>
          <span
            className="block mt-1"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Not just routes.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Dynamic routing and scheduling for intelligent urban mobility. FLOWOPT sees the whole network, predicts what happens next, and finds a better way forward.
        </motion.p>

        {/* CTAs: Exact styling from image */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-8 sm:mt-10"
        >
          {/* Primary Button */}
          <motion.button
            onClick={onOpenDashboard}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-gradient-primary px-8 py-4 rounded-full font-semibold text-sm sm:text-base flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>Open dashboard</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </motion.button>

          {/* Secondary Watch Demo Button */}
          <motion.button
            onClick={onLaunchFlagshipDemo}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-6 py-3.5 rounded-full bg-white/70 hover:bg-white border border-slate-200/80 shadow-sm text-slate-700 font-medium text-sm sm:text-base flex items-center justify-center gap-3 cursor-pointer backdrop-blur-md transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0f172a">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <span>Watch demo</span>
          </motion.button>

          {/* Direct Flagship Alert Button */}
          <motion.button
            onClick={() => onSelectRoad('road-varthur')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Varthur Road (92% Bottleneck)</span>
            <span className="underline">Inspect</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom Telemetry Ticker Strip */}
      <div className="relative z-10 px-6 sm:px-12 md:px-20 py-8">
        <div className="luminous-card p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-6 sm:gap-10 min-w-max">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Network Congestion</span>
              <span className="text-base sm:text-lg font-bold text-amber-600">68% <span className="text-xs text-slate-400 font-normal">(+14% Peak)</span></span>
            </div>

            <div className="w-[1px] h-8 bg-slate-200" />

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Average Speed</span>
              <span className="text-base sm:text-lg font-bold text-teal-700">24 km/h <span className="text-xs text-slate-400 font-normal">(Target 38)</span></span>
            </div>

            <div className="w-[1px] h-8 bg-slate-200" />

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active Monitored</span>
              <span className="text-base sm:text-lg font-bold text-slate-800">8,420 Vehicles</span>
            </div>

            <div className="w-[1px] h-8 bg-slate-200" />

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Greenwood Fleet</span>
              <span className="text-base sm:text-lg font-bold text-indigo-600">50 School Buses</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />
            <span>Bengaluru East Command Active</span>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
