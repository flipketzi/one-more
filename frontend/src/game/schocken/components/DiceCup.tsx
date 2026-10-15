import React from 'react';
import { motion, PanInfo } from 'framer-motion';

/** Upward drag distance (px) after which letting go lifts the cup completely. */
const LIFT_THRESHOLD_PX = 70;
/** How far the cup follows the pointer before it stops moving up. */
const MAX_DRAG_PX = 140;

interface Props {
  onReveal: () => void;
  onRevealComplete: () => void;
  revealing: boolean;
}

export const DiceCup: React.FC<Props> = ({ onReveal, onRevealComplete, revealing }) => {
  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y <= -LIFT_THRESHOLD_PX) onReveal();
  };

  // Keyboard alternative to the drag gesture
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (revealing || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    onReveal();
  };

  return (
    // A native drag (e.g. of a text selection covering the cup) would cancel the pointer gesture
    <div className="flex flex-col items-center gap-3" onDragStart={e => e.preventDefault()}>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={
          revealing
            // opacity must stay in the target: a key dropped from `animate` is animated
            // back to `initial` separately, firing onAnimationComplete a second time.
            ? { y: -240, rotate: -15, scale: 1.1, opacity: 1 }
            : { y: 0, opacity: 1 }
        }
        transition={
          revealing
            ? { duration: 0.55, ease: [0.2, 0, 0.4, 1] }
            : { duration: 0.3, ease: 'easeOut' }
        }
        onAnimationComplete={() => {
          if (revealing) onRevealComplete();
        }}
        // Keep `drag` constant: toggling it off mid-life leaves a registration with the
        // parent AnimatePresence that never completes, so the cup is never removed.
        drag="y"
        dragListener={!revealing}
        dragConstraints={{ top: -MAX_DRAG_PX, bottom: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        // Released below the threshold, the cup drops back onto the table.
        // No whileDrag: its reset animation would fire onAnimationComplete mid-lift.
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        role="button"
        tabIndex={revealing ? -1 : 0}
        aria-label="Becher heben"
        onKeyDown={handleKeyDown}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pub-foam"
        style={{ borderRadius: 16, touchAction: 'none', cursor: revealing ? 'default' : 'grab' }}
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

      {!revealing && (
        <p className="text-pub-foam/75 text-sm select-none">Becher nach oben ziehen zum Heben</p>
      )}
    </div>
  );
};
