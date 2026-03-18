import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useLocale } from '../context/LocaleContext';
import { joinSession } from '../api/client';
import { JoinSessionResponse } from '../types';

const SAVED_NAME_KEY = 'onemore_username';
const SAVED_AVATAR_KEY = 'onemore_avatar';

export const JoinScreen: React.FC = () => {
  const { goTo, setAuth, setSession } = useGame();
  const { t } = useLocale();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const username = localStorage.getItem(SAVED_NAME_KEY) ?? 'Guest';
  const avatar = localStorage.getItem(SAVED_AVATAR_KEY) ?? 'avatar_beer';

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 5) {
      setError(t.join.errorLength);
      return;
    }

    setJoining(true);
    setError('');
    try {
      const res: JoinSessionResponse = await joinSession(trimmed, username, avatar);
      setAuth(res.token, res.player);
      setSession(res.session);
      goTo('lobby');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('not found')) setError(t.join.errorNotFound);
      else if (msg?.includes('full')) setError(t.join.errorFull);
      else if (msg?.includes('taken')) setError(t.join.errorTaken);
      else if (msg?.includes('Too many')) setError(t.join.errorTooMany);
      else setError(t.join.errorGeneral);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="app-bg min-h-dvh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Back */}
        <button
          onClick={() => goTo('home')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm"
        >
          {t.join.back}
        </button>

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h2 className="text-3xl font-black text-white">{t.join.title}</h2>
          <p className="text-slate-400 text-sm mt-1">{t.join.subtitle}</p>
        </div>

        <div className="glass rounded-3xl p-6 space-y-5">
          {/* Code input */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {t.join.codeLabel}
            </label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 5)); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="XKCD9"
              maxLength={5}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className={`
                w-full bg-white/10 border rounded-xl px-4 py-4 text-center text-white
                placeholder-slate-600 focus:bg-white/15 transition-all
                font-code text-3xl font-bold tracking-[0.4em]
                ${error ? 'border-red-500/50' : 'border-white/15 focus:border-amber-400/50'}
              `}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-2 text-center"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Code hint dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i < code.length ? 'bg-amber-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleJoin}
            disabled={joining || code.length !== 5}
            className="
              w-full py-4 rounded-2xl font-bold text-base text-black
              bg-gradient-to-r from-amber-500 to-amber-400
              shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {joining ? t.join.joining : t.join.cta}
          </motion.button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          {t.join.joiningAsBefore} <span className="text-slate-400 font-medium">{username}</span>
        </p>
      </motion.div>
    </div>
  );
};
