import React from 'react';
import { motion } from 'framer-motion';
import { HandResult } from '../types';

interface Props {
  hand: HandResult;
}

function getBadgeClass(rank: number): string {
  if (rank >= 9000) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
  if (rank >= 8000) return 'bg-violet-500/20 border-violet-500/50 text-violet-300';
  if (rank >= 7100) return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  return 'bg-slate-500/20 border-slate-500/30 text-slate-300';
}

export const HandLabel: React.FC<Props> = ({ hand }) => {
  const badgeClass = getBadgeClass(hand.rank);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-white font-black text-2xl">{hand.name}</span>
      <span className={`px-3 py-1 rounded-full border text-sm font-bold ${badgeClass}`}>
        {hand.lids === 1 ? '1 Deckel' : `${hand.lids} Deckel`}
      </span>
    </motion.div>
  );
};
