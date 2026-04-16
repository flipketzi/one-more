import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PublicPlayerState, RollPhase } from '../types';
import { DiceCup } from '../components/DiceCup';

interface Props {
  playerOrder: PublicPlayerState[];
  revealQueue: string[];
  currentRevealerId: string | null;
  playerId: string;
  myPhase: RollPhase;
  onReveal: () => void;
  revealCup: () => Promise<void>;
}

function handBadgeColor(rank: number): string {
  if (rank >= 9000) return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
  if (rank >= 8000) return 'bg-violet-500/20 border-violet-500/50 text-violet-300';
  if (rank >= 7100) return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  return 'bg-slate-500/20 border-slate-500/30 text-slate-300';
}

// Inline cup SVG shared between DiceCup and the dim waiting state
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

export const RevealPhaseOverlay: React.FC<Props> = ({
  playerOrder,
  revealQueue,
  currentRevealerId,
  playerId,
  myPhase,
  onReveal,
  revealCup,
}) => {
  const revealer = playerOrder.find(p => p.id === currentRevealerId);
  const isMyTurn = currentRevealerId === playerId;
  const revealedPlayers = playerOrder.filter(p => p.revealed && p.hand != null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <span className="text-slate-400 text-sm font-bold tracking-widest uppercase">
          Aufdeckphase
        </span>
        <span className="text-slate-500 text-xs">
          Noch {revealQueue.length} Aufdeckung{revealQueue.length !== 1 ? 'en' : ''}
        </span>
      </div>

      {/* Spotlight */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {/* Revealer name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRevealerId ?? 'none'}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center"
          >
            <p className="text-slate-400 text-sm mb-1">
              {isMyTurn ? 'Du deckst auf' : 'deckt auf\u2026'}
            </p>
            <p className="text-white font-black text-3xl">
              {revealer?.username ?? '\u2026'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Cup area */}
        {isMyTurn && (myPhase === 'CUP_DOWN' || myPhase === 'REVEALING') ? (
          <DiceCup
            revealing={myPhase === 'REVEALING'}
            onReveal={onReveal}
            onRevealComplete={revealCup}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="opacity-30"
            >
              <CupSvg />
            </motion.div>
            {revealer && (
              <p className="text-slate-500 text-sm">
                Warten auf {revealer.username}\u2026
              </p>
            )}
          </div>
        )}
      </div>

      {/* Already-revealed hands */}
      {revealedPlayers.length > 0 && (
        <div className="px-4 pb-8">
          <p className="text-slate-500 text-xs mb-2 text-center">Bereits aufgedeckt</p>
          <motion.div
            className="flex flex-wrap justify-center gap-2"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <AnimatePresence>
              {revealedPlayers.map(p => (
                <motion.div
                  key={p.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-bold ${handBadgeColor(p.hand!.rank)}`}
                >
                  {p.username}: {p.hand!.name}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
