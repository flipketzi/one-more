import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Die, RollPhase, SchockenState } from '../types';

type SchockenAction =
  | { type: 'START_ROLL' }
  | { type: 'ROLL_COMPLETE' }
  | { type: 'START_REVEAL' }
  | { type: 'REVEAL_COMPLETE' }
  | { type: 'TOGGLE_KEPT'; dieId: number }
  | { type: 'RESET' };

function randomValue(): number {
  return Math.floor(Math.random() * 6) + 1;
}

const initialDice: Die[] = [
  { id: 0, value: 1, kept: false },
  { id: 1, value: 1, kept: false },
  { id: 2, value: 1, kept: false },
];

const initialState: SchockenState = {
  dice: initialDice,
  rollIndex: 0,
  phase: 'IDLE',
};

function reducer(state: SchockenState, action: SchockenAction): SchockenState {
  switch (action.type) {
    case 'START_ROLL': {
      const nextIndex = state.rollIndex + 1;
      const dice = state.dice.map(d =>
        d.kept ? d : { ...d, value: randomValue() }
      );
      return { ...state, dice, rollIndex: nextIndex, phase: 'ROLLING' };
    }

    case 'ROLL_COMPLETE':
      return { ...state, phase: 'CUP_DOWN' };

    case 'START_REVEAL':
      return { ...state, phase: 'REVEALING' };

    case 'REVEAL_COMPLETE': {
      const nextPhase: RollPhase = state.rollIndex >= 3 ? 'FINISHED' : 'CUP_UP';
      return { ...state, phase: nextPhase };
    }

    case 'TOGGLE_KEPT': {
      if (state.phase !== 'CUP_UP' || state.rollIndex >= 3) return state;
      const dice = state.dice.map(d =>
        d.id === action.dieId ? { ...d, kept: !d.kept } : d
      );
      return { ...state, dice };
    }

    case 'RESET':
      return { ...initialState, dice: initialDice.map(d => ({ ...d })) };

    default:
      return state;
  }
}

interface SchockenContextValue {
  state: SchockenState;
  dispatch: React.Dispatch<SchockenAction>;
}

const SchockenContext = createContext<SchockenContextValue | null>(null);

export const SchockenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <SchockenContext.Provider value={{ state, dispatch }}>
      {children}
    </SchockenContext.Provider>
  );
};

export const useSchocken = (): SchockenContextValue => {
  const ctx = useContext(SchockenContext);
  if (!ctx) throw new Error('useSchocken must be used within SchockenProvider');
  return ctx;
};
