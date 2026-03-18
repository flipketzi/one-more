import React from 'react';
import { AVATARS } from '../types';
import { motion } from 'framer-motion';

interface Props {
  selected: string;
  onChange: (id: string) => void;
}

export const AvatarPicker: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {AVATARS.map((avatar, i) => {
        const isSelected = selected === avatar.id;
        return (
          <motion.button
            key={avatar.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(avatar.id)}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 cursor-pointer
              ${isSelected
                ? `border-amber-400/60 bg-amber-400/10 shadow-lg shadow-amber-400/10`
                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
              }
            `}
          >
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center text-3xl
              bg-gradient-to-br ${avatar.bg}
              ${isSelected ? `ring-2 ${avatar.ring} ring-offset-1 ring-offset-transparent` : ''}
              transition-all duration-200
            `}>
              <span role="img" aria-label={avatar.label} className="select-none leading-none">
                {avatar.emoji}
              </span>
            </div>
            <span className={`text-xs font-medium leading-tight text-center ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
              {avatar.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
