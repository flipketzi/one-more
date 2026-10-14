import { evaluateHand } from './evaluate'

describe('evaluateHand', () => {
  // ── Schock Out ────────────────────────────────────────────────────────────

  it('returns Schock Out for 1-1-1', () => {
    const result = evaluateHand([1, 1, 1], false)
    expect(result.name).toBe('Schock Out')
    expect(result.lids).toBe(13)
    expect(result.rank).toBe(10000)
  })

  // ── Schock X ─────────────────────────────────────────────────────────────

  it('returns Schock 2 for 1-1-2', () => {
    const result = evaluateHand([2, 1, 1], false)
    expect(result.name).toBe('Schock 2')
    expect(result.lids).toBe(2)
    expect(result.rank).toBe(9020)
  })

  it('returns Schock 4 for 1-1-4 (any order)', () => {
    const result = evaluateHand([4, 1, 1], false)
    expect(result.name).toBe('Schock 4')
    expect(result.lids).toBe(4)
    expect(result.rank).toBe(9040)
  })

  it('returns Schock 6 for 1-1-6', () => {
    const result = evaluateHand([1, 6, 1], false)
    expect(result.name).toBe('Schock 6')
    expect(result.lids).toBe(6)
    expect(result.rank).toBe(9060)
  })

  // ── Jule ─────────────────────────────────────────────────────────────────

  it('returns Jule for 1-2-4 without kept dice', () => {
    const result = evaluateHand([4, 1, 2], false)
    expect(result.name).toBe('Jule')
    expect(result.lids).toBe(7)
    expect(result.rank).toBe(8700)
  })

  it('degrades Jule to normal hand when hadKeptDice=true', () => {
    const result = evaluateHand([1, 2, 4], true)
    expect(result.name).toBe('4-2-1')
    expect(result.lids).toBe(1)
    expect(result.rank).toBe(421)
  })

  // ── General ───────────────────────────────────────────────────────────────

  it('returns General 2 for 2-2-2 without kept dice', () => {
    const result = evaluateHand([2, 2, 2], false)
    expect(result.name).toBe('General 2')
    expect(result.lids).toBe(3)
    expect(result.rank).toBe(8020)
  })

  it('returns General 5 for 5-5-5 without kept dice', () => {
    const result = evaluateHand([5, 5, 5], false)
    expect(result.name).toBe('General 5')
    expect(result.lids).toBe(3)
    expect(result.rank).toBe(8050)
  })

  it('degrades General to normal hand when hadKeptDice=true', () => {
    const result = evaluateHand([5, 5, 5], true)
    expect(result.name).toBe('5-5-5')
    expect(result.lids).toBe(1)
    expect(result.rank).toBe(555)
  })

  // ── Straße ────────────────────────────────────────────────────────────────

  it('returns Straße 1-2-3 for [3,1,2] without kept dice', () => {
    const result = evaluateHand([3, 1, 2], false)
    expect(result.name).toBe('Straße 1-2-3')
    expect(result.lids).toBe(2)
    expect(result.rank).toBe(7400)
  })

  it('returns Straße 2-3-4 without kept dice', () => {
    const result = evaluateHand([2, 3, 4], false)
    expect(result.name).toBe('Straße 2-3-4')
    expect(result.rank).toBe(7300)
  })

  it('returns Straße 3-4-5 without kept dice', () => {
    const result = evaluateHand([4, 3, 5], false)
    expect(result.name).toBe('Straße 3-4-5')
    expect(result.rank).toBe(7200)
  })

  it('returns Straße 4-5-6 without kept dice', () => {
    const result = evaluateHand([6, 4, 5], false)
    expect(result.name).toBe('Straße 4-5-6')
    expect(result.lids).toBe(2)
    expect(result.rank).toBe(7100)
  })

  it('degrades Straße to normal hand when hadKeptDice=true', () => {
    const result = evaluateHand([1, 2, 3], true)
    expect(result.name).toBe('3-2-1')
    expect(result.lids).toBe(1)
    expect(result.rank).toBe(321)
  })

  // ── Normal hand ───────────────────────────────────────────────────────────

  it('returns normal hand with rank c*100+b*10+a', () => {
    const result = evaluateHand([6, 3, 5], false)
    expect(result.name).toBe('6-5-3')
    expect(result.lids).toBe(1)
    expect(result.rank).toBe(653)
  })

  it('sorts values correctly for normal hand name regardless of input order', () => {
    // [5, 3, 1] → sorted [1,3,5] → no special hand → name '5-3-1'
    const result = evaluateHand([5, 3, 1], false)
    expect(result.name).toBe('5-3-1')
  })

  // ── Rank ordering ─────────────────────────────────────────────────────────

  it('Schock Out ranks higher than Schock 6', () => {
    expect(evaluateHand([1, 1, 1], false).rank).toBeGreaterThan(evaluateHand([1, 1, 6], false).rank)
  })

  it('Schock 2 ranks higher than Jule', () => {
    expect(evaluateHand([1, 1, 2], false).rank).toBeGreaterThan(evaluateHand([1, 2, 4], false).rank)
  })

  it('Jule ranks higher than General 6', () => {
    expect(evaluateHand([1, 2, 4], false).rank).toBeGreaterThan(evaluateHand([6, 6, 6], false).rank)
  })

  it('General 2 ranks higher than Straße 1-2-3', () => {
    expect(evaluateHand([2, 2, 2], false).rank).toBeGreaterThan(evaluateHand([1, 2, 3], false).rank)
  })

  it('Straße 4-5-6 ranks higher than best normal hand 6-5-4', () => {
    expect(evaluateHand([4, 5, 6], false).rank).toBeGreaterThan(evaluateHand([4, 5, 6], true).rank)
  })
})
