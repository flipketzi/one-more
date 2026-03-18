export const CardDeck = {
  rank: (card: string): string => card.slice(0, -1),
  suit: (card: string): string => card.slice(-1),
};
