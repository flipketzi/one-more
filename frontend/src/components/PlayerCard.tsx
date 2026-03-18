import React from 'react';
import { PlayerInfo } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { motion } from 'framer-motion';

interface Props {
  player: PlayerInfo;
  isCurrentPlayer: boolean;
  isHost: boolean;
  canKick: boolean;
  onKick?: () => void;
}

export const PlayerCard: React.FC<Props> = ({ player, isCurrentPlayer, isHost, canKick, onKick }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] group"
    >
      <AvatarDisplay avatarId={player.avatar} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{player.username}</span>
          {isCurrentPlayer && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
              You
            </span>
          )}
          {player.role === 'HOST' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 border border-purple-400/30 uppercase tracking-wide">
              👑 Host
            </span>
          )}
        </div>
        {isHost && !isCurrentPlayer && (
          <p className="text-xs text-slate-500">Ready to play</p>
        )}
      </div>

      {canKick && (
        <button
          onClick={onKick}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40"
        >
          Kick
        </button>
      )}
    </motion.div>
  );
};
