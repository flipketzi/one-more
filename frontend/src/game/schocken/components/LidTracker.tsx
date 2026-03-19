import React from 'react';
import { PublicPlayerState } from '../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface Props {
  playerOrder: PublicPlayerState[];
  lidStack: number;
  currentPlayerIdx: number;
}

export const LidTracker: React.FC<Props> = ({ playerOrder, lidStack, currentPlayerIdx }) => {
  return (
    <div className="px-4 py-2 border-b border-white/10 overflow-x-auto">
      <div className="flex items-center gap-3 min-w-max">
        {/* Lid stack */}
        <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <span className="text-slate-400 text-xs">Stapel</span>
          <span className="text-white font-black text-lg leading-none">{lidStack}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/10" />

        {/* Players */}
        {playerOrder.map((player, idx) => {
          const isActive = idx === currentPlayerIdx;
          const isEliminated = player.lids === 0 && idx !== currentPlayerIdx;

          return (
            <div
              key={player.id}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-amber-500/20 border border-amber-500/50'
                  : 'bg-white/5 border border-white/10'
              } ${isEliminated ? 'opacity-40' : ''}`}
            >
              <div className={`rounded-full ring-2 ${isActive ? 'ring-amber-400' : 'ring-white/20'}`}>
                <AvatarDisplay avatarId={player.avatar} size="sm" />
              </div>
              <span className="text-white text-xs font-bold truncate max-w-[56px]">{player.username}</span>
              <span className={`text-xs font-black ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
                {player.lids} {player.lids === 1 ? 'Deckel' : 'Deckel'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
