import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { LobbyEvent } from '../types';
import { useGame } from '../context/GameContext';

export const useLobbyWebSocket = (sessionCode: string | null, token: string | null) => {
  const { updateSession, notify, goTo, player, setStartedGameType } = useGame();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!sessionCode || !token) return;

    const client = new Client({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webSocketFactory: () => new SockJS(`${window.location.protocol}//${window.location.host}/ws`) as any,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/sessions/${sessionCode}/lobby`, (msg) => {
          const event: LobbyEvent = JSON.parse(msg.body);
          handleEvent(event);
        });
      },
      onStompError: () => {
        notify('Lost connection to session. Reconnecting…', 'error');
      },
    });

    const handleEvent = (event: LobbyEvent) => {
      switch (event.type) {
        case 'PLAYER_JOINED':
          updateSession(prev => ({
            ...prev,
            players: [...prev.players.filter(p => p.id !== event.player.id), event.player],
          }));
          notify(`${event.player.username} joined the party! 🎉`, 'success');
          break;

        case 'PLAYER_LEFT':
          updateSession(prev => ({
            ...prev,
            players: prev.players.filter(p => p.id !== event.playerId),
          }));
          notify(`${event.username} left the session.`);
          break;

        case 'PLAYER_KICKED':
          if (player?.id === event.playerId) {
            notify("You've been kicked from the session. 👢", 'error');
            goTo('home');
          } else {
            updateSession(prev => ({
              ...prev,
              players: prev.players.filter(p => p.id !== event.playerId),
            }));
            notify(`${event.username} was kicked.`);
          }
          break;

        case 'HOST_TRANSFERRED':
          updateSession(prev => ({
            ...prev,
            hostId: event.newHostId,
            players: prev.players.map(p => ({
              ...p,
              role: p.id === event.newHostId ? 'HOST' : 'PLAYER',
            })),
          }));
          notify(`${event.newHostUsername} is now the host. 👑`);
          break;

        case 'GAME_SELECTED':
          updateSession(prev => ({ ...prev, gameType: event.gameType }));
          break;

        case 'SESSION_STARTING':
          updateSession(prev => ({ ...prev, status: 'STARTING' }));
          setStartedGameType(event.gameType);
          if (event.gameType === 'KINGS_CUP') goTo('kings_cup');
          else if (event.gameType === 'SCHOCKEN') goTo('schocken');
          else goTo('game_started');
          break;
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
