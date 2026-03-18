import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameEvent, JackRuleDto, KingsCupState, WordSubmissionDto } from '../types';

interface KCLocalState extends KingsCupState {
  isLoading: boolean;
  pendingSipNotification: { targetPlayerId: string; assignedByUsername: string } | null;
  touchRaceResult: { loserPlayerId: string; loserUsername: string } | null;
  wordRoundResult: { loserPlayerId: string; loserUsername: string } | null;
  gameOverReason: string | null;
}

type KCAction =
  | { type: 'LOAD'; payload: KingsCupState }
  | { type: 'CARD_DRAWN'; card: string; drawnByPlayerId: string; phase: KingsCupState['phase'] }
  | { type: 'SIP_ASSIGNED'; targetPlayerId: string; targetUsername: string; assignedByUsername: string }
  | { type: 'BUDDY_ASSIGNED'; player1Id: string; player2Id: string }
  | { type: 'TOUCH_RACE_STARTED'; raceId: string; raceType: string; eligiblePlayerIds: string[]; windowSeconds: number }
  | { type: 'TOUCH_RACE_RESULT'; loserPlayerId: string; loserUsername: string; touchOrder: string[] }
  | { type: 'WORD_ROUND_STARTED'; roundId: string; roundType: string; seedWord: string; firstSpeakerPlayerId: string; firstSpeakerUsername: string }
  | { type: 'WORD_ROUND_TURN'; roundId: string; lastSubmission: WordSubmissionDto | null; nextSpeakerPlayerId: string; nextSpeakerUsername: string }
  | { type: 'WORD_ROUND_RESULT'; loserPlayerId: string; loserUsername: string }
  | { type: 'JACK_RULE_ADDED'; allRules: JackRuleDto[] }
  | { type: 'THUMB_QUEEN_ASSIGNED'; queenPlayerId: string; usesLeft: number }
  | { type: 'KING_DRAWN'; kingsDrawn: number; kingsCupContents: string[] }
  | { type: 'TURN_ADVANCED'; nextDrawerPlayerId: string; cardsRemaining: number }
  | { type: 'GAME_OVER'; reason: string }
  | { type: 'DISMISS_SIP_NOTIFICATION' }
  | { type: 'DISMISS_RACE_RESULT' }
  | { type: 'DISMISS_WORD_RESULT' };

const initialState: KCLocalState = {
  isLoading: true,
  phase: 'WAITING_TO_DRAW',
  currentDrawerPlayerId: '',
  currentCard: null,
  cardsRemaining: 52,
  turnOrder: [],
  drinkingBuddies: {},
  thumbQueenId: null,
  thumbQueenUsesLeft: 0,
  jackRules: [],
  kingsDrawn: 0,
  kingsCupContents: [],
  touchRace: null,
  wordRound: null,
  pendingSipNotification: null,
  touchRaceResult: null,
  wordRoundResult: null,
  gameOverReason: null,
};

function reducer(state: KCLocalState, action: KCAction): KCLocalState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload, isLoading: false };

    case 'CARD_DRAWN':
      return { ...state, currentCard: action.card, phase: action.phase };

    case 'SIP_ASSIGNED':
      return { ...state, pendingSipNotification: { targetPlayerId: action.targetPlayerId, assignedByUsername: action.assignedByUsername } };

    case 'BUDDY_ASSIGNED':
      return {
        ...state,
        drinkingBuddies: {
          ...state.drinkingBuddies,
          [action.player1Id]: action.player2Id,
          [action.player2Id]: action.player1Id,
        },
      };

    case 'TOUCH_RACE_STARTED':
      return {
        ...state,
        phase: 'TOUCH_RACE',
        touchRace: {
          raceId: action.raceId,
          raceType: action.raceType,
          eligiblePlayerIds: action.eligiblePlayerIds,
          touchedPlayerIds: [],
          windowSeconds: action.windowSeconds,
        },
      };

    case 'TOUCH_RACE_RESULT':
      return {
        ...state,
        touchRace: null,
        touchRaceResult: { loserPlayerId: action.loserPlayerId, loserUsername: action.loserUsername },
      };

    case 'WORD_ROUND_STARTED':
      return {
        ...state,
        phase: 'WORD_ROUND',
        wordRound: {
          roundId: action.roundId,
          roundType: action.roundType,
          seedWord: action.seedWord,
          currentSpeakerPlayerId: action.firstSpeakerPlayerId,
          submissions: [],
        },
      };

    case 'WORD_ROUND_TURN': {
      if (!state.wordRound) return state;
      const updatedSubmissions = action.lastSubmission
        ? [...state.wordRound.submissions, action.lastSubmission]
        : state.wordRound.submissions;
      return {
        ...state,
        wordRound: {
          ...state.wordRound,
          currentSpeakerPlayerId: action.nextSpeakerPlayerId,
          submissions: updatedSubmissions,
        },
      };
    }

    case 'WORD_ROUND_RESULT':
      return {
        ...state,
        wordRound: null,
        wordRoundResult: { loserPlayerId: action.loserPlayerId, loserUsername: action.loserUsername },
      };

    case 'JACK_RULE_ADDED':
      return { ...state, jackRules: action.allRules };

    case 'THUMB_QUEEN_ASSIGNED':
      return {
        ...state,
        thumbQueenId: action.queenPlayerId,
        thumbQueenUsesLeft: action.usesLeft,
      };

    case 'KING_DRAWN':
      return { ...state, kingsDrawn: action.kingsDrawn, kingsCupContents: action.kingsCupContents };

    case 'TURN_ADVANCED':
      return {
        ...state,
        phase: 'WAITING_TO_DRAW',
        currentCard: null,
        currentDrawerPlayerId: action.nextDrawerPlayerId,
        cardsRemaining: action.cardsRemaining,
        touchRace: null,
        wordRound: null,
      };

    case 'GAME_OVER':
      return { ...state, phase: 'GAME_OVER', gameOverReason: action.reason };

    case 'DISMISS_SIP_NOTIFICATION':
      return { ...state, pendingSipNotification: null };

    case 'DISMISS_RACE_RESULT':
      return { ...state, touchRaceResult: null };

    case 'DISMISS_WORD_RESULT':
      return { ...state, wordRoundResult: null };

    default:
      return state;
  }
}

interface KingsCupContextValue {
  state: KCLocalState;
  dispatch: React.Dispatch<KCAction>;
  dispatchGameEvent: (event: GameEvent) => void;
}

const KingsCupContext = createContext<KingsCupContextValue | null>(null);

export const KingsCupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatchGameEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'CARD_DRAWN':
        dispatch({ type: 'CARD_DRAWN', card: event.card, drawnByPlayerId: event.drawnByPlayerId, phase: event.phase });
        break;
      case 'SIP_ASSIGNED':
        dispatch({ type: 'SIP_ASSIGNED', targetPlayerId: event.targetPlayerId, targetUsername: event.targetUsername, assignedByUsername: event.assignedByUsername });
        break;
      case 'BUDDY_ASSIGNED':
        dispatch({ type: 'BUDDY_ASSIGNED', player1Id: event.player1Id, player2Id: event.player2Id });
        break;
      case 'TOUCH_RACE_STARTED':
        dispatch({ type: 'TOUCH_RACE_STARTED', raceId: event.raceId, raceType: event.raceType, eligiblePlayerIds: event.eligiblePlayerIds, windowSeconds: event.windowSeconds });
        break;
      case 'TOUCH_RACE_RESULT':
        dispatch({ type: 'TOUCH_RACE_RESULT', loserPlayerId: event.loserPlayerId, loserUsername: event.loserUsername, touchOrder: event.touchOrder });
        break;
      case 'WORD_ROUND_STARTED':
        dispatch({ type: 'WORD_ROUND_STARTED', roundId: event.roundId, roundType: event.roundType, seedWord: event.seedWord, firstSpeakerPlayerId: event.firstSpeakerPlayerId, firstSpeakerUsername: event.firstSpeakerUsername });
        break;
      case 'WORD_ROUND_TURN':
        dispatch({ type: 'WORD_ROUND_TURN', roundId: event.roundId, lastSubmission: event.lastSubmission, nextSpeakerPlayerId: event.nextSpeakerPlayerId, nextSpeakerUsername: event.nextSpeakerUsername });
        break;
      case 'WORD_ROUND_RESULT':
        dispatch({ type: 'WORD_ROUND_RESULT', loserPlayerId: event.loserPlayerId, loserUsername: event.loserUsername });
        break;
      case 'JACK_RULE_ADDED':
        dispatch({ type: 'JACK_RULE_ADDED', allRules: event.allRules });
        break;
      case 'THUMB_QUEEN_ASSIGNED':
        dispatch({ type: 'THUMB_QUEEN_ASSIGNED', queenPlayerId: event.queenPlayerId, usesLeft: event.usesLeft });
        break;
      case 'KING_DRAWN':
        dispatch({ type: 'KING_DRAWN', kingsDrawn: event.kingsDrawn, kingsCupContents: event.kingsCupContents });
        break;
      case 'TURN_ADVANCED':
        dispatch({ type: 'TURN_ADVANCED', nextDrawerPlayerId: event.nextDrawerPlayerId, cardsRemaining: event.cardsRemaining });
        break;
      case 'GAME_OVER':
        dispatch({ type: 'GAME_OVER', reason: event.reason });
        break;
    }
  };

  return (
    <KingsCupContext.Provider value={{ state, dispatch, dispatchGameEvent }}>
      {children}
    </KingsCupContext.Provider>
  );
};

export const useKingsCup = (): KingsCupContextValue => {
  const ctx = useContext(KingsCupContext);
  if (!ctx) throw new Error('useKingsCup must be used within KingsCupProvider');
  return ctx;
};
