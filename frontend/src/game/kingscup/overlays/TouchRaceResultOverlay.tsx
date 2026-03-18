import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  loserUsername: string;
  isMe: boolean;
  onDismiss: () => void;
}

export const TouchRaceResultOverlay: React.FC<Props> = ({ loserUsername, isMe, onDismiss }) => {
  const { t } = useLocale();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
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
        {isMe ? t.kingsCup.tooSlow : t.kingsCup.raceOver}
      </h2>
      <p className={`text-xl font-bold ${isMe ? 'text-red-200' : 'text-amber-400'}`}>
        {isMe ? t.kingsCup.youDrink : t.kingsCup.loserDrinks(loserUsername)}
      </p>
      <p className="text-slate-400 text-sm mt-8">{t.kingsCup.tapToDismiss}</p>
    </motion.div>
  );
};
