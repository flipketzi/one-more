import React from 'react';
import { PlayerSummary } from '../types';
import { pickTarget } from '../api/kingsCupClient';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface Props {
  sessionCode: string;
  players: PlayerSummary[];
  myPlayerId: string;
  isMyTurn: boolean;
  drinkingBuddies: Record<string, string>;
}

export const BuddyPickView: React.FC<Props> = ({ sessionCode, players, myPlayerId, isMyTurn, drinkingBuddies }) => {
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<string | null>(null);

  const handlePick = async (playerId: string) => {
    if (loading || picked) return;
    setLoading(true);
    setPicked(playerId);
    try {
      await pickTarget(sessionCode, playerId);
    } catch {
      setPicked(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isMyTurn) {
    return (
      <div className="text-center text-slate-400 text-sm py-4">
        The drawer is picking a drinking buddy…
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-slate-300 text-sm text-center mb-3">Pick your drinking buddy:</p>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {players.filter(p => p.id !== myPlayerId).map(p => {
          const currentBuddy = drinkingBuddies[p.id];
          return (
            <button
              key={p.id}
              onClick={() => handlePick(p.id)}
              disabled={loading || !!picked}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all
                ${picked === p.id ? 'border-teal-400 bg-teal-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}
                disabled:opacity-60
              `}
            >
              <AvatarDisplay avatarId={p.avatar} size="sm" />
              <span className="text-white font-medium">{p.username}</span>
              {currentBuddy && <span className="ml-auto text-slate-400 text-xs">has buddy</span>}
              {picked === p.id && <span className="ml-auto text-teal-400">🤝</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
