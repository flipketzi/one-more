import React from 'react';
import { motion } from 'framer-motion';
import { DiePips } from '../components/DiceDisplay';
import { HandLabel } from '../components/HandLabel';
import { ThrowRow } from '../components/ThrowRow';
import { ROUND_EVALUATION_MS, RoundEvaluation } from '../hooks/useSchockenGame';
import { Die } from '../types';

interface Props {
  evaluation: RoundEvaluation;
  playerId: string;
}

const FIRST_ROW_DELAY_S = 0.3;
const ROW_STAGGER_S = 0.1;

const BigDie: React.FC<{ die: Die }> = ({ die }) => (
  <div
    role="img"
    aria-label={`Würfel ${die.value}`}
    className="relative w-16 h-16 rounded-2xl bg-white border-2 border-white/20 shadow-xl"
  >
    <DiePips value={die.value} />
  </div>
);

/** Shown right after a round ended: everyone sees the throws while the result is "evaluated". */
export const RoundEvaluationOverlay: React.FC<Props> = ({ evaluation, playerId }) => {
  const me = evaluation.players.find(p => p.id === playerId);
  const others = evaluation.players.filter(p => p.id !== playerId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      // Above the reveal-phase overlay (z-50), which fades out underneath
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-8 px-4 py-8 overflow-y-auto"
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent"
          />
          <h2 className="text-white font-black text-2xl">Wertet aus…</h2>
        </div>
        <div
          role="progressbar"
          aria-label="Auswertung"
          className="w-full h-2 rounded-full bg-white/10 overflow-hidden"
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: ROUND_EVALUATION_MS / 1000, ease: 'linear' }}
            className="h-full bg-amber-400"
          />
        </div>
      </div>

      {me?.hand && (
        <motion.section
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">Dein Wurf</p>
          <div className="flex gap-4">
            {[...(me.dice ?? [])].sort((a, b) => b.value - a.value).map(d => (
              <BigDie key={d.id} die={d} />
            ))}
          </div>
          <HandLabel hand={me.hand} />
        </motion.section>
      )}

      {others.length > 0 && (
        <section className="w-full max-w-sm flex flex-col gap-2">
          <p className="text-slate-500 text-xs text-center">Die anderen</p>
          <ul className="flex flex-col gap-2">
            {others.map((p, index) => (
              <ThrowRow
                key={p.id}
                player={p}
                dice={p.dice ?? []}
                hand={p.hand!}
                isLoser={false}
                delayS={FIRST_ROW_DELAY_S + index * ROW_STAGGER_S}
              />
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
};
