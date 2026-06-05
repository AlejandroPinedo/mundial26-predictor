import { describe, it, expect } from 'vitest'
import { calculatePoints } from './scoring'

describe('calculatePoints', () => {
  it('returns 3 for exact score match', () => {
    expect(calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(99)
  })

  it('returns 1 for correct result but wrong score', () => {
    expect(calculatePoints({ home: 1, away: 0 }, { home: 3, away: 1 })).toBe(1)
  })

  it('returns 0 for wrong result', () => {
    expect(calculatePoints({ home: 1, away: 0 }, { home: 0, away: 1 })).toBe(0)
  })

  it('returns 1 for correct draw prediction', () => {
    expect(calculatePoints({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(1)
  })

  it('returns 3 for exact draw score', () => {
    expect(calculatePoints({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3)
  })
})