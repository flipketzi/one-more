import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameProvider, useGame } from './context/GameContext';
import { LocaleProvider } from './context/LocaleContext';
import { AgeGateScreen } from './screens/AgeGateScreen';
import { SetupScreen } from './screens/SetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameStartedScreen } from './screens/GameStartedScreen';
import { KingsCupScreen } from './game/kingscup/screens/KingsCupScreen';

const SCREEN_TRANSITIONS = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -16 },
  transition: { duration: 0.25, ease: 'easeInOut' },
};

const Notifications: React.FC = () => {
  const { notifications, dismissNotification } = useGame();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={`
              glass rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer shadow-xl border
              ${n.kind === 'error'   ? 'border-red-500/30 bg-red-500/10'     : ''}
              ${n.kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' : ''}
              ${n.kind === 'info'    ? 'border-white/10'                     : ''}
            `}
            onClick={() => dismissNotification(n.id)}
          >
            <span className="text-sm leading-snug text-white">{n.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const AppScreens: React.FC = () => {
  const { screen } = useGame();

  return (
    <>
      <Notifications />
      <AnimatePresence mode="wait">
        {screen === 'age_gate'     && <motion.div key="age_gate"     {...SCREEN_TRANSITIONS}><AgeGateScreen /></motion.div>}
        {screen === 'setup'        && <motion.div key="setup"        {...SCREEN_TRANSITIONS}><SetupScreen /></motion.div>}
        {screen === 'home'         && <motion.div key="home"         {...SCREEN_TRANSITIONS}><HomeScreen /></motion.div>}
        {screen === 'join'         && <motion.div key="join"         {...SCREEN_TRANSITIONS}><JoinScreen /></motion.div>}
        {screen === 'lobby'        && <motion.div key="lobby"        {...SCREEN_TRANSITIONS}><LobbyScreen /></motion.div>}
        {screen === 'game_started' && <motion.div key="game_started" {...SCREEN_TRANSITIONS}><GameStartedScreen /></motion.div>}
        {screen === 'kings_cup'   && <motion.div key="kings_cup"   {...SCREEN_TRANSITIONS}><KingsCupScreen /></motion.div>}
      </AnimatePresence>
    </>
  );
};

export const App: React.FC = () => (
  <LocaleProvider>
    <GameProvider>
      <AppScreens />
    </GameProvider>
  </LocaleProvider>
);
