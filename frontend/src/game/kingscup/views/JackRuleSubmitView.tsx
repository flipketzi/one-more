import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { submitJackRule } from '../api/kingsCupClient';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  sessionCode: string;
  isMyTurn: boolean;
}

export const JackRuleSubmitView: React.FC<Props> = ({ sessionCode, isMyTurn }) => {
  const { t } = useLocale();
  const [ruleText, setRuleText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading || !ruleText.trim()) return;
    setLoading(true);
    try {
      await submitJackRule(sessionCode, ruleText.trim());
      setRuleText('');
    } finally {
      setLoading(false);
    }
  };

  if (!isMyTurn) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-sm">{t.kingsCup.drawerMakingRule}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <p className="text-slate-300 text-sm text-center">{t.kingsCup.createRule}</p>
      <textarea
        value={ruleText}
        onChange={e => setRuleText(e.target.value)}
        maxLength={120}
        rows={3}
        placeholder={t.kingsCup.rulePlaceholder}
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-400 resize-none"
        autoFocus
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{ruleText.length}/120</span>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          disabled={loading || !ruleText.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold disabled:opacity-50"
        >
          {loading ? '…' : t.kingsCup.setRule}
        </motion.button>
      </div>
    </div>
  );
};
