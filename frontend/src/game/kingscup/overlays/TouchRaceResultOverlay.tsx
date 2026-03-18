import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  loserUsername: string;
  isMe: boolean;
  onDismiss: () => void;
}

export const TouchRaceResultOverlay: React.FC<Props> = ({ loserUsername, isMe, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer ${isMe ? 'bg-red-600/90' : 'bg-slate-900/90'}`}
      onClick={onDismiss}
    >
      <div className="text-7xl mb-4">{isMe ? '😬' : '🎉'}</div>
      <h2 className="text-white font-black text-3xl mb-2">
        {isMe ? 'Too slow!' : 'Race over!'}
      </h2>
      <p className={`text-xl font-bold ${isMe ? 'text-red-200' : 'text-amber-400'}`}>
        {isMe ? 'You drink!' : `${loserUsername} drinks!`}
      </p>
      <p className="text-slate-400 text-sm mt-8">Tap to dismiss</p>
    </motion.div>
  );
};
