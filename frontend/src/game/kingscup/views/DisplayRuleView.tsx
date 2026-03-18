import React from 'react';
import { motion } from 'framer-motion';
import { advanceTurn } from '../api/kingsCupClient';
import { CARD_RULES } from '../util/cardDeck';

interface Props {
  sessionCode: string;
  currentCard: string | null;
  isMyTurn: boolean;
  kingsDrawn?: number;
  kingsCupContents?: string[];
  thumbQueenUsername?: string;
}

export const DisplayRuleView: React.FC<Props> = ({
  sessionCode,
  currentCard,
  isMyTurn,
  kingsDrawn,
  kingsCupContents,
  thumbQueenUsername,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleDone = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await advanceTurn(sessionCode);
    } finally {
      setLoading(false);
    }
  };

  const rank = currentCard ? currentCard.slice(0, -1) : null;
  const rule = rank ? CARD_RULES[rank] : null;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {rule && (
        <div className="glass rounded-2xl p-5 border border-white/10 w-full text-center">
          <div className="text-4xl mb-2">{rule.emoji}</div>
          <h2 className="text-white font-black text-xl mb-1">{rule.title}</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{rule.description}</p>

          {rank === 'K' && kingsDrawn !== undefined && (
            <div className="mt-3 text-amber-400 font-bold text-sm">
              Kings drawn: {kingsDrawn}/4
              {kingsCupContents && kingsCupContents.length > 0 && (
                <span className="ml-2 text-slate-400">• Cup: {kingsCupContents.join(', ')}</span>
              )}
            </div>
          )}

          {rank === 'Q' && thumbQueenUsername && (
            <div className="mt-3 text-fuchsia-400 font-bold text-sm">
              👑 {thumbQueenUsername} is now the Thumb Queen!
            </div>
          )}
        </div>
      )}

      {isMyTurn && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleDone}
          disabled={loading}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-slate-600 to-slate-500 text-white font-bold disabled:opacity-60"
        >
          {loading ? '…' : 'Done →'}
        </motion.button>
      )}
    </div>
  );
};
