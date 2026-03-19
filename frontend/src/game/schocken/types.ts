export type RollPhase = 'IDLE' | 'ROLLING' | 'CUP_DOWN' | 'REVEALING' | 'CUP_UP' | 'FINISHED';

export interface Die {
  id: number;
  value: number;
  kept: boolean;
}

export interface SchockenState {
  dice: Die[];
  rollIndex: number;
  phase: RollPhase;
}
