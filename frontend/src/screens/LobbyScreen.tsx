import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useLocale } from '../context/LocaleContext';
import { useLobbyWebSocket } from '../hooks/useLobbyWebSocket';
import { PlayerCard } from '../components/PlayerCard';
import { LanguageSelector } from '../components/LanguageSelector';
import { leaveSession, selectGame, kickPlayer, startGame, getSession } from '../api/client';
import { GAMES, GameType } from '../types';

export const LobbyScreen: React.FC = () => {
  const { session, player, token, goTo, updateSession, setSession, clearSession, notify } = useGame();
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useLobbyWebSocket(session?.code ?? null, token);

  useEffect(() => {
    if (!session?.code) return;
    getSession(session.code).then(setSession).catch(() => {/* session might have ended */});
  }, [session?.code]);

  if (!session || !player) return null;

  const isHost = player.id === session.hostId;
  const activePlayers = session.players.filter(p => p.status === 'ACTIVE');
  const canStart = isHost && session.gameType !== null && activePlayers.length >= 2;

  const copyCode = async () => {
    await navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    try {
      await leaveSession(session.code);
    } catch { /* ignore, might already be gone */ }
    clearSession();
    goTo('home');
  };

  const handleSelectGame = async (gameType: GameType) => {
    try {
      await selectGame(session.code, gameType);
      updateSession(prev => ({ ...prev, gameType }));
    } catch {
      notify(t.lobby.errorSelect, 'error');
    }
  };

  const handleKick = async (playerId: string) => {
    try {
      await kickPlayer(session.code, playerId);
    } catch {
      notify(t.lobby.errorKick, 'error');
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await startGame(session.code);
    } catch {
      notify(t.lobby.errorStart, 'error');
      setStarting(false);
    }
  };

  const selectedGame = GAMES.find(g => g.id === session.gameType);

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 glass border-b border-white/5">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{t.lobby.sessionCode}</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 group"
            title="Copy code"
          >
            <span className="font-code text-2xl font-black text-amber-400 tracking-widest">
              {session.code}
            </span>
            <span className="text-slate-500 group-hover:text-amber-400 transition-colors text-sm">
              {copied ? '✓' : '📋'}
            </span>
          </button>
          {copied && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-amber-400/70"
            >
              {t.lobby.copied}
            </motion.p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={handleLeave}
            className="px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            {t.lobby.leave}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

          {/* Status banner */}
          {session.status === 'WAITING' && activePlayers.length < 2 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-2xl p-3 text-center border border-amber-500/10"
            >
              <p className="text-amber-300/70 text-sm">
                {t.lobby.shareCodeBefore}{' '}
                <strong className="text-amber-300">{session.code}</strong>{' '}
                {t.lobby.shareCodeAfter}
              </p>
            </motion.div>
          )}

          {/* Players */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.lobby.players}
              </h2>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {activePlayers.length}/{session.maxPlayers ?? 12}
              </span>
            </div>

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {activePlayers.map(p => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    isCurrentPlayer={p.id === player.id}
                    isHost={isHost}
                    canKick={isHost && p.id !== player.id}
                    onKick={() => handleKick(p.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Game selection */}
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {isHost ? t.lobby.chooseGame : t.lobby.game}
            </h2>

            {isHost ? (
              <div className="space-y-2">
                {GAMES.map(game => {
                  const isSelected = session.gameType === game.id;
                  const gameT = t.games[game.id];
                  return (
                    <motion.button
                      key={game.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectGame(game.id)}
                      className={`
                        w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all
                        bg-gradient-to-r ${game.bg}
                        ${isSelected
                          ? `${game.border} shadow-lg`
                          : 'border-white/8 hover:border-white/15'
                        }
                      `}
                    >
                      <span className="text-3xl">{game.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{gameT.name}</p>
                        <p className="text-xs text-slate-400 leading-snug">{gameT.tagline}</p>
                      </div>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-black font-bold text-xs flex-shrink-0"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className={`
                glass rounded-2xl p-5 border text-center
                ${selectedGame ? `bg-gradient-to-r ${selectedGame.bg} ${selectedGame.border}` : 'border-white/8'}
              `}>
                {selectedGame ? (
                  <>
                    <div className="text-4xl mb-2">{selectedGame.emoji}</div>
                    <p className="font-bold text-white text-lg">{t.games[selectedGame.id].name}</p>
                    <p className="text-slate-400 text-xs mt-1">{t.games[selectedGame.id].tagline}</p>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                      🍺
                    </motion.span>
                    <p className="text-sm">{t.lobby.waitingForHostGame}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Start button (host only) */}
          {isHost && (
            <motion.div layout>
              <motion.button
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
                onClick={handleStart}
                disabled={!canStart || starting}
                className={`
                  w-full py-5 rounded-2xl font-bold text-lg transition-all
                  ${canStart
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                    : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                  }
                `}
              >
                {starting ? (
                  <span className="animate-pulse">{t.lobby.starting}</span>
                ) : !session.gameType ? (
                  t.lobby.pickFirst
                ) : activePlayers.length < 2 ? (
                  t.lobby.needMorePlayers
                ) : (
                  t.lobby.start
                )}
              </motion.button>

              {!canStart && (
                <p className="text-center text-slate-600 text-xs mt-2">
                  {!session.gameType
                    ? t.lobby.selectToUnlock
                    : t.lobby.waitingForMore}
                </p>
              )}
            </motion.div>
          )}

          {/* Non-host waiting message */}
          {!isHost && session.gameType && (
            <div className="text-center py-2">
              <p className="text-slate-500 text-sm animate-pulse-slow">
                {t.lobby.waitingForStart}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
