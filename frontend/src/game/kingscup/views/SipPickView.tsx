import React from 'react';
import { PlayerSummary } from '../types';
import { pickTarget } from '../api/kingsCupClient';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface Props {
  sessionCode: string;
  players: PlayerSummary[];
  myPlayerId: string;
  isMyTurn: boolean;
  category?: string;
}

export const SipPickView: React.FC<Props> = ({ sessionCode, players, myPlayerId, isMyTurn, category }) => {
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
      <div className="flex flex-col gap-3 w-full">
        {category && (
          <div className="glass rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Category</p>
            <p className="text-white font-black text-2xl">{category}</p>
          </div>
        )}
        <p className="text-center text-slate-400 text-sm py-2">
          {category ? 'The drawer is picking who messed up…' : 'The drawer is picking someone to drink…'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {category && (
        <div className="glass rounded-2xl p-4 border border-white/10 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Category</p>
          <p className="text-white font-black text-2xl">{category}</p>
        </div>
      )}
      <p className="text-slate-300 text-sm text-center">{category ? 'Who messed up? They drink:' : 'Pick someone to take a sip:'}</p>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {players.filter(p => p.id !== myPlayerId).map(p => (
          <button
            key={p.id}
            onClick={() => handlePick(p.id)}
            disabled={loading || !!picked}
            className={`
              flex items-center gap-3 p-3 rounded-xl border transition-all
              ${picked === p.id ? 'border-amber-400 bg-amber-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}
              disabled:opacity-60
            `}
          >
            <AvatarDisplay avatarId={p.avatar} size="sm" />
            <span className="text-white font-medium">{p.username}</span>
            {picked === p.id && <span className="ml-auto text-amber-400">🍺</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
