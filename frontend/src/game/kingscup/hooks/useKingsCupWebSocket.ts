import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GameEvent } from '../types';
import { useKingsCup } from '../context/KingsCupContext';
import { getGameState } from '../api/kingsCupClient';

export const useKingsCupWebSocket = (sessionCode: string | null, token: string | null) => {
  const { dispatch, dispatchGameEvent } = useKingsCup();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!sessionCode || !token) return;

    const client = new Client({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocketFactory: () => new SockJS('http://localhost:8080/ws') as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/sessions/${sessionCode}/game`, (msg) => {
          const event: GameEvent = JSON.parse(msg.body);
          handleEvent(event);
        });
      },
    });

    const handleEvent = (event: GameEvent) => {
      if (event.type === 'GAME_INITIALIZED') {
        // Reconnect case: re-fetch full state
        getGameState(sessionCode).then(state => {
          dispatch({ type: 'LOAD', payload: state });
        });
      } else {
        dispatchGameEvent(event);
      }
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, token]);
};
