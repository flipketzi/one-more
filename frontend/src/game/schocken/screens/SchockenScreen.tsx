import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../../context/GameContext';
import { useSchockenGame } from '../hooks/useSchockenGame';
import { DiceDisplay } from '../components/DiceDisplay';
import { DiceCup } from '../components/DiceCup';
import { HandLabel } from '../components/HandLabel';
import { LidTracker } from '../components/LidTracker';
import { GameOverOverlay } from '../overlays/GameOverOverlay';

const SchockenScreenInner: React.FC = () => {
  const { session, player } = useGame();
  const game = useSchockenGame(session!.code, player!.id);

  const isMyTurn = game.playerOrder[game.currentPlayerIdx]?.id === player!.id;
  const showCup = game.phase === 'CUP_DOWN' || game.phase === 'REVEALING';
  const showDice = game.phase === 'ROLLING' || game.phase === 'CUP_UP' || game.phase === 'FINISHED';

  const maxRolls = game.maxRollsThisRound ?? 3;
  const rollsRemaining = maxRolls - game.myRollIndex;
  const canRollAgain = game.phase === 'CUP_UP' && isMyTurn && rollsRemaining > 0;
  const mustReveal = game.phase === 'CUP_UP' && isMyTurn && rollsRemaining <= 0;

  const currentPlayer = game.playerOrder[game.currentPlayerIdx];

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Header */}
      <div className="px-4 pt-safe-top pt-4 pb-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎲</span>
          <span className="text-white font-black text-lg">Schocken</span>
        </div>
        {game.myRollIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold"
          >
            Wurf {game.myRollIndex}/{maxRolls}
          </motion.div>
        )}
      </div>

      {/* Lid tracker */}
      <LidTracker
        playerOrder={game.playerOrder}
        lidStack={game.lidStack}
        currentPlayerIdx={game.currentPlayerIdx}
      />

      {/* Turn indicator */}
      {!isMyTurn && currentPlayer && (
        <div className="px-4 py-2 text-center text-slate-400 text-sm">
          Warten auf <span className="text-white font-semibold">{currentPlayer.username}</span>…
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-6">
        <AnimatePresence mode="wait">
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
              className="flex flex-col items-center gap-4"
            >
              <DiceDisplay
                dice={game.myDice}
                rolling={game.phase === 'ROLLING'}
                canToggle={canRollAgain}
                onToggle={game.toggleKeep}
              />
              {canRollAgain && (
                <p className="text-slate-400 text-xs">
                  Tippe auf einen Würfel zum Beiseitelegen
                </p>
              )}
              {game.myHand && <HandLabel hand={game.myHand} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action area */}
      <div className="px-4 pb-safe-bottom pb-8 pt-4 border-t border-white/10 flex flex-col items-center gap-3">
        {/* IDLE: first roll */}
        {game.phase === 'IDLE' && isMyTurn && (
          <motion.button
            key="roll-btn"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={game.roll}
            className="w-full max-w-xs py-4 rounded-2xl bg-amber-500 text-slate-900 font-black text-lg shadow-lg"
          >
            Würfeln
          </motion.button>
        )}

        {/* CUP_UP: roll again or stand */}
        {canRollAgain && (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <motion.button
              key="reroll-btn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={game.roll}
              className="w-full py-4 rounded-2xl bg-amber-500 text-slate-900 font-black text-lg shadow-lg"
            >
              Nochmal würfeln
            </motion.button>
            <motion.button
              key="stand-btn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={game.stand}
              className="w-full py-3 rounded-2xl glass border border-white/20 text-white font-bold text-base"
            >
              Stehen lassen
            </motion.button>
          </div>
        )}

        {/* CUP_UP: forced reveal after max rolls */}
        {mustReveal && (
          <p className="text-slate-400 text-sm">Hebe den Becher auf um deine Hand aufzudecken</p>
        )}

        {/* Rolling indicator */}
        {game.phase === 'ROLLING' && (
          <div className="w-full max-w-xs py-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-lg text-center">
            ...
          </div>
        )}

        {/* FINISHED: waiting for next player event */}
        {game.phase === 'FINISHED' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs py-4 rounded-2xl glass border border-white/10 text-white/40 font-bold text-lg text-center"
          >
            Warten auf andere Spieler…
          </motion.div>
        )}

        {/* Not your turn */}
        {game.phase === 'IDLE' && !isMyTurn && (
          <div className="w-full max-w-xs py-4 rounded-2xl glass border border-white/10 text-white/30 font-bold text-lg text-center">
            {currentPlayer ? `Warten auf ${currentPlayer.username}…` : 'Warten…'}
          </div>
        )}
      </div>

      {game.gameOver && game.loserPlayerId && (
        <GameOverOverlay loserPlayerId={game.loserPlayerId} players={game.playerOrder} />
      )}
    </div>
  );
};

export const SchockenScreen: React.FC = () => <SchockenScreenInner />;
