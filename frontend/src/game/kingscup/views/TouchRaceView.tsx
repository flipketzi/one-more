import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { registerTouch } from '../api/kingsCupClient';
import { TouchRaceStateDto } from '../types';
import { useLocale } from '../../../context/LocaleContext';

interface Props {
  sessionCode: string;
  touchRace: TouchRaceStateDto;
  myPlayerId: string;
}

export const TouchRaceView: React.FC<Props> = ({ sessionCode, touchRace, myPlayerId }) => {
  const { t } = useLocale();
  const [countdown, setCountdown] = useState(touchRace.windowSeconds);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEligible = touchRace.eligiblePlayerIds.includes(myPlayerId);
  const alreadyTouched = touchRace.touchedPlayerIds.includes(myPlayerId);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleTouch = async () => {
    if (loading || touched || alreadyTouched) return;
    setLoading(true);
    setTouched(true);
    try {
      await registerTouch(sessionCode, touchRace.raceId);
    } catch {
      setTouched(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isEligible) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-sm">{t.kingsCup.watchRace}</p>
        <p className="text-slate-500 text-xs mt-1">{t.kingsCup.secondsRemaining(countdown)}</p>
      </div>
    );
  }

  if (touched || alreadyTouched) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-2">✅</div>
        <p className="text-emerald-400 font-bold">{t.kingsCup.youTouched}</p>
        <p className="text-slate-400 text-xs mt-1">{t.kingsCup.secondsRemaining(countdown)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white font-bold text-lg">{t.kingsCup.touchButton}</p>
      <p className="text-slate-400 text-sm">{t.kingsCup.secondsRemaining(countdown)}</p>
      <motion.button
        animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 20px rgba(249,115,22,0.3)', '0 0 40px rgba(249,115,22,0.6)', '0 0 20px rgba(249,115,22,0.3)'] }}
        transition={{ duration: 1, repeat: Infinity }}
        whileTap={{ scale: 0.9 }}
        onClick={handleTouch}
        disabled={loading}
        className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-5xl shadow-2xl border-4 border-orange-400/50 active:scale-90"
      >
        👇
      </motion.button>
      <p className="text-slate-400 text-xs">
        {t.kingsCup.playersTouched(touchRace.touchedPlayerIds.length, touchRace.eligiblePlayerIds.length)}
      </p>
    </div>
  );
};
