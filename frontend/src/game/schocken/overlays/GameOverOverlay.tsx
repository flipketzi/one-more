import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { returnToLobby } from '../api/schockenApi';
import { OVERLAY_BACKDROP, PRIMARY_BUTTON } from '../components/pubStyles';
import { PublicPlayerState } from '../types';

interface Props {
  loserPlayerId: string;
  players: PublicPlayerState[];
}

export const GameOverOverlay: React.FC<Props> = ({ loserPlayerId, players }) => {
  const { goTo, session, player } = useGame();
  const loser = players.find(p => p.id === loserPlayerId);
  const isHost = session?.hostId === player?.id;

  // The host ends the game server-side so the session can be restarted; everyone
  // still on the game screen follows via GAME_ABANDONED. Guests just leave locally.
  const handleBackToLobby = async () => {
    if (!isHost || !session) {
      goTo('lobby');
      return;
    }
    try {
      await returnToLobby(session.code);
    } catch {
      goTo('lobby');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${OVERLAY_BACKDROP} z-50 flex flex-col items-center justify-center p-6`}
    >
      <h1 className="font-pub font-bold text-3xl text-pub-ash mb-2">Spiel vorbei</h1>
      <motion.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="font-pub font-extrabold text-6xl leading-none text-center text-pub-ember mb-3"
      >
        {loser ? `${loser.username} trinkt alles!` : 'Das Spiel ist vorbei.'}
      </motion.p>
      {loser && (
        <p className="text-pub-foam text-lg text-center mb-10">{loser.lids} Deckel</p>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleBackToLobby}
        className={`${PRIMARY_BUTTON} max-w-xs`}
      >
        Zurück zur Lobby
      </motion.button>
    </motion.div>
  );
};
