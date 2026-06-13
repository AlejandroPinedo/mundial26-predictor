import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'
import { samplePoisson, poissonPmf } from './poisson'

describe('samplePoisson', () => {
  it('returns 0 for lambda <= 0', () => {
    const rng = mulberry32(1)
    expect(samplePoisson(0, rng)).toBe(0)
    expect(samplePoisson(-1, rng)).toBe(0)
  })

  it('sample mean approximates lambda', () => {
    const rng = mulberry32(7)
    const n = 20000
    let sum = 0
    for (let i = 0; i < n; i++) sum += samplePoisson(1.3, rng)
    const mean = sum / n
    expect(mean).toBeGreaterThan(1.25)
    expect(mean).toBeLessThan(1.35)
  })

  it('returns non-negative integers', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 1000; i++) {
      const v = samplePoisson(2.0, rng)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('poissonPmf', () => {
  it('sums to ~1 over a wide support', () => {
    for (const lambda of [0.5, 1.3, 3.0]) {
      let sum = 0
      for (let k = 0; k <= 30; k++) sum += poissonPmf(k, lambda)
      expect(sum).toBeCloseTo(1, 6)
    }
  })

  it('matches known values', () => {
    // P(0; λ) = e^-λ
    expect(poissonPmf(0, 1.3)).toBeCloseTo(Math.exp(-1.3), 10)
    // P(2; 2) = e^-2 · 2^2 / 2! = 2 e^-2
    expect(poissonPmf(2, 2)).toBeCloseTo(2 * Math.exp(-2), 10)
  })

  it('mean equals lambda', () => {
    const lambda = 2.4
    let mean = 0
    for (let k = 0; k <= 40; k++) mean += k * poissonPmf(k, lambda)
    expect(mean).toBeCloseTo(lambda, 6)
  })

  it('handles degenerate lambda and invalid k', () => {
    expect(poissonPmf(0, 0)).toBe(1)
    expect(poissonPmf(1, 0)).toBe(0)
    expect(poissonPmf(-1, 1.3)).toBe(0)
    expect(poissonPmf(1.5, 1.3)).toBe(0)
  })
})
