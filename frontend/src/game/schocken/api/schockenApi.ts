import { api } from '../../../api/client';

export const rollDice = (code: string, keptDieIds: number[]) =>
  api.post(`/sessions/${code}/schocken/roll`, { keptDieIds }).then(r => r.data);

export const revealHand = (code: string) =>
  api.post(`/sessions/${code}/schocken/reveal`).then(r => r.data);

export const standPlayer = (code: string) =>
  api.post(`/sessions/${code}/schocken/stand`).then(r => r.data);

export const getSchockenState = (code: string) =>
  api.get(`/sessions/${code}/schocken/state`).then(r => r.data);

/** Host only — ends the game for everyone (GAME_ABANDONED moves all clients to the lobby). */
export const returnToLobby = (code: string) =>
  api.post(`/sessions/${code}/return-to-lobby`);
