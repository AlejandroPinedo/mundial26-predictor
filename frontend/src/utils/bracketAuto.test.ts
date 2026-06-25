import { describe, it, expect } from 'vitest'
import { tieOdds, autoFillFavorites } from './bracketAuto'

// Elo sintético: T0 el más fuerte, T31 el más débil (2000, 1999, ...).
const N = 32
const elo: Record<string, number> = {}
for (let i = 0; i < N; i++) elo[`T${i}`] = 2000 - i

describe('tieOdds', () => {
  it('elige al equipo de mayor Elo como favorito con prob > 0.5', () => {
    const o = tieOdds('T0', 'T31', elo)
    expect(o.favorite).toBe('T0')
    expect(o.favPct).toBeGreaterThan(0.5)
    expect(o.favPct).toBeLessThanOrEqual(1)
  })
  it('es simétrico (da igual el orden de los argumentos)', () => {
    const a = tieOdds('T5', 'T10', elo)
    const b = tieOdds('T10', 'T5', elo)
    expect(a.favorite).toBe('T5')
    expect(b.favorite).toBe('T5')
    expect(Math.abs(a.favPct - b.favPct)).toBeLessThan(1e-9)
  })
  it('devuelve favorito nulo si falta un equipo', () => {
    expect(tieOdds('T0', null, elo).favorite).toBeNull()
  })
})

describe('autoFillFavorites', () => {
  // 16 cruces de 32avos: cada par (T2i vs T2i+1) → gana el de menor índice (más fuerte).
  const r32 = Array.from({ length: 16 }, (_, i) => ({ home: `T${2 * i}`, away: `T${2 * i + 1}` }))

  it('rellena todas las rondas avanzando al favorito', () => {
    const b = autoFillFavorites(r32, elo)
    expect(b.round16.filter(Boolean)).toHaveLength(16)
    expect(b.quarter.filter(Boolean)).toHaveLength(8)
    expect(b.semi.filter(Boolean)).toHaveLength(4)
    expect(b.finalist.filter(Boolean)).toHaveLength(2)
    expect(b.champion.filter(Boolean)).toHaveLength(1)
  })

  it('octavos = los 16 equipos más fuertes (índices pares)', () => {
    const b = autoFillFavorites(r32, elo)
    const expected = new Set(Array.from({ length: 16 }, (_, i) => `T${2 * i}`))
    expect(new Set(b.round16)).toEqual(expected)
  })

  it('el equipo más fuerte del campo (T0) es el campeón', () => {
    const b = autoFillFavorites(r32, elo)
    expect(b.champion[0]).toBe('T0')
  })
})
