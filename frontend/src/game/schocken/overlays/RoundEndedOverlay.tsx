import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RoundResult } from '../hooks/useSchockenGame';

interface Props {
  roundResult: RoundResult | null;
}

export const RoundEndedOverlay: React.FC<Props> = ({ roundResult }) => {
  return (
    <AnimatePresence>
      {roundResult && (
        <motion.div
          key="round-ended"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-x-4 bottom-28 z-40 mx-auto max-w-sm rounded-2xl bg-slate-800/95 border border-white/10 p-5 shadow-2xl backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-slate-400 text-sm font-medium">Rundenende</p>
            <p className="text-white font-black text-xl leading-tight">
              {roundResult.winnerHandName}
            </p>
            <p className="text-slate-300 text-base mt-1">
              <span className="text-amber-400 font-bold">{roundResult.loserName}</span>
              {' '}trinkt{' '}
              <span className="text-amber-400 font-bold">{roundResult.lidValue}</span>
              {' '}{roundResult.lidValue === 1 ? 'Deckel' : 'Deckel'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
