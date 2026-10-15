import React from 'react';
import { motion } from 'framer-motion';
import { ThrowRow } from '../components/ThrowRow';
import { OVERLAY_BACKDROP, PRIMARY_BUTTON } from '../components/pubStyles';
import { OpeningRound, PublicPlayerState } from '../types';

interface Props {
  openingRound: OpeningRound;
  players: PublicPlayerState[];
  /** The opening throw (e.g. a Schock Out) already decided the whole game. */
  gameOver: boolean;
  onDismiss: () => void;
}

const FIRST_ROW_DELAY_S = 0.4;
const ROW_STAGGER_S = 0.15;

export const OpeningRoundOverlay: React.FC<Props> = ({ openingRound, players, gameOver, onDismiss }) => {
  const playerById = (id: string) => players.find(p => p.id === id);
  const loserNames = openingRound.loserIds.map(id => playerById(id)?.username ?? '?');
  const starterName = loserNames[0];
  const resultDelayS = FIRST_ROW_DELAY_S + openingRound.throws.length * ROW_STAGGER_S + 0.2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${OVERLAY_BACKDROP} z-50 flex flex-col items-center justify-center gap-6 px-4 py-8 overflow-y-auto`}
    >
      <motion.div
        initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -3, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 12 }}
        className="text-center"
      >
        <h1 className="font-pub font-extrabold text-7xl leading-none text-pub-beer">
          Erster Hoch!
        </h1>
        <p className="mt-3 text-pub-ash text-base text-balance">
          Jeder würfelt einmal – der schlechteste Wurf fängt an
        </p>
      </motion.div>

      <ul className="w-full max-w-sm flex flex-col gap-2">
        {openingRound.throws.map((t, index) => (
          <ThrowRow
            key={t.playerId}
            player={playerById(t.playerId)}
            dice={t.dice}
            hand={t.hand}
            isLoser={openingRound.loserIds.includes(t.playerId)}
            delayS={FIRST_ROW_DELAY_S + index * ROW_STAGGER_S}
          />
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: resultDelayS }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <p className="text-pub-foam text-lg leading-snug">
          <span className="text-pub-ember font-semibold">{loserNames.join(' & ')}</span>
          {loserNames.length > 1 ? ' nehmen je ' : ' nimmt '}
          <span className="font-semibold">{openingRound.lidValue}</span> Deckel
          <br />
          {gameOver
            ? <span className="font-semibold">Das Spiel ist sofort vorbei!</span>
            : <><span className="font-semibold">{starterName}</span> fängt an</>}
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onDismiss}
          className={`${PRIMARY_BUTTON} max-w-xs`}
        >
          {gameOver ? 'Weiter' : "Los geht's!"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
