import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

const HOLD_DURATION_MS = 800;

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

  const glowAlpha = progress;
  const glowAlphaWeak = progress * 0.4;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={
          revealing
            ? { y: -200, rotate: -10, opacity: 0 }
            : { y: [0, -5, 0], opacity: 1, rotate: 0 }
        }
        transition={
          revealing
            ? { duration: 0.45, ease: 'easeIn' }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }
        }
        onAnimationComplete={() => {
          if (revealing) onRevealComplete();
        }}
        style={{
          boxShadow: progress > 0
            ? `0 0 0 2px rgba(245,158,11,${glowAlpha}), 0 0 20px 4px rgba(245,158,11,${glowAlphaWeak})`
            : undefined,
          borderRadius: 16,
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
      >
        <svg
          width={220}
          height={180}
          viewBox="0 0 220 180"
          style={{ display: 'block', userSelect: 'none' }}
        >
          {/* Bottom shadow */}
          <ellipse cx={110} cy={168} rx={70} ry={8} fill="rgba(0,0,0,0.35)" />

          {/* Cup body — slightly conical (wider at top) */}
          <path
            d="M 50 30 L 30 155 Q 30 162 38 162 L 182 162 Q 190 162 190 155 L 170 30 Z"
            fill="#4a2810"
          />

          {/* Inner shading for depth */}
          <path
            d="M 55 35 L 36 152 Q 36 158 42 158 L 178 158 Q 184 158 184 152 L 165 35 Z"
            fill="#3a1e08"
          />

          {/* Rim — top ellipse for 3D opening */}
          <ellipse cx={110} cy={30} rx={60} ry={12} fill="#5c3220" />
          <ellipse cx={110} cy={30} rx={52} ry={9} fill="#2a1005" />

          {/* Leather highlight — left strip */}
          <path
            d="M 62 42 L 46 148 Q 47 152 52 152 L 68 152 L 82 42 Z"
            fill="rgba(255,255,255,0.07)"
          />

          {/* Bottom rim band */}
          <path
            d="M 30 148 Q 30 162 38 162 L 182 162 Q 190 162 190 148 Z"
            fill="#7a4228"
          />

          {/* Rim top highlight */}
          <ellipse cx={110} cy={28} rx={58} ry={10} fill="none" stroke="#8b5030" strokeWidth={2} />
        </svg>
      </motion.div>

      {!revealing && progress === 0 && (
        <p className="text-slate-500 text-xs select-none">Gedrückt halten zum Heben</p>
      )}
    </div>
  );
};
