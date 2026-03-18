import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AvatarPicker } from '../components/AvatarPicker';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { useGame } from '../context/GameContext';

const SAVED_NAME_KEY = 'onemore_username';
const SAVED_AVATAR_KEY = 'onemore_avatar';

export const SetupScreen: React.FC = () => {
  const { goTo } = useGame();
  const [username, setUsername] = useState(() => localStorage.getItem(SAVED_NAME_KEY) ?? '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem(SAVED_AVATAR_KEY) ?? 'avatar_beer');
  const [error, setError] = useState('');

  const validate = (name: string) => {
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (name.trim().length > 32) return 'Name must be 32 characters or less.';
    if (!/^[A-Za-z0-9_\- ]+$/.test(name.trim())) return 'Only letters, numbers, spaces, - and _ are allowed.';
    return '';
  };

  const proceed = () => {
    const err = validate(username);
    if (err) { setError(err); return; }
    localStorage.setItem(SAVED_NAME_KEY, username.trim());
    localStorage.setItem(SAVED_AVATAR_KEY, avatar);
    goTo('home');
  };

  return (
    <div className="app-bg min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            One<span className="text-amber-400">More</span>
          </h1>
          <p className="text-slate-400 mt-1">Set up your drinking persona</p>
        </div>

        <div className="glass rounded-3xl p-6 space-y-6">
          {/* Avatar preview + name row */}
          <div className="flex items-center gap-4">
            <AvatarDisplay avatarId={avatar} size="xl" showRing />
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Your name
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && proceed()}
                placeholder="e.g. Drunk Wizard"
                maxLength={32}
                className={`
                  w-full bg-white/10 border rounded-xl px-3 py-2.5 text-white placeholder-slate-500
                  focus:border-amber-400/50 focus:bg-white/15 transition-all text-sm font-medium
                  ${error ? 'border-red-500/50' : 'border-white/15'}
                `}
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
          </div>

          {/* Avatar picker */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Pick your avatar
            </label>
            <AvatarPicker selected={avatar} onChange={setAvatar} />
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={proceed}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            Ready to drink! 🍻
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
