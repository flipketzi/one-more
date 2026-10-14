import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Die, HandResult, PublicPlayerState, RollPhase } from '../types';
import { rollDice, revealHand, standPlayer, getSchockenState } from '../api/schockenApi';
import { useGame } from '../../../context/GameContext';

export interface RoundResult {
  loserName: string;
  winnerHandName: string;
  lidValue: number;
}

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
  roundResult: RoundResult | null;

  // Reveal phase state
  gamePhase: 'ROLLING_PHASE' | 'REVEAL_PHASE';
  revealQueue: string[];
  currentRevealerId: string | null;

  // Actions
  toggleKeep: (dieId: number) => void;
  roll: () => Promise<void>;
  reveal: () => void;
  onRevealComplete: () => void;      // after animation → CUP_UP (no API call)
  revealToAll: () => Promise<void>;  // explicit public reveal → API call
  revealCup: () => Promise<void>;    // reveal phase: lift cup and broadcast hand
  stand: () => Promise<void>;
}

export function useSchockenGame(sessionCode: string, playerId: string): SchockenGameHook {
  const { token } = useGame();

  // Local UI state
  const [myDice, setMyDice] = useState<Die[]>([]);
  const [myRollIndex, setMyRollIndex] = useState(0);
  const [myHand, setMyHand] = useState<HandResult | null>(null);
  const [phase, setPhase] = useState<RollPhase>('IDLE');
  // Derived from the dice so kept dice from earlier rolls stay kept on the next roll
  const myKeptDieIds = useMemo(() => myDice.filter(d => d.kept).map(d => d.id), [myDice]);

  // Public game state
  const [playerOrder, setPlayerOrder] = useState<PublicPlayerState[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [maxRollsThisRound, setMaxRollsThisRound] = useState<number | null>(null);
  const [lidStack, setLidStack] = useState(13);
  const [playerLids, setPlayerLids] = useState<Record<string, number>>({});
  const [gameOver, setGameOver] = useState(false);
  const [loserPlayerId, setLoserPlayerId] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  // Reveal phase state
  const [gamePhase, setGamePhase] = useState<'ROLLING_PHASE' | 'REVEAL_PHASE'>('ROLLING_PHASE');
  const [revealQueue, setRevealQueue] = useState<string[]>([]);
  const currentRevealerId = revealQueue[0] ?? null;

  const clientRef = useRef<Client | null>(null);
  // Always-current snapshot of playerOrder, safe to read inside stale WS closures
  const playerOrderRef = useRef<PublicPlayerState[]>([]);

  // Keep ref in sync so WS event handlers can always read current playerOrder
  useEffect(() => {
    playerOrderRef.current = playerOrder;
  }, [playerOrder]);

  // Auto-dismiss round result after 3 seconds
  useEffect(() => {
    if (!roundResult) return;
    const timer = setTimeout(() => setRoundResult(null), 3000);
    return () => clearTimeout(timer);
  }, [roundResult]);

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
        setPhase('IDLE');
        setGamePhase('ROLLING_PHASE');
        setRevealQueue([]);
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
        // hand is no longer in the event — remains hidden until the reveal phase
        setPlayerOrder(prev =>
          prev.map(p => p.id === pid ? { ...p, standing: true } : p)
        );
        break;
      }

      case 'REVEAL_PHASE_STARTED': {
        const orderedIds = event.orderedRevealerIds as string[];
        setGamePhase('REVEAL_PHASE');
        setRevealQueue(orderedIds);
        if (orderedIds[0] === playerId) setPhase('CUP_DOWN');
        break;
      }

      case 'NEXT_REVEALER': {
        const nextId = event.currentRevealerId as string;
        setRevealQueue(prev => prev.slice(1));
        if (nextId === playerId) setPhase('CUP_DOWN');
        break;
      }

      case 'NEXT_PLAYER': {
        const ci = event.currentPlayerIdx as number;
        const mr = event.maxRollsThisRound as number | null;
        const newOrderIds = event.playerOrderIds as string[] | null | undefined;

        // At round start the backend rotates playerOrder (loser first).
        // playerOrderIds carries the new ordering so we stay in sync.
        if (newOrderIds) {
          setPlayerOrder(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            return newOrderIds.map(id => map.get(id)).filter((p): p is typeof prev[number] => p != null);
          });
        }

        // Derive the next player's id directly from the event so we don't
        // depend on the playerOrderRef (which may still hold a stale value
        // from before the setPlayerOrder call above lands).
        const nextPlayerId = newOrderIds ? newOrderIds[ci] : playerOrderRef.current[ci]?.id;
        setCurrentPlayerIdx(ci);
        setMaxRollsThisRound(mr ?? null);
        if (nextPlayerId === playerId) {
          setPhase('IDLE');
          setMyDice([]);
          setMyRollIndex(0);
          setMyHand(null);
        }
        break;
      }

      case 'ROUND_ENDED': {
        const ls = event.lidStack as number;
        const pl = event.playerLids as Record<string, number>;
        const activePlayerIds = event.activePlayerIds as string[];
        const loserIds = event.loserIds as string[];
        const lidValue = event.lidValue as number;

        // Compute round result from the ref (always current, safe in stale closure)
        const prev = playerOrderRef.current;
        const losers = prev.filter(p => loserIds.includes(p.id));
        const winner = prev
          .filter(p => p.hand != null)
          .reduce<PublicPlayerState | null>(
            (best, p) => (!best || p.hand!.rank > best.hand!.rank) ? p : best,
            null
          );
        if (losers.length > 0) {
          setRoundResult({
            loserName: losers.map(p => p.username).join(' & '),
            winnerHandName: winner?.hand?.name ?? '',
            lidValue,
          });
        }

        setLidStack(ls);
        setPlayerLids(pl);
        // Filter eliminated players, update lid counts, and reset per-player state for the new round
        setPlayerOrder(prev =>
          prev
            .filter(p => activePlayerIds.includes(p.id))
            .map(p => ({ ...p, lids: pl[p.id] ?? p.lids, revealed: false, standing: false, closed: false, hand: null, dice: null, rollIndex: 0 }))
        );
        // Reset own state for new round
        setPhase('IDLE');
        setMyDice([]);
        setMyRollIndex(0);
        setMyHand(null);
        setGamePhase('ROLLING_PHASE');
        setRevealQueue([]);
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
      const maxRolls = maxRollsThisRound ?? 3;
      if (result.rollIndex >= maxRolls) {
        // Server auto-advances on a closed cup — wait for REVEAL_PHASE_STARTED or NEXT_PLAYER
        setPhase('FINISHED');
      } else {
        setTimeout(() => setPhase('CUP_DOWN'), 650);
      }
    } catch {
      setPhase(myRollIndex === 0 ? 'IDLE' : 'CUP_UP');
    }
  }, [sessionCode, myKeptDieIds, myRollIndex, maxRollsThisRound]);

  const reveal = useCallback(() => {
    setPhase('REVEALING');
  }, []);

  // Called after the cup-lift animation completes — just shows YOUR dice, no server call yet.
  const onRevealComplete = useCallback(() => {
    setPhase('CUP_UP');
  }, []);

  // Called explicitly by the player when they want to broadcast their hand to everyone.
  const revealToAll = useCallback(async () => {
    // Optimistic: hide the "must reveal" button immediately. Same rationale as
    // revealCup — the HTTP response can arrive after ROUND_ENDED has already
    // reset phase to IDLE, which would re-lock the player in FINISHED state.
    setPhase('FINISHED');
    try {
      await revealHand(sessionCode);
      // hand arrives via the PLAYER_REVEALED WebSocket event — nothing to do here
    } catch {
      setPhase('CUP_UP'); // revert so the player can try again
    }
  }, [sessionCode]);

  // Called during the reveal phase when it's your turn to lift your cup for everyone.
  const revealCup = useCallback(async () => {
    // Optimistically hide the cup immediately so the reveal animation doesn't
    // linger while waiting for the HTTP round-trip. Phase will be corrected
    // by the NEXT_REVEALER or ROUND_ENDED WebSocket event; setting it here
    // before the await prevents the race where the HTTP response arrives after
    // ROUND_ENDED has already reset phase to IDLE (which would re-lock the UI).
    setPhase('FINISHED');
    try {
      await revealHand(sessionCode);
      // hand arrives via the PLAYER_REVEALED WebSocket event — nothing to do here
    } catch {
      setPhase('CUP_DOWN'); // revert so the player can try again
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
    roundResult,
    gamePhase,
    revealQueue,
    currentRevealerId,
    toggleKeep,
    roll,
    reveal,
    onRevealComplete,
    revealToAll,
    revealCup,
    stand,
  };
}
