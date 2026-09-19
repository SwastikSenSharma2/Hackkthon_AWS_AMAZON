import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '24px',
            border: '1px solid rgba(13,148,136,0.25)',
            padding: '28px 24px',
            boxShadow: '0 20px 60px rgba(15,23,42,0.15), 0 0 30px rgba(13,148,136,0.1)',
          }}
        >
          {/* Top badge & close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                ?
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(13,148,136,0.1)',
                  color: '#0d9488',
                  border: '1px solid rgba(13,148,136,0.25)',
                  textTransform: 'uppercase',
                }}
              >
                Beginner Guide
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '999px',
                background: 'rgba(241,245,249,0.9)',
                border: '1px solid rgba(226,232,240,0.8)',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              X
            </button>
          </div>

          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '22px',
              fontWeight: 700,
              color: '#0f172a',
              marginTop: '14px',
            }}
          >
            How FLOWOPT Works in 60 Seconds
          </h2>

          <p style={{ fontSize: '13.5px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
            Regular GPS apps (Google Maps, Waze) send every driver down the exact same "fastest" road at the same time — which ends up causing massive traffic jams.
          </p>

          <p style={{ fontSize: '13.5px', color: '#0d9488', fontWeight: 600, marginTop: '4px' }}>
            FLOWOPT coordinates the whole city network together instead!
          </p>

          {/* 3 Visual Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {/* Step 1 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(254,242,242,0.9)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#b91c1c' }}>
                  The Problem: Varthur Bottleneck
                </h4>
                <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                  At 07:30 AM, <strong>38 school buses</strong> and <strong>126 heavy trucks</strong> all try to use Varthur Road at once, pushing it to <strong>92% capacity</strong> (traffic jam).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(255,251,235,0.9)',
                border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: '#d97706',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                  FLOWOPT Smart Solution
                </h4>
                <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                  Instead of jamming one road, FLOWOPT shifts <strong>18 buses to an empty bypass</strong>, spaces out departure times by a few minutes, and moves heavy freight to off-peak slots.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'rgba(240,253,250,0.9)',
                border: '1px solid rgba(13,148,136,0.2)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: '#0d9488',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f766e' }}>
                  The Result: Fast &amp; Safe
                </h4>
                <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                  <strong>100% of students arrive on time</strong>, traffic delay drops by <strong>53%</strong>, and the whole city saves <strong>4,820 hours</strong> every single day!
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
            <motion.button
              onClick={() => {
                onClose();
                onStartDemo();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(13,148,136,0.25)',
              }}
            >
              <span>Start Interactive Demo Tour</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default BeginnerGuideModal;
