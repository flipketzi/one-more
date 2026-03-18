import { api } from '../../../api/client';
import { KingsCupState } from '../types';

export const getGameState = (code: string): Promise<KingsCupState> =>
  api.get(`/sessions/${code}/game/state`).then(r => r.data);

export const drawCard = (code: string) =>
  api.post(`/sessions/${code}/game/draw`).then(r => r.data);

export const pickTarget = (code: string, targetPlayerId: string) =>
  api.post(`/sessions/${code}/game/pick-target`, { targetPlayerId });

export const registerTouch = (code: string, raceId: string) =>
  api.post(`/sessions/${code}/game/touch`, { raceId });

export const activateQueenButton = (code: string) =>
  api.post(`/sessions/${code}/game/queen-activate`);

export const submitWord = (code: string, word: string | null, passed: boolean) =>
  api.post(`/sessions/${code}/game/word-submit`, { word, passed });

export const submitJackRule = (code: string, ruleText: string) =>
  api.post(`/sessions/${code}/game/submit-rule`, { ruleText });

export const advanceTurn = (code: string) =>
  api.post(`/sessions/${code}/game/advance`);
