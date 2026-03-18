import React from 'react';
import { motion } from 'framer-motion';
import { activateQueenButton } from '../api/kingsCupClient';

interface Props {
  sessionCode: string;
  usesLeft: number;
}

export const ThumbQueenButton: React.FC<Props> = ({ sessionCode, usesLeft }) => {
  const [loading, setLoading] = React.useState(false);

  const handleActivate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await activateQueenButton(sessionCode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleActivate}
      disabled={loading}
      className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1"
    >
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center shadow-xl border-2 border-fuchsia-400/50">
        <span className="text-2xl">👍</span>
      </div>
      <span className="text-xs text-fuchsia-300 font-bold">{usesLeft} left</span>
    </motion.button>
  );
};
