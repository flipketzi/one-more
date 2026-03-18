import axios from 'axios';
import { GameType } from '../types';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const createSession = (username: string, avatar: string) =>
  api.post('/sessions', { username, avatar }).then(r => r.data);

export const joinSession = (code: string, username: string, avatar: string) =>
  api.post(`/sessions/${code}/join`, { username, avatar }).then(r => r.data);

export const leaveSession = (code: string) =>
  api.delete(`/sessions/${code}/players/me`);

export const getSession = (code: string) =>
  api.get(`/sessions/${code}`).then(r => r.data);

export const selectGame = (code: string, gameType: GameType) =>
  api.patch(`/sessions/${code}/game`, { gameType }).then(r => r.data);

export const kickPlayer = (code: string, playerId: string) =>
  api.delete(`/sessions/${code}/players/${playerId}`);

export const startGame = (code: string) =>
  api.post(`/sessions/${code}/start`).then(r => r.data);
