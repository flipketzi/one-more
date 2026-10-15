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

/** Pips of one die face on a 3x3 grid; place inside a relatively positioned die body. */
export const DiePips: React.FC<{ value: number }> = ({ value }) => {
  const pips = PIP_POSITIONS[value] ?? [];

  return (
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
          <div className="w-2.5 h-2.5 rounded-full bg-pub-wood" />
        </div>
      ))}
    </div>
  );
};

interface SingleDieProps {
  die: Die;
  rolling: boolean;
  canToggle: boolean;
  onToggle: () => void;
}

const SingleDie: React.FC<SingleDieProps> = ({ die, rolling, canToggle, onToggle }) => {
  return (
    <motion.button
      aria-label={`Würfel ${die.value}`}
      onClick={canToggle ? onToggle : undefined}
      style={{ cursor: canToggle ? 'pointer' : 'default' }}
      animate={
        rolling
          ? {
              rotateX: [0, 180, 360, 180, 0],
              rotateY: [0, 90, 180, 270, 360],
              filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'],
              opacity: [1, 0.5, 0],
            }
          : { y: 0, opacity: 1 }
      }
      transition={
        rolling
          ? { duration: 0.6, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      className="relative w-16 h-16 rounded-xl bg-pub-foam shadow-[0_3px_0_rgba(0,0,0,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pub-beer"
    >
      <DiePips value={die.value} />
    </motion.button>
  );
};

interface KeptDieProps {
  die: Die;
  canToggle: boolean;
  onToggle: () => void;
}

const KeptDie: React.FC<KeptDieProps> = ({ die, canToggle, onToggle }) => {
  return (
    <motion.button
      aria-label={`Würfel ${die.value}, beiseitegelegt`}
      onClick={canToggle ? onToggle : undefined}
      style={{
        cursor: canToggle ? 'pointer' : 'default',
        boxShadow: '0 0 0 3px #E8A93B',
      }}
      animate={{ rotate: -12, scale: 0.85 }}
      transition={{ duration: 0.25 }}
      className="relative w-16 h-16 rounded-xl bg-pub-foam focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pub-foam"
    >
      <DiePips value={die.value} />
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
  const activeDice = dice.filter(d => !d.kept);
  const keptDice = dice.filter(d => d.kept);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Active dice — participate in rolling animation */}
      <div className="flex gap-4 justify-center items-center min-h-[4rem]">
        {activeDice.map(die => (
          <SingleDie
            key={die.id}
            die={die}
            rolling={rolling}
            canToggle={canToggle && !rolling}
            onToggle={() => onToggle(die.id)}
          />
        ))}
      </div>

      {/* Kept dice — set aside on the tray's edge, no rolling */}
      {keptDice.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-3 border-t border-dashed border-pub-foam/25">
          <span className="text-pub-foam/75 text-sm">
            Beiseitegelegt
          </span>
          <div className="flex gap-4 justify-center items-center">
            {keptDice.map(die => (
              <KeptDie
                key={die.id}
                die={die}
                canToggle={canToggle && !rolling}
                onToggle={() => onToggle(die.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
