import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { useSchockenGame } from '../hooks/useSchockenGame';
import { returnToLobby } from '../api/schockenApi';
import { DiceDisplay } from '../components/DiceDisplay';
import { DiceCup } from '../components/DiceCup';
import { HandLabel } from '../components/HandLabel';
import { LidTracker } from '../components/LidTracker';
import { GameOverOverlay } from '../overlays/GameOverOverlay';
import { OpeningRoundOverlay } from '../overlays/OpeningRoundOverlay';
import { RoundEndedOverlay } from '../overlays/RoundEndedOverlay';
import { RoundEvaluationOverlay } from '../overlays/RoundEvaluationOverlay';
import { RevealPhaseOverlay } from '../overlays/RevealPhaseOverlay';
import { DICE_TRAY, FOCUS_RING, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../components/pubStyles';

const SchockenScreenInner: React.FC = () => {
  const { session, player } = useGame();
  const game = useSchockenGame(session!.code, player!.id);
  const isHost = session!.hostId === player!.id;

  // Escape hatch when the game cannot continue (e.g. a player left mid-round)
  const handleEndGame = async () => {
    if (!window.confirm('Spiel für alle beenden und zurück zur Lobby?')) return;
    await returnToLobby(session!.code).catch(() => { /* stays in game; host can retry */ });
  };

  const isMyTurn = game.playerOrder[game.currentPlayerIdx]?.id === player!.id;
  // During the reveal phase the overlay takes over — hide the main cup to avoid duplicate input
  const showCup = (game.phase === 'CUP_DOWN' || game.phase === 'REVEALING') && game.gamePhase !== 'REVEAL_PHASE';
  const showDice = game.phase === 'ROLLING' || game.phase === 'CUP_UP' || game.phase === 'FINISHED';

  const maxRolls = game.maxRollsThisRound ?? 3;
  const rollsRemaining = maxRolls - game.myRollIndex;
  const canRollAgain = game.phase === 'CUP_UP' && isMyTurn && rollsRemaining > 0;
  const mustReveal = game.phase === 'CUP_UP' && isMyTurn && rollsRemaining <= 0;

  const currentPlayer = game.playerOrder[game.currentPlayerIdx];

  return (
    <div className="min-h-dvh flex flex-col bg-pub-wood text-pub-foam font-pub-body">
      <header className="px-4 pt-safe-top pt-4 pb-3 flex items-baseline justify-between gap-3">
        <h1 className="font-pub font-extrabold text-3xl leading-none">Schocken</h1>
        <div className="flex items-baseline gap-4">
          {game.myRollIndex > 0 && (
            <span className="font-pub font-semibold text-lg text-pub-foam">
              Wurf {game.myRollIndex} von {maxRolls}
            </span>
          )}
          {isHost && (
            <button
              onClick={handleEndGame}
              className={`text-sm text-pub-ash underline underline-offset-4 decoration-pub-ash/40 hover:text-pub-foam ${FOCUS_RING}`}
            >
              Beenden
            </button>
          )}
        </div>
      </header>

      <LidTracker
        playerOrder={game.playerOrder}
        lidStack={game.lidStack}
        currentPlayerIdx={game.currentPlayerIdx}
      />

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6">
        {/* The dice tray: felt lining inside a leather rim */}
        <div className={`w-full max-w-sm min-h-[300px] ${DICE_TRAY} flex items-center justify-center p-4`}>
          <AnimatePresence mode="wait">
            {game.phase === 'IDLE' && (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-pub font-bold text-3xl text-center text-pub-foam/90"
              >
                {isMyTurn ? 'Du bist dran' : `${currentPlayer?.username ?? '…'} ist dran`}
              </motion.p>
            )}
            {showCup && (
              <motion.div
                key="cup"
                initial={{ opacity: 0, y: -80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <DiceCup
                  revealing={game.phase === 'REVEALING'}
                  onReveal={game.reveal}
                  onRevealComplete={game.onRevealComplete}
                />
              </motion.div>
            )}
            {showDice && (
              <motion.div
                key="dice"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <DiceDisplay
                  dice={game.myDice}
                  rolling={game.phase === 'ROLLING'}
                  canToggle={canRollAgain}
                  onToggle={game.toggleKeep}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {canRollAgain && (
          <p className="text-pub-ash text-sm text-center">
            Tippe auf einen Würfel, um ihn beiseitezulegen
          </p>
        )}
        {showDice && game.myHand && <HandLabel hand={game.myHand} />}
      </main>

      <footer className="px-4 pb-safe-bottom pb-8 pt-2 flex flex-col items-center gap-3">
        <div className="w-full max-w-sm flex flex-col gap-3">
          {game.phase === 'IDLE' && isMyTurn && (
            <motion.button key="roll-btn" whileTap={{ scale: 0.97 }} onClick={game.roll} className={PRIMARY_BUTTON}>
              Würfeln
            </motion.button>
          )}

          {canRollAgain && (
            <>
              <motion.button key="reroll-btn" whileTap={{ scale: 0.97 }} onClick={game.roll} className={PRIMARY_BUTTON}>
                Nochmal würfeln
              </motion.button>
              <motion.button key="stand-btn" whileTap={{ scale: 0.97 }} onClick={game.stand} className={SECONDARY_BUTTON}>
                Stehen lassen
              </motion.button>
            </>
          )}

          {/* Max rolls used — the hand must be revealed publicly */}
          {mustReveal && (
            <motion.button key="reveal-btn" whileTap={{ scale: 0.97 }} onClick={game.revealToAll} className={PRIMARY_BUTTON}>
              Aufdecken
            </motion.button>
          )}

          {game.phase === 'ROLLING' && (
            <p className="py-4 text-center font-pub text-xl text-pub-ash">Würfelt…</p>
          )}

          {game.phase === 'FINISHED' && (
            <p className="py-4 text-center text-pub-ash">Warten auf die anderen…</p>
          )}
        </div>
      </footer>

      <RoundEndedOverlay roundResult={game.roundResult} />

      <AnimatePresence>
        {game.gamePhase === 'REVEAL_PHASE' && (
          <RevealPhaseOverlay
            playerOrder={game.playerOrder}
            revealQueue={game.revealQueue}
            currentRevealerId={game.currentRevealerId}
            playerId={player!.id}
            myPhase={game.phase}
            myDice={game.myDice}
            myHand={game.myHand}
            onReveal={game.reveal}
            revealCup={game.revealCup}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {game.roundEvaluation && (
          <RoundEvaluationOverlay
            key="round-evaluation"
            evaluation={game.roundEvaluation}
            playerId={player!.id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {game.openingRound && (
          <OpeningRoundOverlay
            key="opening-round"
            openingRound={game.openingRound}
            players={game.playerOrder}
            gameOver={game.gameOver}
            onDismiss={game.dismissOpeningRound}
          />
        )}
      </AnimatePresence>

      {game.gameOver && game.loserPlayerId && !game.openingRound && !game.roundEvaluation && (
        <GameOverOverlay loserPlayerId={game.loserPlayerId} players={game.playerOrder} />
      )}
    </div>
  );
};

// Transform animations jump to their end state for players who prefer reduced motion
export const SchockenScreen: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <SchockenScreenInner />
  </MotionConfig>
);
