import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';

export const AgeGateScreen: React.FC = () => {
  const { goTo } = useGame();

  const confirm = () => {
    localStorage.setItem('age_verified', 'true');
    goTo('setup');
  };

  return (
    <div className="app-bg min-h-dvh flex items-center justify-center p-4">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['🍺', '🍷', '🥃', '🍹', '🎲', '👑'].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl select-none opacity-10"
            style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass rounded-3xl p-8 max-w-sm w-full text-center relative z-10"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl mb-4 block"
        >
          🍺
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-1 tracking-tight">OneMore</h1>
        <p className="text-amber-400 font-medium text-sm mb-6">Drink responsibly, play hard.</p>

        {/* Age warning */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🔞</span>
            <div>
              <p className="text-red-300 font-bold text-sm mb-1">Adults Only</p>
              <p className="text-red-200/70 text-xs leading-relaxed">
                This app contains drinking games and is intended for people of <strong>legal drinking age</strong> in their country.
              </p>
            </div>
          </div>
        </div>

        {/* Alcohol disclaimer */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <p className="text-amber-200/60 text-xs leading-relaxed">
              The <strong className="text-amber-200/80">excessive consumption of alcohol</strong> is harmful to your health. Please drink in moderation, know your limits, and never drink and drive.
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={confirm}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
        >
          I'm of legal drinking age — Let me in! 🍻
        </motion.button>

        <p className="text-slate-600 text-[11px] mt-4 leading-relaxed">
          By entering, you confirm you are of legal drinking age in your country and accept responsibility for your alcohol consumption.
        </p>
      </motion.div>
    </div>
  );
};
