export type GamePhase =
  | 'WAITING_TO_DRAW'
  | 'PICK_TARGET'
  | 'EXECUTING_DISPLAY'
  | 'TOUCH_RACE'
  | 'PICK_BUDDY'
  | 'WORD_ROUND'
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

export interface TouchRaceStateDto {
  raceId: string;
  raceType: string;
  eligiblePlayerIds: string[];
  touchedPlayerIds: string[];
  windowSeconds: number;
}

export interface WordRoundStateDto {
  roundId: string;
  roundType: string;
  seedWord: string;
  currentSpeakerPlayerId: string;
  submissions: WordSubmissionDto[];
}

export interface WordSubmissionDto {
  playerId: string;
  username: string;
  word: string;
  passed: boolean;
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
  wordRound: WordRoundStateDto | null;
  pendingCategory: string | null;
}

export type GameEvent =
  | { type: 'GAME_INITIALIZED'; sessionCode: string }
  | { type: 'CARD_DRAWN'; sessionCode: string; card: string; drawnByPlayerId: string; drawnByUsername: string; phase: GamePhase }
  | { type: 'SIP_ASSIGNED'; sessionCode: string; targetPlayerId: string; targetUsername: string; assignedByUsername: string }
  | { type: 'BUDDY_ASSIGNED'; sessionCode: string; player1Id: string; player1Username: string; player2Id: string; player2Username: string }
  | { type: 'TOUCH_RACE_STARTED'; sessionCode: string; raceId: string; raceType: string; initiatorUsername: string; eligiblePlayerIds: string[]; windowSeconds: number }
  | { type: 'TOUCH_RACE_RESULT'; sessionCode: string; raceId: string; loserPlayerId: string; loserUsername: string; touchOrder: string[] }
  | { type: 'WORD_ROUND_STARTED'; sessionCode: string; roundId: string; roundType: string; seedWord: string; firstSpeakerPlayerId: string; firstSpeakerUsername: string }
  | { type: 'WORD_ROUND_TURN'; sessionCode: string; roundId: string; lastSubmission: WordSubmissionDto | null; nextSpeakerPlayerId: string; nextSpeakerUsername: string }
  | { type: 'WORD_ROUND_RESULT'; sessionCode: string; roundId: string; loserPlayerId: string; loserUsername: string }
  | { type: 'JACK_RULE_ADDED'; sessionCode: string; ruleText: string; authorUsername: string; allRules: JackRuleDto[] }
  | { type: 'THUMB_QUEEN_ASSIGNED'; sessionCode: string; queenPlayerId: string; queenUsername: string; usesLeft: number }
  | { type: 'KING_DRAWN'; sessionCode: string; kingsDrawn: number; drawerUsername: string; kingsCupContents: string[]; isLastKing: boolean; lastKingDrinkerPlayerId: string | null }
  | { type: 'TURN_ADVANCED'; sessionCode: string; nextDrawerPlayerId: string; nextDrawerUsername: string; cardsRemaining: number }
  | { type: 'GAME_OVER'; sessionCode: string; reason: string };
