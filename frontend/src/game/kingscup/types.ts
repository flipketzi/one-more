export type GamePhase =
  | 'WAITING_TO_DRAW'
  | 'PICK_TARGET'
  | 'EXECUTING_DISPLAY'
  | 'TOUCH_RACE'
  | 'PICK_BUDDY'
  | 'SUBMIT_JACK_RULE'
  | 'GAME_OVER';

export interface PlayerSummary {
  id: string;
  username: string;
  avatar: string;
}

export interface JackRuleDto {
  ruleText: string;
  authorUsername: string;
}

export type TouchRaceType = 'CARD_FOUR' | 'QUEEN';

export type GameOverReason = 'LAST_KING' | 'DECK_EMPTY';

export interface TouchRaceStateDto {
  raceId: string;
  raceType: string;
  eligiblePlayerIds: string[];
  touchedPlayerIds: string[];
  windowSeconds: number;
}

export interface KingsCupState {
  phase: GamePhase;
  currentDrawerPlayerId: string;
  currentCard: string | null;
  cardsRemaining: number;
  turnOrder: PlayerSummary[];
  drinkingBuddies: Record<string, string>;
  thumbQueenId: string | null;
  thumbQueenUsesLeft: number;
  jackRules: JackRuleDto[];
  kingsDrawn: number;
  kingsCupContents: string[];
  touchRace: TouchRaceStateDto | null;
  pendingCategory: string | null;
}

export type GameEvent =
  | { type: 'GAME_INITIALIZED'; sessionCode: string }
  | { type: 'CARD_DRAWN'; sessionCode: string; card: string; drawnByPlayerId: string; drawnByUsername: string; phase: GamePhase; pendingCategory: string | null }
  | { type: 'SIP_ASSIGNED'; sessionCode: string; targetPlayerId: string; targetUsername: string; assignedByUsername: string }
  | { type: 'BUDDY_ASSIGNED'; sessionCode: string; player1Id: string; player1Username: string; player2Id: string; player2Username: string }
  | { type: 'TOUCH_RACE_STARTED'; sessionCode: string; raceId: string; raceType: string; initiatorUsername: string; eligiblePlayerIds: string[]; windowSeconds: number }
  | { type: 'TOUCH_RACE_RESULT'; sessionCode: string; raceId: string; loserPlayerId: string; loserUsername: string; touchOrder: string[]; raceType: TouchRaceType }
  | { type: 'JACK_RULE_ADDED'; sessionCode: string; ruleText: string; authorUsername: string; allRules: JackRuleDto[] }
  | { type: 'THUMB_QUEEN_ASSIGNED'; sessionCode: string; queenPlayerId: string; queenUsername: string; usesLeft: number }
  | { type: 'KING_DRAWN'; sessionCode: string; kingsDrawn: number; drawerUsername: string; kingsCupContents: string[]; isLastKing: boolean; lastKingDrinkerPlayerId: string | null }
  | { type: 'TURN_ADVANCED'; sessionCode: string; nextDrawerPlayerId: string; nextDrawerUsername: string; cardsRemaining: number }
  | { type: 'GAME_OVER'; sessionCode: string; reason: GameOverReason; cupDrinkerUsername: string | null }
  | { type: 'GAME_ABANDONED'; sessionCode: string };
