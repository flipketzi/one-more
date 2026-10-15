const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥', D: '♦', C: '♣', S: '♠',
};

export const CardDeck = {
  rank: (card: string): string => card.slice(0, -1),
  suit: (card: string): string => card.slice(-1),
  suitSymbol: (card: string): string => SUIT_SYMBOLS[card.slice(-1)] ?? '',
};
