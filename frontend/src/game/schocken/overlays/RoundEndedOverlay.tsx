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
          // Above the reveal-phase overlay (z-50), which lingers while fading out after ROUND_ENDED
          className="fixed inset-x-4 bottom-28 z-[60] mx-auto max-w-sm rounded-xl bg-pub-plank border-l-4 border-pub-ember px-5 py-4 text-pub-foam font-pub-body shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-pub-ash text-sm">Rundenende</p>
            <p className="font-pub font-bold text-2xl leading-tight">
              {roundResult.winnerHandName}
            </p>
            <p className="text-lg mt-1">
              <span className="text-pub-ember font-semibold">{roundResult.loserName}</span>
              {' '}trinkt{' '}
              <span className="font-semibold">{roundResult.lidValue}</span>
              {' '}Deckel
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
