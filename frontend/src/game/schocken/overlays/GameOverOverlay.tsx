import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { PublicPlayerState } from '../types';

interface Props {
  loserPlayerId: string;
  players: PublicPlayerState[];
}

export const GameOverOverlay: React.FC<Props> = ({ loserPlayerId, players }) => {
  const { goTo } = useGame();
  const loser = players.find(p => p.id === loserPlayerId);

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
        🍺
      </motion.div>
      <h1 className="text-white font-black text-4xl mb-3">Spiel vorbei!</h1>
      <p className="text-slate-400 text-center mb-2 max-w-xs text-lg">
        {loser ? `${loser.username} trinkt alles!` : 'Das Spiel ist vorbei.'}
      </p>
      <p className="text-slate-500 text-center mb-8 text-sm">
        {loser ? `${loser.lids} Deckel` : ''}
      </p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => goTo('lobby')}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-lg"
      >
        Zurück zur Lobby
      </motion.button>
    </motion.div>
  );
};
