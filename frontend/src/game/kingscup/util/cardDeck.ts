export const CardDeck = {
  rank: (card: string): string => card.slice(0, -1),
  suit: (card: string): string => card.slice(-1),
};

export const CARD_RULES: Record<string, { emoji: string; title: string; description: string }> = {
  '2': { emoji: '2️⃣', title: 'You', description: 'Pick someone to take a sip.' },
  '3': { emoji: '3️⃣', title: 'Me', description: 'The drawer drinks!' },
  '4': { emoji: '4️⃣', title: 'Floor', description: 'Last to touch the floor drinks!' },
  '5': { emoji: '5️⃣', title: 'Guys', description: 'All guys drink!' },
  '6': { emoji: '6️⃣', title: 'Chicks', description: 'All girls drink!' },
  '7': { emoji: '7️⃣', title: 'Heaven', description: 'Last to raise their hand drinks!' },
  '8': { emoji: '8️⃣', title: 'Mate', description: 'Pick a drinking buddy! You drink together.' },
  '9': { emoji: '9️⃣', title: 'Rhyme', description: 'Say a word — go around rhyming. First to fail drinks!' },
  '10': { emoji: '🔟', title: 'Categories', description: 'Name something in the category. First to fail drinks!' },
  'J': { emoji: '🃏', title: 'Rule', description: 'Make a new rule for the game!' },
  'Q': { emoji: '👑', title: 'Thumb Queen', description: 'You\'re the Thumb Queen! Put your thumb on the table anytime — last to notice drinks.' },
  'K': { emoji: '👑', title: 'King\'s Cup', description: 'Pour some of your drink into the King\'s Cup. Last king drawn must drink it all!' },
  'A': { emoji: '🌊', title: 'Waterfall', description: 'Start drinking — everyone follows! You can only stop when the person to your right stops.' },
};
