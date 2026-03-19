import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SchockenProvider, useSchocken } from '../context/SchockenContext';
import { DiceDisplay } from '../components/DiceDisplay';
import { DiceCup } from '../components/DiceCup';

const SchockenScreenInner: React.FC = () => {
  const { state, dispatch } = useSchocken();
  const { phase, rollIndex, dice } = state;

  // Advance from ROLLING to CUP_DOWN after 600ms
  useEffect(() => {
    if (phase !== 'ROLLING') return;
    const id = setTimeout(() => dispatch({ type: 'ROLL_COMPLETE' }), 650);
    return () => clearTimeout(id);
  }, [phase]);

  const showCup = phase === 'CUP_DOWN' || phase === 'REVEALING';
  const showDice = phase === 'ROLLING' || phase === 'CUP_UP' || phase === 'FINISHED';

  const canToggle = phase === 'CUP_UP' && rollIndex < 3;

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe-top pt-4 pb-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <span className="text-white font-black text-lg">Schocken</span>
        </div>
        {rollIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold"
          >
            Wurf {rollIndex}/3
          </motion.div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6">
        <AnimatePresence mode="wait">
          {showCup && (
            <motion.div
              key="cup"
              initial={{ opacity: 0, y: -80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <DiceCup
                revealing={phase === 'REVEALING'}
                onReveal={() => dispatch({ type: 'START_REVEAL' })}
                onRevealComplete={() => dispatch({ type: 'REVEAL_COMPLETE' })}
              />
            </motion.div>
          )}
          {showDice && (
            <motion.div
              key="dice"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4"
            >
              <DiceDisplay
                dice={dice}
                rolling={phase === 'ROLLING'}
                canToggle={canToggle}
                onToggle={id => dispatch({ type: 'TOGGLE_KEPT', dieId: id })}
              />
              {canToggle && (
                <p className="text-slate-400 text-xs">
                  Tippe auf einen Würfel zum Beiseitelegen
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action area */}
      <div className="px-4 pb-safe-bottom pb-8 pt-4 border-t border-white/10 flex flex-col items-center gap-3">
        {/* Roll button — shown when idle or cup up with rolls remaining */}
        {(phase === 'IDLE' || (phase === 'CUP_UP' && rollIndex < 3)) && (
          <motion.button
            key="roll-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch({ type: 'START_ROLL' })}
            className="w-full max-w-xs py-4 rounded-2xl bg-amber-500 text-slate-900 font-black text-lg shadow-lg"
          >
            {phase === 'IDLE' ? 'Würfeln' : 'Nochmal würfeln'}
          </motion.button>
        )}

        {/* Rolling indicator */}
        {phase === 'ROLLING' && (
          <div className="w-full max-w-xs py-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-lg text-center">
            ...
          </div>
        )}

        {/* After 3rd roll: Alle fertig? (disabled) */}
        {(phase === 'FINISHED' || (phase === 'CUP_UP' && rollIndex >= 3)) && (
          <motion.button
            key="finished-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            disabled
            className="w-full max-w-xs py-4 rounded-2xl glass border border-white/10 text-white/40 font-bold text-lg cursor-not-allowed"
          >
            Alle fertig?
          </motion.button>
        )}
      </div>
    </div>
  );
};

export const SchockenScreen: React.FC = () => (
  <SchockenProvider>
    <SchockenScreenInner />
  </SchockenProvider>
);
