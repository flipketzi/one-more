import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { useLocale } from '../../../context/LocaleContext';
import { returnToLobby } from '../api/kingsCupClient';
import { GameOverReason } from '../types';

interface Props {
  reason: GameOverReason | null;
  cupDrinkerUsername: string | null;
}

export const GameOverOverlay: React.FC<Props> = ({ reason, cupDrinkerUsername }) => {
  const { goTo, session, player } = useGame();
  const { t } = useLocale();
  const isHost = session?.hostId === player?.id;

  // The host ends the game server-side so the session can be restarted; everyone
  // still on the game screen follows via GAME_ABANDONED. Guests just leave locally.
  const handleBackToLobby = async () => {
    if (!isHost || !session) {
      goTo('lobby');
      return;
    }
    try {
      await returnToLobby(session.code);
    } catch {
      goTo('lobby');
    }
  };

  const gameOverMessage = (): string | null => {
    if (reason === 'LAST_KING' && cupDrinkerUsername) return t.kingsCup.cupDrinkerDrinks(cupDrinkerUsername);
    if (reason === 'DECK_EMPTY') return t.kingsCup.deckEmpty;
    return null;
  };
  const message = gameOverMessage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-8xl mb-6"
      >
        🎉
      </motion.div>
      <h1 className="text-white font-black text-4xl mb-3">{t.kingsCup.gameOver}</h1>
      {message && <p className="text-slate-400 text-center mb-8 max-w-xs text-lg">{message}</p>}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleBackToLobby}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-lg"
      >
        {t.kingsCup.backToLobby}
      </motion.button>
    </motion.div>
  );
};
