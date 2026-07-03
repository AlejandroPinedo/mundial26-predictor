import { describe, it, expect } from 'vitest'
import { isExactScore, exactScorePoints, EXACT_SCORE_BONUS } from './exactScore.js'

const S = (home: number | null, away: number | null, homePen: number | null = null, awayPen: number | null = null) => ({
  home, away, homePen, awayPen,
})

describe('isExactScore — partido normal', () => {
  it('acierta el marcador exacto', () => {
    expect(isExactScore(S(2, 1), S(2, 1))).toBe(true)
    expect(exactScorePoints(S(2, 1), S(2, 1))).toBe(EXACT_SCORE_BONUS)
  })
  it('falla si el marcador difiere', () => {
    expect(isExactScore(S(2, 0), S(2, 1))).toBe(false)
    expect(isExactScore(S(1, 2), S(2, 1))).toBe(false) // resultado invertido
    expect(exactScorePoints(S(2, 0), S(2, 1))).toBe(0)
  })
  it('sin resultado real o sin predicción → false', () => {
    expect(isExactScore(S(2, 1), S(null, null))).toBe(false)
    expect(isExactScore(S(null, null), S(2, 1))).toBe(false)
  })
})

describe('isExactScore — partido a penales', () => {
  it('acierta empate exacto Y tanda exacta', () => {
    expect(isExactScore(S(1, 1, 4, 3), S(1, 1, 4, 3))).toBe(true)
  })
  it('acierta el empate pero NO la tanda → false', () => {
    expect(isExactScore(S(1, 1, 5, 4), S(1, 1, 4, 3))).toBe(false)
    expect(isExactScore(S(1, 1, 3, 4), S(1, 1, 4, 3))).toBe(false) // ganador de tanda invertido
  })
  it('acierta la tanda pero NO el empate → false', () => {
    expect(isExactScore(S(0, 0, 4, 3), S(1, 1, 4, 3))).toBe(false)
  })
  it('predijo empate sin penales contra un partido que fue a penales → false', () => {
    expect(isExactScore(S(1, 1, null, null), S(1, 1, 4, 3))).toBe(false)
  })
})
