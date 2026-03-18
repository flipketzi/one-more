import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useLocale } from '../context/LocaleContext';
import { createSession } from '../api/client';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { CreateSessionResponse } from '../types';

const SAVED_NAME_KEY = 'onemore_username';
const SAVED_AVATAR_KEY = 'onemore_avatar';

export const HomeScreen: React.FC = () => {
  const { goTo, setAuth, setSession, notify } = useGame();
  const { t } = useLocale();
  const [hosting, setHosting] = useState(false);

  const username = localStorage.getItem(SAVED_NAME_KEY) ?? 'Guest';
  const avatar = localStorage.getItem(SAVED_AVATAR_KEY) ?? 'avatar_beer';

  const handleHost = async () => {
    setHosting(true);
    try {
      const res: CreateSessionResponse = await createSession(username, avatar);
      setAuth(res.token, res.player);
      setSession({
        code: res.sessionCode,
        status: 'WAITING',
        gameType: null,
        hostId: res.player.id,
        players: [res.player],
      });
      goTo('lobby');
    } catch {
      notify(t.home.errorCreate, 'error');
    } finally {
      setHosting(false);
    }
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col items-center justify-center p-4 gap-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-5xl font-black tracking-tight">
          One<span className="text-amber-400">More</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">{t.home.tagline}</p>
      </motion.div>

      {/* Player card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl px-5 py-4 flex items-center gap-4 w-full max-w-sm"
      >
        <AvatarDisplay avatarId={avatar} size="lg" showRing />
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.home.playingAs}</p>
          <p className="text-white font-bold text-lg leading-tight">{username}</p>
        </div>
        <button
          onClick={() => goTo('setup')}
          className="ml-auto text-xs text-slate-500 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          {t.home.edit}
        </button>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleHost}
          disabled={hosting}
          className="
            w-full py-5 rounded-2xl text-black font-bold text-lg
            bg-gradient-to-r from-amber-500 to-amber-400
            shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
            transition-shadow disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-3
          "
        >
          {hosting ? (
            <span className="animate-pulse">{t.home.creating}</span>
          ) : (
            <>
              <span className="text-2xl">🏠</span>
              <div className="text-left">
                <p>{t.home.hostLabel}</p>
                <p className="text-[11px] font-medium opacity-70">{t.home.hostSub}</p>
              </div>
            </>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => goTo('join')}
          className="
            w-full py-5 rounded-2xl font-bold text-lg glass glass-hover
            border border-white/10 hover:border-amber-400/30
            flex items-center justify-center gap-3
          "
        >
          <span className="text-2xl">🔑</span>
          <div className="text-left">
            <p className="text-white">{t.home.joinLabel}</p>
            <p className="text-[11px] font-medium text-slate-400">{t.home.joinSub}</p>
          </div>
        </motion.button>
      </motion.div>

      {/* Footer */}
      <p className="text-slate-700 text-xs text-center absolute bottom-4">
        {t.home.footer}
      </p>
    </div>
  );
};
