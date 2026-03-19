import React from 'react';
import { motion } from 'framer-motion';
import { Die } from '../types';

// Pip positions as [row, col] (1-indexed in a 3x3 grid)
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 3], [3, 1]],
  3: [[1, 3], [2, 2], [3, 1]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

interface SingleDieProps {
  die: Die;
  rolling: boolean;
  canToggle: boolean;
  onToggle: () => void;
}

const SingleDie: React.FC<SingleDieProps> = ({ die, rolling, canToggle, onToggle }) => {
  const pips = PIP_POSITIONS[die.value] ?? [];

  return (
    <motion.button
      onClick={canToggle ? onToggle : undefined}
      style={{ cursor: canToggle ? 'pointer' : 'default' }}
      animate={
        rolling
          ? {
              rotateX: [0, 180, 360, 180, 0],
              rotateY: [0, 90, 180, 270, 360],
              filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'],
            }
          : die.kept
          ? { y: 8, opacity: 0.65 }
          : { y: 0, opacity: 1 }
      }
      transition={
        rolling
          ? { duration: 0.6, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      className="relative w-16 h-16 rounded-2xl bg-white border-2 border-white/20 shadow-xl"
      style={{
        boxShadow: die.kept && !rolling
          ? '0 0 0 2px #f59e0b, 0 0 12px 2px #f59e0b66'
          : undefined,
      }}
    >
      {/* 3x3 grid for pips */}
      <div
        className="absolute inset-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        }}
      >
        {pips.map(([row, col], i) => (
          <div
            key={i}
            style={{ gridRow: row, gridColumn: col }}
            className="flex items-center justify-center"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          </div>
        ))}
      </div>
    </motion.button>
  );
};

interface Props {
  dice: Die[];
  rolling: boolean;
  canToggle: boolean;
  onToggle: (id: number) => void;
}

export const DiceDisplay: React.FC<Props> = ({ dice, rolling, canToggle, onToggle }) => {
  return (
    <div className="flex gap-4 justify-center items-center">
      {dice.map(die => (
        <SingleDie
          key={die.id}
          die={die}
          rolling={rolling}
          canToggle={canToggle && !rolling}
          onToggle={() => onToggle(die.id)}
        />
      ))}
    </div>
  );
};
