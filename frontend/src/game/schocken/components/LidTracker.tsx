import React from 'react';
import { PublicPlayerState } from '../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { getBadgeClass } from './HandLabel';

interface Props {
  playerOrder: PublicPlayerState[];
  lidStack: number;
  currentPlayerIdx: number;
}

/** The central stack drawn as a beer coaster with its printed ring. */
const CoasterStack: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex flex-col items-center gap-1 shrink-0">
    <div className="w-14 h-14 rounded-full bg-pub-foam flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.35)]">
      <div className="w-11 h-11 rounded-full border-2 border-pub-leather/40 flex items-center justify-center">
        <span className="font-pub font-extrabold text-2xl leading-none text-pub-wood">{count}</span>
      </div>
    </div>
    <span className="text-pub-ash text-xs">Stapel</span>
  </div>
);

export const LidTracker: React.FC<Props> = ({ playerOrder, lidStack, currentPlayerIdx }) => (
  <div className="px-4 py-3 bg-pub-plank overflow-x-auto">
    <div className="flex items-start gap-4 min-w-max">
      <CoasterStack count={lidStack} />

      {playerOrder.map((player, idx) => {
        const isActive = idx === currentPlayerIdx;
        // Without lids a player is only out once the central stack is empty
        const isEliminated = lidStack === 0 && player.lids === 0 && idx !== currentPlayerIdx;
        const keptCount = player.dice?.filter(d => d.kept).length ?? 0;

        return (
          <div
            key={player.id}
            aria-current={isActive ? 'true' : undefined}
            className={`flex flex-col items-center gap-1 w-16 pb-1.5 border-b-[3px] ${
              isActive ? 'border-pub-beer' : 'border-transparent'
            } ${isEliminated ? 'opacity-40' : ''}`}
          >
            <AvatarDisplay avatarId={player.avatar} size="sm" />
            <span className={`text-sm truncate max-w-full ${isActive ? 'text-pub-foam font-semibold' : 'text-pub-ash'}`}>
              {player.username}
            </span>
            <span className="font-pub font-bold text-base leading-none text-pub-foam">
              {player.lids} Deckel
            </span>

            {player.revealed && player.hand && (
              <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded-full border font-semibold whitespace-nowrap ${getBadgeClass(player.hand.rank)}`}>
                {player.hand.name}
              </span>
            )}
            {(player.standing || player.closed) && !player.revealed && (
              <span className="text-xs text-pub-ash">
                {keptCount > 0 ? `${keptCount} raus` : 'Becher zu'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
