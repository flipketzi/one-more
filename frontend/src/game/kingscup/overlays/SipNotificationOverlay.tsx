import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  assignedByUsername: string;
  onDismiss: () => void;
}

export const SipNotificationOverlay: React.FC<Props> = ({ assignedByUsername, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600/90 cursor-pointer"
      onClick={onDismiss}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: 3 }}
        className="text-9xl mb-6"
      >
        🍺
      </motion.div>
      <h1 className="text-white font-black text-5xl mb-3">DRINK!</h1>
      <p className="text-red-200 text-lg">{assignedByUsername} says you drink!</p>
      <p className="text-red-300 text-sm mt-8">Tap to dismiss</p>
    </motion.div>
  );
};
