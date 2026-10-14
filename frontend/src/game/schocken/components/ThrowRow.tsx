import React from 'react';
import { motion } from 'framer-motion';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { getBadgeClass } from './HandLabel';
import { Die, HandResult, PublicPlayerState } from '../types';

interface Props {
  player: PublicPlayerState | undefined;
  dice: Die[];
  hand: HandResult;
  isLoser: boolean;
  /** Entrance delay in seconds, used to stagger the rows of a list. */
  delayS: number;
}

/** One player's throw as a compact list row: avatar, name, dice values and hand badge. */
export const ThrowRow: React.FC<Props> = ({ player, dice, hand, isLoser, delayS }) => (
  <motion.li
    initial={{ opacity: 0, x: -24 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delayS, type: 'spring', stiffness: 260, damping: 24 }}
    className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
      isLoser ? 'bg-red-500/15 border-red-500/50' : 'bg-white/5 border-white/10'
    }`}
  >
    {player && <AvatarDisplay avatarId={player.avatar} size="sm" />}
    <span className="flex-1 text-white font-bold truncate">{player?.username ?? '?'}</span>
    <div className="flex gap-1">
      {[...dice].sort((a, b) => b.value - a.value).map(d => (
        <span
          key={d.id}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-slate-900 text-sm font-black"
        >
          {d.value}
        </span>
      ))}
    </div>
    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${getBadgeClass(hand.rank)}`}>
      {hand.name}
    </span>
  </motion.li>
);
