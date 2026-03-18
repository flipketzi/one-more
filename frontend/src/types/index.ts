export type PlayerRole = 'HOST' | 'PLAYER';
export type PlayerStatus = 'ACTIVE' | 'LEFT' | 'KICKED';
export type SessionStatus = 'WAITING' | 'STARTING' | 'IN_GAME' | 'FINISHED' | 'CANCELLED';
export type GameType = 'KINGS_CUP' | 'HORSE_RACING' | 'SCHOCKEN';
export type Screen = 'age_gate' | 'setup' | 'home' | 'join' | 'lobby' | 'game_started' | 'kings_cup';

export interface PlayerInfo {
  id: string;
  username: string;
  avatar: string;
  role: PlayerRole;
  status: PlayerStatus;
}

export interface SessionInfo {
  code: string;
  status: SessionStatus;
  gameType: GameType | null;
  hostId: string;
  players: PlayerInfo[];
  maxPlayers?: number;
}

export interface CreateSessionResponse {
  sessionCode: string;
  sessionId: string;
  token: string;
  player: PlayerInfo;
}

export interface JoinSessionResponse {
  sessionId: string;
  token: string;
  player: PlayerInfo;
  session: SessionInfo;
}

export type LobbyEvent =
  | { type: 'PLAYER_JOINED'; sessionCode: string; timestamp: string; player: PlayerInfo }
  | { type: 'PLAYER_LEFT'; sessionCode: string; timestamp: string; playerId: string; username: string }
  | { type: 'PLAYER_KICKED'; sessionCode: string; timestamp: string; playerId: string; username: string }
  | { type: 'HOST_TRANSFERRED'; sessionCode: string; timestamp: string; newHostId: string; newHostUsername: string }
  | { type: 'GAME_SELECTED'; sessionCode: string; timestamp: string; gameType: GameType }
  | { type: 'SESSION_STARTING'; sessionCode: string; timestamp: string; gameType: GameType; startsInSeconds: number };

export interface AvatarDef {
  id: string;
  emoji: string;
  label: string;
  bg: string;
  ring: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'avatar_beer',     emoji: '🍺', label: 'Beer Bro',      bg: 'from-amber-400 to-amber-600',   ring: 'ring-amber-400' },
  { id: 'avatar_wine',     emoji: '🍷', label: 'Wine Witch',    bg: 'from-rose-400 to-red-700',      ring: 'ring-rose-400' },
  { id: 'avatar_cocktail', emoji: '🍹', label: 'Cocktail King', bg: 'from-cyan-400 to-teal-600',     ring: 'ring-cyan-400' },
  { id: 'avatar_whiskey',  emoji: '🥃', label: 'Whiskey Wolf',  bg: 'from-orange-400 to-amber-700',  ring: 'ring-orange-400' },
  { id: 'avatar_dice',     emoji: '🎲', label: 'Dice Devil',    bg: 'from-indigo-400 to-violet-700', ring: 'ring-indigo-400' },
  { id: 'avatar_crown',    emoji: '👑', label: 'Party Royal',   bg: 'from-yellow-300 to-amber-500',  ring: 'ring-yellow-300' },
];

export interface GameDef {
  id: GameType;
  name: string;
  emoji: string;
  tagline: string;
  bg: string;
  border: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'KINGS_CUP',
    name: "King's Cup",
    emoji: '🃏',
    tagline: 'Draw a card, drink your fate. The classic never dies.',
    bg: 'from-purple-600/30 to-indigo-800/30',
    border: 'border-purple-500/40',
  },
  {
    id: 'HORSE_RACING',
    name: 'Horse Racing',
    emoji: '🏇',
    tagline: 'Bet on your horse and may the best tippler win!',
    bg: 'from-emerald-600/30 to-green-800/30',
    border: 'border-emerald-500/40',
  },
  {
    id: 'SCHOCKEN',
    name: 'Schocken',
    emoji: '🎲',
    tagline: 'The legendary German dice game. Bluff, bet, and drink.',
    bg: 'from-red-600/30 to-rose-800/30',
    border: 'border-red-500/40',
  },
];
