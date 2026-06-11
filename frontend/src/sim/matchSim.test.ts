import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'
import { winExpectancy, eloToLambdas, resolveShootout, BASE_LAMBDA } from './matchSim'

describe('winExpectancy', () => {
  it('is 0.5 for equal ratings', () => {
    expect(winExpectancy(0, 1)).toBe(0.5)
  })

  it('is symmetric: pH(d) + pH(-d) = 1', () => {
    for (const d of [50, 150, 400, 800]) {
      expect(winExpectancy(d, 1) + winExpectancy(-d, 1)).toBeCloseTo(1, 10)
    }
  })

  it('higher tau flattens probabilities toward 0.5', () => {
    const sharp = winExpectancy(300, 1)
    const flat = winExpectancy(300, 3)
    expect(sharp).toBeGreaterThan(flat)
    expect(flat).toBeGreaterThan(0.5)
  })
})

describe('eloToLambdas', () => {
  it('splits goals evenly for equal teams', () => {
    const [h, a] = eloToLambdas(1800, 1800, 1)
    expect(h).toBeCloseTo(BASE_LAMBDA, 10)
    expect(a).toBeCloseTo(BASE_LAMBDA, 10)
  })

  it('conserves total expected goals', () => {
    const [h, a] = eloToLambdas(2100, 1500, 1)
    expect(h + a).toBeCloseTo(BASE_LAMBDA * 2, 10)
  })

  it('gives the favorite the larger lambda', () => {
    const [h, a] = eloToLambdas(2100, 1500, 1)
    expect(h).toBeGreaterThan(a)
  })
})

describe('resolveShootout', () => {
  it('is bounded: favorite wins between 40% and 60% empirically', () => {
    const rng = mulberry32(5)
    const n = 10000
    let homeWins = 0
    for (let i = 0; i < n; i++) {
      if (resolveShootout(2200, 1400, 1, rng) === 'home') homeWins++
    }
    const rate = homeWins / n
    expect(rate).toBeGreaterThan(0.5)
    expect(rate).toBeLessThanOrEqual(0.62)
  })
})
