import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { GAMES } from '../types';

export const GameStartedScreen: React.FC = () => {
  const { startedGameType, clearSession, goTo } = useGame();
  const game = GAMES.find(g => g.id === startedGameType);

  const handleLeave = () => {
    clearSession();
    goTo('home');
  };

  return (
    <div className="app-bg min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center max-w-sm w-full"
      >
        <motion.div
          animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: 3 }}
          className="text-8xl mb-6 block"
        >
          {game?.emoji ?? '🎉'}
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-2">Game On!</h1>
        {game && (
          <p className="text-amber-400 font-bold text-xl mb-2">{game.name}</p>
        )}
        <p className="text-slate-400 mb-8">
          {game?.tagline ?? 'Time to play!'}
        </p>

        <div className="glass rounded-2xl p-5 mb-6 border border-amber-500/10">
          <p className="text-slate-300 text-sm leading-relaxed">
            🚧 <strong className="text-white">Game logic coming soon!</strong><br />
            For now, grab your drinks, gather around, and play by the rules you know. Cheers! 🍻
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLeave}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold"
        >
          Back to Home 🏠
        </motion.button>
      </motion.div>
    </div>
  );
};
