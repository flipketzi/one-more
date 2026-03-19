import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const HOLD_DURATION_MS = 800;
const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 175.9

interface Props {
  onReveal: () => void;
  onRevealComplete: () => void;
  revealing: boolean;
}

export const DiceCup: React.FC<Props> = ({ onReveal, onRevealComplete, revealing }) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    if (revealing) return;
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setProgress(0);
        onReveal();
      }
    }, 16);
  };

  const cancelHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(0);
  };

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Cup visual */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={
          revealing
            ? { y: '-120%', opacity: 0, scale: 0.8 }
            : { y: [0, -6, 0], opacity: 1, scale: 1 }
        }
        transition={
          revealing
            ? { duration: 0.4, ease: 'easeIn' }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }
        }
        onAnimationComplete={() => {
          if (revealing) onRevealComplete();
        }}
      >
        {/* SVG ring around cup */}
        <svg
          width={80}
          height={80}
          className="absolute"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={40}
            cy={40}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={4}
          />
          <circle
            cx={40}
            cy={40}
            r={RADIUS}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.016s linear' }}
          />
        </svg>

        {/* Cup emoji */}
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-4xl shadow-xl border border-white/20">
          🎲
        </div>
      </motion.div>

      {/* Hold button */}
      {!revealing && (
        <button
          className="px-6 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm select-none active:scale-95 transition-transform"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
        >
          Becher heben
        </button>
      )}
    </div>
  );
};
