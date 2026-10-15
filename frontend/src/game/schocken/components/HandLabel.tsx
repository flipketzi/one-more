import React from 'react';
import { motion } from 'framer-motion';
import { HandResult } from '../types';

interface Props {
  hand: HandResult;
}

export type HandTier = 'schock' | 'general' | 'strasse' | 'plain';

export function handTier(rank: number): HandTier {
  if (rank >= 9000) return 'schock';
  if (rank >= 8000) return 'general';
  if (rank >= 7100) return 'strasse';
  return 'plain';
}

// Stronger hands get "fuller" badges: beer, foam, felt, then just an outline
const TIER_CLASSES: Record<HandTier, string> = {
  schock: 'bg-pub-beer border-pub-beer text-pub-wood',
  general: 'bg-pub-foam border-pub-foam text-pub-wood',
  strasse: 'bg-pub-felt border-pub-foam/40 text-pub-foam',
  plain: 'bg-transparent border-pub-ash/50 text-pub-foam',
};

export function getBadgeClass(rank: number): string {
  return TIER_CLASSES[handTier(rank)];
}

export const HandLabel: React.FC<Props> = ({ hand }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center gap-1.5"
  >
    <span className="font-pub font-bold text-3xl leading-none text-pub-foam">{hand.name}</span>
    <span
      data-tier={handTier(hand.rank)}
      className={`px-3 py-0.5 rounded-full border text-sm font-semibold ${getBadgeClass(hand.rank)}`}
    >
      {hand.lids === 1 ? '1 Deckel' : `${hand.lids} Deckel`}
    </span>
  </motion.div>
);
