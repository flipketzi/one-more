import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  targetUsername: string;
  assignedByUsername: string;
  isMe: boolean;
  /** A drawer who lost their own rhyme or category round picks themselves */
  isSelfPick: boolean;
  onDismiss: () => void;
}

export const SipNotificationOverlay: React.FC<Props> = ({ targetUsername, assignedByUsername, isMe, isSelfPick, onDismiss }) => {
  const { t } = useLocale();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer ${isMe ? 'bg-red-600/90' : 'bg-slate-900/90'}`}
      onClick={onDismiss}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: 3 }}
        className="text-9xl mb-6"
      >
        🍺
      </motion.div>
      <h1 className="text-white font-black text-5xl mb-3 text-center">
        {isMe ? t.kingsCup.drink : t.kingsCup.loserDrinks(targetUsername)}
      </h1>
      {isMe && !isSelfPick && (
        <p className="text-red-200 text-lg">{t.kingsCup.sipSaysYouDrink(assignedByUsername)}</p>
      )}
      <p className={`text-sm mt-8 ${isMe ? 'text-red-300' : 'text-slate-400'}`}>{t.kingsCup.tapToDismiss}</p>
    </motion.div>
  );
};
