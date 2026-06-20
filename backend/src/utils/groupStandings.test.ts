import { describe, it, expect } from 'vitest'
import { computeGroupStandings, type MatchRow } from './groupStandings.js'

const m = (h: string, a: string, hs: number, as: number): MatchRow => ({
  home_team: h, away_team: a, home_score: hs, away_score: as,
})

describe('computeGroupStandings — desempate FIFA 2026', () => {
  it('los enfrentamientos directos pesan más que la DG general', () => {
    const rows = computeGroupStandings([
      m('ALFA', 'BETA', 1, 0),
      m('ALFA', 'GAMA', 0, 1),
      m('ALFA', 'DELTA', 3, 0),
      m('BETA', 'GAMA', 5, 0),
      m('BETA', 'DELTA', 5, 0),
      m('GAMA', 'DELTA', 0, 1),
    ])
    expect(rows.map((r) => r.team)).toEqual(['ALFA', 'BETA', 'DELTA', 'GAMA'])
    const beta = rows.find((r) => r.team === 'BETA')!
    const alfa = rows.find((r) => r.team === 'ALFA')!
    expect(alfa.points).toBe(6)
    expect(beta.points).toBe(6)
    expect(beta.gd).toBeGreaterThan(alfa.gd) // BETA mejor DG general pero va detrás
  })

  it('coincide con stats correctas (PJ/G/E/P)', () => {
    const rows = computeGroupStandings([m('ALFA', 'BETA', 2, 1), m('ALFA', 'GAMA', 0, 0)])
    const alfa = rows.find((r) => r.team === 'ALFA')!
    expect(alfa).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, gf: 2, ga: 1, gd: 1, points: 4 })
  })

  it('devuelve [] si aún no hay partidos jugados', () => {
    const rows = computeGroupStandings([{ home_team: 'ALFA', away_team: 'BETA', home_score: null, away_score: null }])
    expect(rows).toEqual([])
  })
})
