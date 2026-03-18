import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CardDeck } from '../util/cardDeck';

interface Props {
  card: string | null;
}

const RANK_COLORS: Record<string, string> = {
  '2': 'from-blue-500 to-blue-700',
  '3': 'from-amber-500 to-amber-700',
  '4': 'from-orange-500 to-orange-700',
  '5': 'from-sky-500 to-sky-700',
  '6': 'from-pink-500 to-pink-700',
  '7': 'from-violet-500 to-violet-700',
  '8': 'from-teal-500 to-teal-700',
  '9': 'from-indigo-500 to-indigo-700',
  '10': 'from-emerald-500 to-emerald-700',
  'J': 'from-purple-500 to-purple-700',
  'Q': 'from-fuchsia-500 to-fuchsia-700',
  'K': 'from-red-500 to-red-700',
  'A': 'from-yellow-400 to-amber-600',
};

const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥', D: '♦', C: '♣', S: '♠',
};

const RED_SUITS = new Set(['H', 'D']);

export const CardDisplay: React.FC<Props> = ({ card }) => {
  const [flipped, setFlipped] = useState(false);
  const [displayCard, setDisplayCard] = useState<string | null>(null);

  useEffect(() => {
    if (card && card !== displayCard) {
      setFlipped(false);
      setTimeout(() => {
        setDisplayCard(card);
        setFlipped(true);
      }, 150);
    } else if (!card) {
      setFlipped(false);
      setDisplayCard(null);
    }
  }, [card]);

  const rank = displayCard ? CardDeck.rank(displayCard) : null;
  const suit = displayCard ? CardDeck.suit(displayCard) : null;
  const suitSymbol = suit ? SUIT_SYMBOLS[suit] : null;
  const isRed = suit ? RED_SUITS.has(suit) : false;
  const gradient = rank ? RANK_COLORS[rank] : 'from-slate-600 to-slate-800';

  return (
    <div className="flex justify-center items-center" style={{ perspective: '1000px' }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: 140, height: 200 }}
      >
        {/* Card back */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
          className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shadow-xl"
        >
          <span className="text-4xl select-none">🃏</span>
        </div>

        {/* Card front */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}
          className={`rounded-2xl bg-gradient-to-br ${gradient} border border-white/20 flex flex-col items-center justify-center shadow-xl`}
        >
          <span className={`text-5xl font-black select-none ${isRed ? 'text-white' : 'text-white'}`}>{rank}</span>
          <span className={`text-3xl select-none mt-1 ${isRed ? 'text-red-200' : 'text-slate-200'}`}>{suitSymbol}</span>
        </div>
      </motion.div>
    </div>
  );
};
