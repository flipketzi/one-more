import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { KingsCupProvider, useKingsCup } from '../context/KingsCupContext';
import { useKingsCupWebSocket } from '../hooks/useKingsCupWebSocket';
import { useGame } from '../../../context/GameContext';
import { getGameState, returnToLobby } from '../api/kingsCupClient';

import { useLocale } from '../../../context/LocaleContext';
import { CardDisplay } from '../components/CardDisplay';
import { PlayerStrip } from '../components/PlayerStrip';
import { ThumbQueenButton } from '../components/ThumbQueenButton';
import { JackRulesList } from '../components/JackRulesList';

import { DrawPhase } from '../views/DrawPhase';
import { DisplayRuleView } from '../views/DisplayRuleView';
import { SipPickView } from '../views/SipPickView';
import { BuddyPickView } from '../views/BuddyPickView';
import { TouchRaceView } from '../views/TouchRaceView';
import { WordRoundView } from '../views/WordRoundView';
import { JackRuleSubmitView } from '../views/JackRuleSubmitView';

import { SipNotificationOverlay } from '../overlays/SipNotificationOverlay';
import { TouchRaceResultOverlay } from '../overlays/TouchRaceResultOverlay';
import { WordRoundResultOverlay } from '../overlays/WordRoundResultOverlay';
import { GameOverOverlay } from '../overlays/GameOverOverlay';

const KingsCupScreenInner: React.FC = () => {
  const { state, dispatch } = useKingsCup();
  const { session, player, token } = useGame();

  useKingsCupWebSocket(session?.code ?? null, token);

  useEffect(() => {
    if (!session?.code) return;
    getGameState(session.code).then(s => dispatch({ type: 'LOAD', payload: s }));
  }, [session?.code]);

  if (state.isLoading || !player || !session) {
    return (
      <div className="app-bg min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { t } = useLocale();
  const [returningToLobby, setReturningToLobby] = useState(false);
  const myPlayerId = player.id;
  const isMyTurn = state.currentDrawerPlayerId === myPlayerId;
  const isHost = session.hostId === myPlayerId;
  const currentDrawer = state.turnOrder.find(p => p.id === state.currentDrawerPlayerId);
  const drawerUsername = currentDrawer?.username ?? 'Someone';
  const isThumbQueen = state.thumbQueenId === myPlayerId && state.thumbQueenUsesLeft > 0;
  const thumbQueenPlayer = state.thumbQueenId
    ? state.turnOrder.find(p => p.id === state.thumbQueenId)
    : null;

  const renderPhaseContent = () => {
    switch (state.phase) {
      case 'WAITING_TO_DRAW':
        return (
          <DrawPhase
            sessionCode={session.code}
            isMyTurn={isMyTurn}
            drawerUsername={drawerUsername}
          />
        );

      case 'EXECUTING_DISPLAY':
        return (
          <DisplayRuleView
            sessionCode={session.code}
            currentCard={state.currentCard}
            isMyTurn={isMyTurn}
            kingsDrawn={state.kingsDrawn}
            kingsCupContents={state.kingsCupContents}
            thumbQueenUsername={thumbQueenPlayer?.username}
          />
        );

      case 'PICK_TARGET': {
        const rank = state.currentCard ? state.currentCard.slice(0, -1) : null;
        const isCategory = rank === '10';
        const isRhyme = rank === '9';
        return (
          <SipPickView
            sessionCode={session.code}
            players={state.turnOrder}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            pendingWord={state.pendingCategory ?? undefined}
            wordLabel={isRhyme ? t.kingsCup.wordLabelRhyme : isCategory ? t.kingsCup.wordLabelCategory : undefined}
            hint={
              isCategory
                ? t.kingsCup.playFirstCategory
                : isRhyme
                ? t.kingsCup.playFirstRhyme
                : undefined
            }
            includeDrawer={isCategory || isRhyme}
          />
        );
      }

      case 'PICK_BUDDY':
        return (
          <BuddyPickView
            sessionCode={session.code}
            players={state.turnOrder}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            drinkingBuddies={state.drinkingBuddies}
          />
        );

      case 'TOUCH_RACE':
        if (!state.touchRace) return null;
        return (
          <TouchRaceView
            sessionCode={session.code}
            touchRace={state.touchRace}
            myPlayerId={myPlayerId}
          />
        );

      case 'WORD_ROUND':
        if (!state.wordRound) return null;
        return (
          <WordRoundView
            sessionCode={session.code}
            wordRound={state.wordRound}
            myPlayerId={myPlayerId}
            players={state.turnOrder}
          />
        );

      case 'SUBMIT_JACK_RULE':
        return (
          <JackRuleSubmitView
            sessionCode={session.code}
            isMyTurn={isMyTurn}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-bg min-h-dvh flex flex-col">
      {/* Overlays */}
      <AnimatePresence>
        {state.phase === 'GAME_OVER' && state.gameOverReason && (
          <GameOverOverlay key="gameover" reason={state.gameOverReason} />
        )}
        {state.pendingSipNotification && state.pendingSipNotification.targetPlayerId === myPlayerId && (
          <SipNotificationOverlay
            key="sip"
            assignedByUsername={state.pendingSipNotification.assignedByUsername}
            onDismiss={() => dispatch({ type: 'DISMISS_SIP_NOTIFICATION' })}
          />
        )}
        {state.touchRaceResult && (
          <TouchRaceResultOverlay
            key="race"
            loserUsername={state.touchRaceResult.loserUsername}
            isMe={state.touchRaceResult.loserPlayerId === myPlayerId}
            onDismiss={() => dispatch({ type: 'DISMISS_RACE_RESULT' })}
          />
        )}
        {state.wordRoundResult && (
          <WordRoundResultOverlay
            key="word"
            loserUsername={state.wordRoundResult.loserUsername}
            isMe={state.wordRoundResult.loserPlayerId === myPlayerId}
            onDismiss={() => dispatch({ type: 'DISMISS_WORD_RESULT' })}
          />
        )}
      </AnimatePresence>

      {/* Thumb Queen floating button */}
      {isThumbQueen && state.phase === 'WAITING_TO_DRAW' && (
        <ThumbQueenButton sessionCode={session.code} usesLeft={state.thumbQueenUsesLeft} />
      )}

      {/* Return to Lobby button — host only */}
      {isHost && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={returningToLobby}
          onClick={async () => {
            if (returningToLobby) return;
            setReturningToLobby(true);
            try {
              await returnToLobby(session.code);
            } catch {
              setReturningToLobby(false);
            }
          }}
          className="fixed bottom-24 left-4 z-40 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold disabled:opacity-50"
        >
          🚪 {t.kingsCup.returnToLobby}
        </motion.button>
      )}

      {/* Header */}
      <div className="px-4 pt-safe-top pt-4 pb-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🃏</span>
          <span className="text-white font-black text-lg">King's Cup</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            <span className="text-white font-bold">{t.kingsCup.cards(state.cardsRemaining)}</span>
          </span>
          {state.kingsDrawn > 0 && (
            <span className="text-amber-400 font-bold">👑 {state.kingsDrawn}/4</span>
          )}
          <JackRulesList rules={state.jackRules} />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6">
        <CardDisplay card={state.currentCard} />
        <div className="w-full max-w-sm">
          {renderPhaseContent()}
        </div>
      </div>

      {/* Player strip */}
      <div className="px-4 pb-safe-bottom pb-6 pt-3 border-t border-white/10">
        <PlayerStrip
          players={state.turnOrder}
          currentDrawerPlayerId={state.currentDrawerPlayerId}
          myPlayerId={myPlayerId}
          drinkingBuddies={state.drinkingBuddies}
          thumbQueenId={state.thumbQueenId}
        />
      </div>
    </div>
  );
};

export const KingsCupScreen: React.FC = () => (
  <KingsCupProvider>
    <KingsCupScreenInner />
  </KingsCupProvider>
);
