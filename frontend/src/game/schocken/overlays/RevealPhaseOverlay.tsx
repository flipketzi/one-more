import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Die, HandResult, PublicPlayerState, RollPhase } from '../types';
import { DiceCup } from '../components/DiceCup';
import { getBadgeClass } from '../components/HandLabel';
import { DICE_TRAY, OVERLAY_BACKDROP } from '../components/pubStyles';

interface Props {
  playerOrder: PublicPlayerState[];
  revealQueue: string[];
  currentRevealerId: string | null;
  playerId: string;
  myPhase: RollPhase;
  myDice: Die[];
  myHand: HandResult | null;
  onReveal: () => void;
  revealCup: () => Promise<void>;
}

const CupSvg: React.FC = () => (
  <svg width={160} height={130} viewBox="0 0 220 180" style={{ display: 'block' }}>
    <ellipse cx={110} cy={168} rx={70} ry={8} fill="rgba(0,0,0,0.35)" />
    <path d="M 50 30 L 30 155 Q 30 162 38 162 L 182 162 Q 190 162 190 155 L 170 30 Z" fill="#4a2810" />
    <path d="M 55 35 L 36 152 Q 36 158 42 158 L 178 158 Q 184 158 184 152 L 165 35 Z" fill="#3a1e08" />
    <ellipse cx={110} cy={30} rx={60} ry={12} fill="#5c3220" />
    <ellipse cx={110} cy={30} rx={52} ry={9} fill="#2a1005" />
    <path d="M 62 42 L 46 148 Q 47 152 52 152 L 68 152 L 82 42 Z" fill="rgba(255,255,255,0.07)" />
    <path d="M 30 148 Q 30 162 38 162 L 182 162 Q 190 162 190 148 Z" fill="#7a4228" />
    <ellipse cx={110} cy={28} rx={58} ry={10} fill="none" stroke="#8b5030" strokeWidth={2} />
  </svg>
);

/** Shown in the cup area after the player lifts their cup locally, before PLAYER_REVEALED fires. */
const MyDicePreview: React.FC<{ dice: Die[]; hand: HandResult | null }> = ({ dice, hand }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="flex gap-3">
      {[...dice].sort((a, b) => b.value - a.value).map(d => (
        <div
          key={d.id}
          className="w-12 h-12 flex items-center justify-center rounded-lg bg-pub-foam text-pub-wood font-pub text-3xl font-bold"
        >
          {d.value > 0 ? d.value : '?'}
        </div>
      ))}
    </div>
    {hand && (
      <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${getBadgeClass(hand.rank)}`}>
        {hand.name}
      </span>
    )}
  </div>
);

export const RevealPhaseOverlay: React.FC<Props> = ({
  playerOrder,
  revealQueue,
  currentRevealerId,
  playerId,
  myPhase,
  myDice,
  myHand,
  onReveal,
  revealCup,
}) => {
  const revealer = playerOrder.find(p => p.id === currentRevealerId);
  const isMyTurn = currentRevealerId === playerId;
  const revealedPlayers = playerOrder.filter(p => p.revealed && p.hand != null);

  // Cup area states — mutually exclusive, evaluated top-down.
  // showMyCup: I am the active revealer and my cup is still down / lifting.
  const showMyCup = isMyTurn && (myPhase === 'CUP_DOWN' || myPhase === 'REVEALING');
  // showMyDicePreview: I just lifted the cup locally (optimistic FINISHED) but the
  // PLAYER_REVEALED WS event hasn't confirmed the reveal yet.
  const showMyDicePreview = isMyTurn
    && myPhase === 'FINISHED'
    && myDice.length > 0
    && !playerOrder.find(p => p.id === playerId)?.revealed;
  // showWaitingCup: another player's cup is down and they haven't revealed yet.
  // Do NOT show when the current revealer has already revealed (brief window between
  // PLAYER_REVEALED and NEXT_REVEALER/ROUND_ENDED events).
  const showWaitingCup = !showMyCup && !showMyDicePreview
    && revealer != null && !revealer.revealed;

  // Spotlight header — only show an active name when someone is actually revealing.
  const hasActiveRevealer = currentRevealerId != null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Fades out underneath the RoundEvaluationOverlay after ROUND_ENDED
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.35 }}
      className={`${OVERLAY_BACKDROP} z-50 flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between px-4 pt-6 pb-4">
        <h2 className="font-pub font-bold text-2xl">Aufdecken</h2>
        {revealQueue.length > 0 && (
          <span className="text-pub-ash text-sm">
            Noch {revealQueue.length} Aufdeckung{revealQueue.length !== 1 ? 'en' : ''}
          </span>
        )}
      </div>

      {/* Spotlight */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">

        {/* Revealer name — crossfades between players */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRevealerId ?? 'done'}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center"
          >
            {!hasActiveRevealer && <p className="text-pub-ash text-base">Alle haben aufgedeckt</p>}
            {hasActiveRevealer && isMyTurn && (
              <p className="font-pub font-extrabold text-4xl text-pub-foam">Du deckst auf</p>
            )}
            {hasActiveRevealer && !isMyTurn && (
              <>
                <p className="font-pub font-extrabold text-4xl text-pub-foam">
                  {revealer?.username ?? '\u2026'}
                </p>
                <p className="text-pub-ash text-base mt-1">deckt auf</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/*
          Cup / dice area — fixed height so layout stays stable during transitions.
          Each element has its own AnimatePresence so they fade in/out in parallel
          instead of sequentially (no mode="wait" delay).
        */}
        <div className={`relative w-full max-w-sm flex items-center justify-center ${DICE_TRAY}`} style={{ height: 260 }}>
          <AnimatePresence>
            {showMyCup && (
              <motion.div
                key="my-cup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <DiceCup
                  revealing={myPhase === 'REVEALING'}
                  onReveal={onReveal}
                  onRevealComplete={revealCup}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showMyDicePreview && (
              <motion.div
                key="my-dice"
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <MyDicePreview dice={myDice} hand={myHand} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showWaitingCup && (
              <motion.div
                key="waiting-cup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              >
                <div className="opacity-60">
                  <CupSvg />
                </div>
                <p className="text-pub-foam/75 text-sm">
                  Warten auf {revealer!.username}…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Already-revealed hands */}
      {revealedPlayers.length > 0 && (
        <div className="px-4 pb-8 pt-4">
          <p className="text-pub-ash text-sm mb-2 text-center">Bereits aufgedeckt</p>
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence>
              {revealedPlayers.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex flex-col items-start gap-1.5 px-3 py-2 rounded-lg bg-pub-plank"
                >
                  <span className="text-sm font-semibold text-pub-foam">{p.username}</span>
                  {p.dice && p.dice.length > 0 && (
                    <div className="flex gap-1">
                      {[...p.dice].sort((a, b) => b.value - a.value).map(d => (
                        <span
                          key={d.id}
                          className="w-6 h-6 flex items-center justify-center rounded bg-pub-foam text-pub-wood font-pub text-sm font-bold"
                        >
                          {d.value}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getBadgeClass(p.hand!.rank)}`}>
                    {p.hand!.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};
