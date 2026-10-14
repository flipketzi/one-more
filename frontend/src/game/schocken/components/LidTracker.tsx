import React from 'react';
import { PublicPlayerState } from '../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface Props {
  playerOrder: PublicPlayerState[];
  lidStack: number;
  currentPlayerIdx: number;
}

function handBadgeColor(rank: number): string {
  if (rank >= 9000) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
  if (rank >= 8000) return 'bg-violet-500/20 border-violet-500/50 text-violet-300';
  if (rank >= 7100) return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  return 'bg-slate-500/20 border-slate-500/30 text-slate-300';
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
          // Without lids a player is only out once the central stack is empty
          const isEliminated = lidStack === 0 && player.lids === 0 && idx !== currentPlayerIdx;
          const keptCount = player.dice?.filter(d => d.kept).length ?? 0;

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
                {player.lids} Deckel
              </span>

              {/* Status badge */}
              {player.revealed && player.hand && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${handBadgeColor(player.hand.rank)}`}>
                  {player.hand.name}
                </span>
              )}
              {(player.standing || player.closed) && !player.revealed && (
                <span className="text-xs text-slate-500">
                  {keptCount > 0 ? `🎲×${keptCount}` : '🫙'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
