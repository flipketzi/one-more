import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JackRuleDto } from '../types';

interface Props {
  rules: JackRuleDto[];
}

export const JackRulesList: React.FC<Props> = ({ rules }) => {
  const [open, setOpen] = useState(false);

  if (rules.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-purple-400 font-semibold hover:text-purple-300 transition-colors"
      >
        📜 {rules.length} rule{rules.length !== 1 ? 's' : ''}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-sm p-5 border border-purple-500/30"
            >
              <h3 className="text-white font-bold text-lg mb-4">🃏 Jack Rules</h3>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {rules.map((rule, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3">
                    <p className="text-white text-sm">{rule.ruleText}</p>
                    <p className="text-slate-400 text-xs mt-1">— {rule.authorUsername}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full py-3 rounded-xl bg-purple-600 text-white font-bold"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
