import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  reason: string;
}

export const GameOverOverlay: React.FC<Props> = ({ reason }) => {
  const { clearSession, goTo } = useGame();
  const { t } = useLocale();

  const handleLeave = () => {
    clearSession();
    goTo('home');
  };

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
      <p className="text-slate-400 text-center mb-8 max-w-xs">{reason}</p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLeave}
        className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-lg"
      >
        {t.kingsCup.backToHome}
      </motion.button>
    </motion.div>
  );
};
