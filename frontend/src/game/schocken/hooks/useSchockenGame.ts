import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Die, HandResult, PublicPlayerState, RollPhase } from '../types';
import { rollDice, revealHand, standPlayer, getSchockenState } from '../api/schockenApi';
import { useGame } from '../../../context/GameContext';

export interface SchockenGameHook {
  // Local UI state (own dice)
  myDice: Die[];
  myRollIndex: number;
  myHand: HandResult | null;
  myKeptDieIds: number[];
  phase: RollPhase;

  // Public game state (from server)
  playerOrder: PublicPlayerState[];
  currentPlayerIdx: number;
  maxRollsThisRound: number | null;
  lidStack: number;
  playerLids: Record<string, number>;
  gameOver: boolean;
  loserPlayerId: string | null;

  // Actions
  toggleKeep: (dieId: number) => void;
  roll: () => Promise<void>;
  reveal: () => void;
  onRevealComplete: () => Promise<void>;
  stand: () => Promise<void>;
}

export function useSchockenGame(sessionCode: string, playerId: string): SchockenGameHook {
  const { token } = useGame();

  // Local UI state
  const [myDice, setMyDice] = useState<Die[]>([]);
  const [myRollIndex, setMyRollIndex] = useState(0);
  const [myHand, setMyHand] = useState<HandResult | null>(null);
  const [myKeptDieIds, setMyKeptDieIds] = useState<number[]>([]);
  const [phase, setPhase] = useState<RollPhase>('IDLE');

  // Public game state
  const [playerOrder, setPlayerOrder] = useState<PublicPlayerState[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [maxRollsThisRound, setMaxRollsThisRound] = useState<number | null>(null);
  const [lidStack, setLidStack] = useState(13);
  const [playerLids, setPlayerLids] = useState<Record<string, number>>({});
  const [gameOver, setGameOver] = useState(false);
  const [loserPlayerId, setLoserPlayerId] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);

  // Load initial state on mount
  useEffect(() => {
    getSchockenState(sessionCode).then((state) => {
      applyFullState(state);
    }).catch(() => {
      // Game may not have started yet — wait for GAME_STARTED event
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode]);

  function applyFullState(state: {
    myDice: Die[];
    myRollIndex: number;
    playerOrder: PublicPlayerState[];
    currentPlayerIdx: number;
    maxRollsThisRound: number | null;
    lidStack: number;
    playerLids: Record<string, number>;
    gameOver: boolean;
  }) {
    setMyDice(state.myDice);
    setMyRollIndex(state.myRollIndex);
    setPlayerOrder(state.playerOrder);
    setCurrentPlayerIdx(state.currentPlayerIdx);
    setMaxRollsThisRound(state.maxRollsThisRound);
    setLidStack(state.lidStack);
    setPlayerLids(state.playerLids);
    setGameOver(state.gameOver);

    // Restore phase from server state for own player
    const me = state.playerOrder.find(p => p.id === playerId);
    if (me?.revealed || me?.standing) {
      setPhase('FINISHED');
    } else if (state.myRollIndex > 0) {
      setPhase('CUP_UP');
    }
  }

  // WebSocket subscription
  useEffect(() => {
    if (!sessionCode || !token) return;

    const client = new Client({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocketFactory: () => new SockJS(`${window.location.protocol}//${window.location.host}/ws`) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/sessions/${sessionCode}/schocken`, (msg) => {
          const event = JSON.parse(msg.body);
          handleEvent(event);
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, token]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEvent(event: any) {
    switch (event.type as string) {
      case 'GAME_STARTED': {
        setPlayerOrder(event.playerOrder as PublicPlayerState[]);
        setLidStack(event.lidStack as number);
        setPlayerLids(event.playerLids as Record<string, number>);
        setCurrentPlayerIdx(event.currentPlayerIdx as number);
        setMyDice([]);
        setMyRollIndex(0);
        setMyHand(null);
        setMyKeptDieIds([]);
        setPhase('IDLE');
        break;
      }

      case 'PLAYER_ROLLED': {
        const pid = event.playerId as string;
        const rollIndex = event.rollIndex as number;
        setPlayerOrder(prev =>
          prev.map(p => p.id === pid ? { ...p, rollIndex } : p)
        );
        break;
      }

      case 'PLAYER_REVEALED': {
        const pid = event.playerId as string;
        const dice = event.dice as Die[];
        const hand = event.hand as HandResult;
        setPlayerOrder(prev =>
          prev.map(p => p.id === pid ? { ...p, revealed: true, hand, dice } : p)
        );
        if (pid === playerId) {
          setMyHand(hand);
        }
        break;
      }

      case 'PLAYER_STOOD': {
        const pid = event.playerId as string;
        const hand = event.hand as HandResult;
        setPlayerOrder(prev =>
          prev.map(p => p.id === pid ? { ...p, standing: true, hand } : p)
        );
        if (pid === playerId) {
          setMyHand(hand);
        }
        break;
      }

      case 'NEXT_PLAYER': {
        const ci = event.currentPlayerIdx as number;
        const mr = event.maxRollsThisRound as number | null;
        setCurrentPlayerIdx(ci);
        setMaxRollsThisRound(mr ?? null);
        // Reset own phase if it's now our turn again (new round)
        setPlayerOrder(prev => {
          const nextPlayer = prev[ci];
          if (nextPlayer?.id === playerId) {
            setPhase('IDLE');
            setMyDice([]);
            setMyRollIndex(0);
            setMyHand(null);
            setMyKeptDieIds([]);
          }
          return prev;
        });
        break;
      }

      case 'ROUND_ENDED': {
        const ls = event.lidStack as number;
        const pl = event.playerLids as Record<string, number>;
        const activePlayerIds = event.activePlayerIds as string[];
        setLidStack(ls);
        setPlayerLids(pl);
        setPlayerOrder(prev => prev.filter(p => activePlayerIds.includes(p.id)));
        // Reset own state for new round
        setPhase('IDLE');
        setMyDice([]);
        setMyRollIndex(0);
        setMyHand(null);
        setMyKeptDieIds([]);
        break;
      }

      case 'GAME_OVER': {
        setLoserPlayerId(event.loserPlayerId as string);
        setGameOver(true);
        break;
      }
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleKeep = useCallback((dieId: number) => {
    if (phase !== 'CUP_UP') return;
    setMyKeptDieIds(prev =>
      prev.includes(dieId) ? prev.filter(id => id !== dieId) : [...prev, dieId]
    );
    setMyDice(prev =>
      prev.map(d => d.id === dieId ? { ...d, kept: !d.kept } : d)
    );
  }, [phase]);

  const roll = useCallback(async () => {
    setPhase('ROLLING');
    try {
      const result = await rollDice(sessionCode, myKeptDieIds);
      setMyDice(result.dice);
      setMyRollIndex(result.rollIndex);
      setMyKeptDieIds([]);
      // Advance phase after roll animation
      setTimeout(() => setPhase('CUP_DOWN'), 650);
    } catch {
      setPhase(myRollIndex === 0 ? 'IDLE' : 'CUP_UP');
    }
  }, [sessionCode, myKeptDieIds, myRollIndex]);

  const reveal = useCallback(() => {
    setPhase('REVEALING');
  }, []);

  const onRevealComplete = useCallback(async () => {
    try {
      const hand = await revealHand(sessionCode);
      setMyHand(hand);
      setPhase('FINISHED');
    } catch {
      setPhase('CUP_UP');
    }
  }, [sessionCode]);

  const stand = useCallback(async () => {
    try {
      const hand = await standPlayer(sessionCode);
      setMyHand(hand);
      setPhase('FINISHED');
    } catch {
      // stay in CUP_UP
    }
  }, [sessionCode]);

  return {
    myDice,
    myRollIndex,
    myHand,
    myKeptDieIds,
    phase,
    playerOrder,
    currentPlayerIdx,
    maxRollsThisRound,
    lidStack,
    playerLids,
    gameOver,
    loserPlayerId,
    toggleKeep,
    roll,
    reveal,
    onRevealComplete,
    stand,
  };
}
