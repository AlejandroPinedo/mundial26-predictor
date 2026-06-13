import { describe, it, expect } from 'vitest'
import { computeForm } from './recentForm'

const m = (home: string, away: string, hs: number | null, as: number | null, date: string) =>
  ({ home_team: home, away_team: away, home_score: hs, away_score: as, match_date: date })

describe('computeForm', () => {
  it('ignora partidos sin marcador', () => {
    const f = computeForm([m('A', 'B', null, null, '2026-06-12')])
    expect(f).toEqual({})
  })

  it('calcula resultados, GF y GC por equipo', () => {
    const f = computeForm([
      m('A', 'B', 2, 0, '2026-06-12'), // A gana, B pierde
      m('C', 'A', 1, 1, '2026-06-13'), // empate
    ])
    expect(f['A'].results).toEqual(['W', 'D'])
    expect(f['A'].played).toBe(2)
    expect(f['A'].gf).toBeCloseTo((2 + 1) / 2, 6)
    expect(f['A'].ga).toBeCloseTo((0 + 1) / 2, 6)
    expect(f['B'].results).toEqual(['L'])
    expect(f['C'].results).toEqual(['D'])
  })

  it('respeta el orden cronológico y toma los últimos n', () => {
    const f = computeForm([
      m('A', 'X', 1, 0, '2026-06-10'),
      m('X', 'A', 0, 3, '2026-06-12'), // A gana de visita (más reciente)
      m('A', 'Y', 0, 2, '2026-06-11'),
    ], 2)
    // orden cronológico: 06-10 (W), 06-11 (L), 06-12 (W) → últimos 2: [L, W]
    expect(f['A'].results).toEqual(['L', 'W'])
    expect(f['A'].played).toBe(2)
  })
})
