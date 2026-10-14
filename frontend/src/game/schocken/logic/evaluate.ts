export interface HandResult {
  name: string;
  lids: number;
  rank: number;
}

export function evaluateHand(values: number[], hadKeptDice: boolean): HandResult {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;

  // Schock Out: 1-1-1
  if (a === 1 && b === 1 && c === 1) return { name: 'Schock Out', lids: 13, rank: 10000 };

  // Schock X: 1-1-X
  if (a === 1 && b === 1) return { name: `Schock ${c}`, lids: c, rank: 9000 + c * 10 };

  // Jule: 1-2-4 (only without kept dice)
  if (!hadKeptDice && a === 1 && b === 2 && c === 4) return { name: 'Jule', lids: 7, rank: 8700 };

  // General X: X-X-X (only without kept dice)
  if (!hadKeptDice && a === b && b === c) return { name: `General ${a}`, lids: 3, rank: 8000 + a * 10 };

  // Straße (only without kept dice)
  if (!hadKeptDice) {
    const straßen = [
      { combo: [1, 2, 3], rank: 7400, name: 'Straße 1-2-3' },
      { combo: [2, 3, 4], rank: 7300, name: 'Straße 2-3-4' },
      { combo: [3, 4, 5], rank: 7200, name: 'Straße 3-4-5' },
      { combo: [4, 5, 6], rank: 7100, name: 'Straße 4-5-6' },
    ];
    for (const s of straßen) {
      if (sorted[0] === s.combo[0] && sorted[1] === s.combo[1] && sorted[2] === s.combo[2]) {
        return { name: s.name, lids: 2, rank: s.rank };
      }
    }
  }

  // Normal: rank = c*100 + b*10 + a
  const rank = c * 100 + b * 10 + a;
  return { name: `${c}-${b}-${a}`, lids: 1, rank };
}
