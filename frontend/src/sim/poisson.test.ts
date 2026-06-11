import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'
import { samplePoisson } from './poisson'

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
