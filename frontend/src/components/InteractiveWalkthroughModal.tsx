import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewTab, RoadSegment } from '../types';

interface InteractiveWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ViewTab) => void;
  onSelectRoad: (road: RoadSegment) => void;
  roads: RoadSegment[];
}

const walkthroughSteps = [
  {
    step: 1,
    title: 'Step 1: Landing Experience',
    description: 'FLOWOPT treats urban traffic as a network-wide optimization problem rather than individual shortest routes.',
    actionLabel: 'Enter Live Dashboard',
    tab: 'overview' as ViewTab,
  },
  {
    step: 2,
    title: 'Step 2: Live Network Detection',
    description: 'The real-time traffic map monitors 8,420 vehicles across Pune Metropolitan area. An alert triggers on the primary corridor reaching 92% capacity.',
    actionLabel: 'Inspect Varthur Alert',
    tab: 'live-traffic' as ViewTab,
  },
  {
    step: 3,
    title: 'Step 3: Deep Road & Cause Analysis',
    description: 'Road analysis identifies the root cause: 38 school buses from Greenwood International and 126 peak freight vehicles are bottlenecked.',
    actionLabel: 'View FLOWOPT Recommendation',
    tab: 'optimization' as ViewTab,
  },
  {
    step: 4,
    title: 'Step 4: School Fleet Coordination',
    description: 'Instead of routing 50 buses independently, FLOWOPT reallocates 18 buses to Sarjapur bypass and staggers departure times (06:32 – 06:46 AM).',
    actionLabel: 'Inspect School Fleet Plan',
    tab: 'school-buses' as ViewTab,
  },
  {
    step: 5,
    title: 'Step 5: Multi-Commodity Simulation',
    description: 'The simulation engine computes multi-corridor equilibrium across time steps (06:30 → 08:00), verifying bus on-time arrival.',
    actionLabel: 'Run Simulation Engine',
    tab: 'simulation' as ViewTab,
  },
  {
    step: 6,
    title: 'Step 6: Before vs After Transformation',
    description: 'Measured network impact: Congestion reduced from 91% to 74%, school bus delays cut by -53%, and 4,820 commuter-hours saved daily.',
    actionLabel: 'View Final Impact Report',
    tab: 'reports' as ViewTab,
  },
];

export const InteractiveWalkthroughModal: React.FC<InteractiveWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectRoad,
  roads,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = walkthroughSteps[currentStepIdx];

  const handleNext = () => {
    if (currentStep.tab) {
      onNavigateTab(currentStep.tab);
    }
    if (currentStep.step === 2) {
      const varthur = roads.find((r) => r.id === 'road-varthur');
      if (varthur) onSelectRoad(varthur);
    }
    if (currentStepIdx < walkthroughSteps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
      const prevStep = walkthroughSteps[currentStepIdx - 1];
      if (prevStep.tab) onNavigateTab(prevStep.tab);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99,
          maxWidth: '440px',
          width: 'calc(100% - 48px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{
            padding: '22px 24px',
            borderRadius: '20px',
            background: 'rgba(10, 16, 13, 0.96)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.8), 0 0 20px rgba(16,185,129,0.2)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(16,185,129,0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.4)',
                }}
              >
                FLAGSHIP DEMO TOUR
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {currentStepIdx + 1} / {walkthroughSteps.length}
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Title & Description */}
          <h3
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '17px',
              fontWeight: 700,
              color: '#ffffff',
              marginTop: '12px',
            }}
          >
            {currentStep.title}
          </h3>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '6px', lineHeight: 1.45 }}>
            {currentStep.description}
          </p>

          {/* Stepper Progress Bar */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px', marginBottom: '18px' }}>
            {walkthroughSteps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '999px',
                  background: idx <= currentStepIdx ? '#10b981' : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              style={{
                padding: '8px 14px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: currentStepIdx === 0 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                fontSize: '12px',
                cursor: currentStepIdx === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            <motion.button
              onClick={handleNext}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '9px 20px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              <span>{currentStep.actionLabel}</span>
              <span>→</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default InteractiveWalkthroughModal;
