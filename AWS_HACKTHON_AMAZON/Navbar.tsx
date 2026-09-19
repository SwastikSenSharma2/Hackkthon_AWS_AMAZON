import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewTab } from '../types';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenQuickDemo?: () => void;
  onOpenBeginnerGuide?: () => void;
  isLiveActive?: boolean;
}

const navItems: { id: ViewTab; label: string; badge?: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'live-traffic', label: 'Live Traffic', badge: 'LIVE' },
  { id: 'school-buses', label: 'School Buses', badge: '50' },
  { id: 'public-transport', label: 'Public Transport' },
  { id: 'freight', label: 'Freight' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'simulation', label: 'Simulation', badge: 'Engine' },
  { id: 'reports', label: 'Reports' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickDemo,
  onOpenBeginnerGuide,
  isLiveActive = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNav = (tab: ViewTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-3.5 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs"
      >
        {/* Brand & City info */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 text-left"
          >
            {/* Logo Mark */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-500 flex items-center justify-center shadow-sm shadow-teal-500/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11 1 11.9 1 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" fill="#ffffff" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" fill="#ffffff" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  FLOWOPT
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                  BENGALURU
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span>Live Feed 07:15 AM</span>
              </div>
            </div>
          </button>

          {/* Desktop Navigation Items */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        item.badge === 'LIVE'
                          ? 'bg-rose-500 text-white'
                          : isActive
                          ? 'bg-teal-400 text-slate-950'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          {onOpenBeginnerGuide && (
            <button
              onClick={onOpenBeginnerGuide}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200/80 cursor-pointer transition-all"
            >
              <span>Guide</span>
            </button>
          )}

          {onOpenQuickDemo && (
            <button
              onClick={onOpenQuickDemo}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200/80 cursor-pointer transition-all"
            >
              <span>Tour</span>
            </button>
          )}

          {/* Primary CTA button */}
          <motion.button
            onClick={() => onSelectTab(currentTab === 'overview' ? 'live-traffic' : 'simulation')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-gradient-primary px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer flex items-center gap-2"
          >
            <span>{currentTab === 'overview' ? 'Open dashboard' : 'Run simulation'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </motion.button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer text-sm font-bold"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 p-4 shadow-xl lg:hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNav(item.id)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              {onOpenBeginnerGuide && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBeginnerGuide();
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                >
                  Quick Guide
                </button>
              )}
              {onOpenQuickDemo && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenQuickDemo();
                  }}
                  className="flex-1 py-2 rounded-xl bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200"
                >
                  Interactive Tour
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default Navbar;
