import React from 'react';
import { motion } from 'framer-motion';
import { drawCard } from '../api/kingsCupClient';

interface Props {
  sessionCode: string;
  isMyTurn: boolean;
  drawerUsername: string;
}

export const DrawPhase: React.FC<Props> = ({ sessionCode, isMyTurn, drawerUsername }) => {
  const [loading, setLoading] = React.useState(false);

  const handleDraw = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await drawCard(sessionCode);
    } finally {
      setLoading(false);
    }
  };

  if (isMyTurn) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-slate-300 text-sm">It's your turn!</p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleDraw}
          disabled={loading}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black text-lg shadow-lg disabled:opacity-60"
        >
          {loading ? '…' : 'Draw Card 🃏'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">
        Waiting for <span className="text-white font-semibold">{drawerUsername}</span> to draw…
      </p>
    </div>
  );
};
