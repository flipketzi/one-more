import React from 'react';
import { PlayerSummary } from '../types';
import { pickTarget } from '../api/kingsCupClient';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  sessionCode: string;
  players: PlayerSummary[];
  myPlayerId: string;
  isMyTurn: boolean;
  pendingWord?: string;
  wordLabel?: string;
  hint?: string;
  includeDrawer?: boolean;
}

export const SipPickView: React.FC<Props> = ({
  sessionCode,
  players,
  myPlayerId,
  isMyTurn,
  pendingWord,
  wordLabel,
  hint,
  includeDrawer = false,
}) => {
  const { t } = useLocale();
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

  const visiblePlayers = includeDrawer ? players : players.filter(p => p.id !== myPlayerId);

  const wordHeader = pendingWord && (
    <div className="glass rounded-2xl p-4 border border-white/10 text-center">
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
        {wordLabel ?? t.kingsCup.wordLabelCategory}
      </p>
      <p className="text-white font-black text-2xl">{pendingWord}</p>
    </div>
  );

  if (!isMyTurn) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {wordHeader}
        {hint && <p className="text-center text-amber-400/80 text-xs italic">{hint}</p>}
        <p className="text-center text-slate-400 text-sm py-2">
          {pendingWord ? t.kingsCup.drawerPickingLost : t.kingsCup.drawerPickingSip}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {wordHeader}
      {hint && <p className="text-center text-amber-400/80 text-xs italic">{hint}</p>}
      <p className="text-slate-300 text-sm text-center">
        {pendingWord ? t.kingsCup.whoLost : t.kingsCup.pickSip}
      </p>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {visiblePlayers.map(p => (
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
            {p.id === myPlayerId && <span className="ml-1 text-xs text-slate-500">(you)</span>}
            {picked === p.id && <span className="ml-auto text-amber-400">🍺</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
