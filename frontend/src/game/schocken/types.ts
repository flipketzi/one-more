export type RollPhase = 'IDLE' | 'ROLLING' | 'CUP_DOWN' | 'REVEALING' | 'CUP_UP' | 'FINISHED';

export interface Die {
  id: number;
  value: number;
  kept: boolean;
}

export interface HandResult {
  name: string;
  lids: number;
  rank: number;
}

export interface PublicPlayerState {
  id: string;
  username: string;
  avatar: string;
  lids: number;
  rollIndex: number;
  revealed: boolean;
  standing: boolean;
  hand: HandResult | null;
  dice: Die[] | null;
}

export interface PlayerGameView {
  myDice: Die[];
  myRollIndex: number;
  playerOrder: PublicPlayerState[];
  currentPlayerIdx: number;
  maxRollsThisRound: number | null;
  lidStack: number;
  playerLids: Record<string, number>;
  gameOver: boolean;
}
