import { describe, it, expect } from 'vitest'
import { ELO_RATINGS } from '../utils/ratings'
import { currentElo, expectedHome, movMultiplier, updateElo } from './elo'

describe('expectedHome', () => {
  it('es 0.5 entre iguales en sede neutral', () => {
    expect(expectedHome(1500, 1500, true)).toBeCloseTo(0.5, 10)
  })
  it('la ventaja de localía sube la expectativa por encima de 0.5', () => {
    expect(expectedHome(1500, 1500, false)).toBeGreaterThan(0.5)
  })
})

describe('movMultiplier', () => {
  it('coincide con la tabla de eloratings.net', () => {
    expect(movMultiplier(1)).toBe(1)
    expect(movMultiplier(2)).toBe(1.5)
    expect(movMultiplier(3)).toBe(1.75)
    expect(movMultiplier(5)).toBeCloseTo(2.0, 10) // 1.75 + (5-3)/8
  })
})

describe('updateElo', () => {
  it('no cambia el Elo en un empate entre iguales', () => {
    const [h, a] = updateElo(1500, 1500, 1, 1, { neutral: true })
    expect(h).toBeCloseTo(1500, 10)
    expect(a).toBeCloseTo(1500, 10)
  })

  it('conserva los puntos (lo que gana uno lo pierde el otro)', () => {
    const [h, a] = updateElo(1800, 1500, 2, 0, { neutral: true })
    expect(h - 1800).toBeCloseTo(1500 - a, 10)
  })

  it('una sorpresa mueve más el Elo que un resultado esperado', () => {
    const [favWins] = updateElo(1800, 1500, 1, 0, { neutral: true }) // favorito gana (esperado)
    const [underdogWins] = updateElo(1500, 1800, 1, 0, { neutral: true }) // débil gana (sorpresa)
    expect(favWins - 1800).toBeGreaterThan(0)
    expect(underdogWins - 1500).toBeGreaterThan(favWins - 1800)
  })

  it('con localía el local gana menos puntos por la misma victoria', () => {
    const [hNeutral] = updateElo(1800, 1500, 2, 0, { neutral: true })
    const [hHome] = updateElo(1800, 1500, 2, 0, { neutral: false })
    expect(hHome - 1800).toBeLessThan(hNeutral - 1800)
  })
})

describe('currentElo', () => {
  const matches = [
    { home_team: 'Catar', away_team: 'España', home_score: 2, away_score: 0, match_date: '2026-06-12T00:00:00Z' },
    { home_team: 'México', away_team: 'Estados Unidos', home_score: null, away_score: null, match_date: '2026-06-13T00:00:00Z' },
  ]

  it('un resultado real mueve el Elo en la dirección correcta', () => {
    const elo = currentElo(matches)
    expect(elo['Catar']).toBeGreaterThan(ELO_RATINGS['Catar'])
    expect(elo['España']).toBeLessThan(ELO_RATINGS['España'])
  })

  it('ignora los partidos sin marcador', () => {
    const elo = currentElo(matches)
    expect(elo['México']).toBe(ELO_RATINGS['México'])
    expect(elo['Estados Unidos']).toBe(ELO_RATINGS['Estados Unidos'])
  })

  it('es determinista e independiente del orden de entrada', () => {
    const a = currentElo(matches)
    const b = currentElo([...matches].reverse())
    expect(a).toEqual(b)
  })
})
