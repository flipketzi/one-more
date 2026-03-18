import React, { createContext, useCallback, useContext, useState } from 'react';
import { PlayerInfo, Screen, SessionInfo } from '../types';
import { setAuthToken } from '../api/client';

interface Notification {
  id: number;
  message: string;
  kind: 'info' | 'error' | 'success';
}

interface GameContextValue {
  screen: Screen;
  token: string | null;
  player: PlayerInfo | null;
  session: SessionInfo | null;
  notifications: Notification[];
  startedGameType: string | null;

  goTo: (screen: Screen) => void;
  setAuth: (token: string, player: PlayerInfo) => void;
  setSession: (session: SessionInfo) => void;
  updateSession: (updater: (prev: SessionInfo) => SessionInfo) => void;
  clearSession: () => void;
  notify: (message: string, kind?: Notification['kind']) => void;
  dismissNotification: (id: number) => void;
  setStartedGameType: (gt: string | null) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem('age_verified') ? 'setup' : 'age_gate'
  );
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [session, setSessionState] = useState<SessionInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [startedGameType, setStartedGameType] = useState<string | null>(null);

  const goTo = useCallback((s: Screen) => setScreen(s), []);

  const setAuth = useCallback((t: string, p: PlayerInfo) => {
    setToken(t);
    setPlayer(p);
    setAuthToken(t);
  }, []);

  const setSession = useCallback((s: SessionInfo) => setSessionState(s), []);

  const updateSession = useCallback((updater: (prev: SessionInfo) => SessionInfo) => {
    setSessionState(prev => (prev ? updater(prev) : prev));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setPlayer(null);
    setSessionState(null);
    setAuthToken(null);
  }, []);

  const notify = useCallback((message: string, kind: Notification['kind'] = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, kind }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4500);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <GameContext.Provider value={{
      screen, token, player, session, notifications, startedGameType,
      goTo, setAuth, setSession, updateSession, clearSession,
      notify, dismissNotification, setStartedGameType,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
