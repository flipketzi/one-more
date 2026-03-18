import React from 'react';
import { PlayerSummary } from '../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface Props {
  players: PlayerSummary[];
  currentDrawerPlayerId: string;
  myPlayerId: string;
  drinkingBuddies: Record<string, string>;
  thumbQueenId: string | null;
  selectable?: boolean;
  onSelect?: (playerId: string) => void;
  excludeIds?: string[];
}

export const PlayerStrip: React.FC<Props> = ({
  players,
  currentDrawerPlayerId,
  myPlayerId,
  drinkingBuddies,
  thumbQueenId,
  selectable = false,
  onSelect,
  excludeIds = [],
}) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 px-1">
      {players.map(p => {
        const isDrawer = p.id === currentDrawerPlayerId;
        const isMe = p.id === myPlayerId;
        const isExcluded = excludeIds.includes(p.id);
        const buddyId = drinkingBuddies[p.id];
        const isThumbQueen = p.id === thumbQueenId;

        return (
          <button
            key={p.id}
            disabled={!selectable || isExcluded}
            onClick={() => selectable && !isExcluded && onSelect?.(p.id)}
            className={`
              flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-all
              ${selectable && !isExcluded ? 'hover:bg-white/10 active:scale-95 cursor-pointer' : 'cursor-default'}
              ${isExcluded ? 'opacity-40' : ''}
            `}
          >
            <div className="relative">
              <AvatarDisplay avatarId={p.avatar} size="md" showRing={isDrawer} />
              {isThumbQueen && (
                <span className="absolute -top-1 -right-1 text-xs">👑</span>
              )}
              {buddyId && (
                <span className="absolute -bottom-1 -right-1 text-xs">🤝</span>
              )}
            </div>
            <span className={`text-xs font-medium truncate max-w-[56px] ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
              {isMe ? 'You' : p.username}
            </span>
          </button>
        );
      })}
    </div>
  );
};
