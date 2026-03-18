import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { submitWord } from '../api/kingsCupClient';
import { WordRoundStateDto } from '../types';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  sessionCode: string;
  wordRound: WordRoundStateDto;
  myPlayerId: string;
  players: { id: string; username: string }[];
}

export const WordRoundView: React.FC<Props> = ({ sessionCode, wordRound, myPlayerId, players }) => {
  const { t } = useLocale();
  const speakerUsername = players.find(p => p.id === wordRound.currentSpeakerPlayerId)?.username ?? wordRound.currentSpeakerPlayerId;
  const [inputWord, setInputWord] = useState('');
  const [loading, setLoading] = useState(false);

  const isMyTurn = wordRound.currentSpeakerPlayerId === myPlayerId;
  const isRhyme = wordRound.roundType === 'RHYME';

  const handleSubmit = async () => {
    if (loading || !inputWord.trim()) return;
    setLoading(true);
    try {
      await submitWord(sessionCode, inputWord.trim(), false);
      setInputWord('');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await submitWord(sessionCode, null, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="glass rounded-2xl p-4 border border-white/10 text-center">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
          {isRhyme ? t.kingsCup.wordLabelRhyme : t.kingsCup.wordLabelCategory}
        </p>
        <p className="text-white font-black text-2xl">{wordRound.seedWord}</p>
      </div>

      {wordRound.submissions.length > 0 && (
        <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
          {wordRound.submissions.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1 rounded-lg ${s.passed ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-300'}`}>
              <span className="text-xs font-medium">{s.username}:</span>
              <span className="text-sm">{s.passed ? '❌ Pass' : s.word}</span>
            </div>
          ))}
        </div>
      )}

      {isMyTurn ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={inputWord}
              onChange={e => setInputWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={isRhyme ? t.kingsCup.yourRhyme : t.kingsCup.yourAnswer}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-amber-400"
              autoFocus
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSubmit}
              disabled={loading || !inputWord.trim()}
              className="px-4 py-3 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-50"
            >
              ✓
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handlePass}
            disabled={loading}
            className="py-2 rounded-xl border border-red-500/40 text-red-400 font-medium text-sm disabled:opacity-50"
          >
            {t.kingsCup.pass}
          </motion.button>
        </div>
      ) : (
        <p className="text-center text-slate-400 text-sm">
          {t.kingsCup.waitingForSpeakerBefore}{' '}
          <span className="text-white font-semibold">{speakerUsername}</span>…
        </p>
      )}
    </div>
  );
};
