import { describe, it, expect } from 'vitest'
import { calculateGroupStandings, getBestThirdPlacedTeams, type TeamStats } from './standings'

type M = { id: string; home_team: string; away_team: string; group_name: string; home_score: number | null; away_score: number | null }
const m = (id: string, h: string, a: string, hs: number, as: number, g = 'X'): M => ({
  id, home_team: h, away_team: a, group_name: g, home_score: hs, away_score: as,
})

describe('calculateGroupStandings — desempate FIFA 2026', () => {
  it('los enfrentamientos directos pesan más que la diferencia de goles general', () => {
    // ALFA y BETA terminan empatados a 6 pts. BETA tiene MUCHA mejor DG general
    // (+9 vs +3) porque golea a los débiles, pero ALFA le ganó 1-0 en el directo
    // → con la regla FIFA 2026, ALFA va por delante de BETA.
    // GAMA y DELTA empatan a 3; DELTA le ganó a GAMA en el directo → DELTA delante.
    const matches = [
      m('1', 'ALFA', 'BETA', 1, 0),
      m('2', 'ALFA', 'GAMA', 0, 1),
      m('3', 'ALFA', 'DELTA', 3, 0),
      m('4', 'BETA', 'GAMA', 5, 0),
      m('5', 'BETA', 'DELTA', 5, 0),
      m('6', 'GAMA', 'DELTA', 0, 1),
    ]
    const table = calculateGroupStandings(matches, {})['X']
    expect(table.map((t) => t.team)).toEqual(['ALFA', 'BETA', 'DELTA', 'GAMA'])
    // El orden ANTERIOR (DG general) habría puesto BETA(+9) sobre ALFA(+3).
    expect(table[0].team).toBe('ALFA')
    expect(table.find((t) => t.team === 'BETA')!.gd).toBeGreaterThan(table[0].gd)
  })

  it('si el head-to-head no separa, decide la diferencia de goles general', () => {
    const matches = [
      m('1', 'ALFA', 'BETA', 1, 1), // empate directo → H2H igualado
      m('2', 'ALFA', 'GAMA', 3, 0), // ALFA suma mejor DG general
      m('3', 'BETA', 'GAMA', 1, 0),
    ]
    const table = calculateGroupStandings(matches, {})['X']
    // ALFA y BETA: 4 pts; H2H empatado → DG general ALFA(+3) > BETA(+1)
    expect(table.slice(0, 2).map((t) => t.team)).toEqual(['ALFA', 'BETA'])
  })

  it('usa predicciones cuando no hay resultado real', () => {
    const matches = [m('1', 'ALFA', 'BETA', null as unknown as number, null as unknown as number)]
    const table = calculateGroupStandings(matches, { '1': { match_id: '1', predicted_home: 2, predicted_away: 0 } })['X']
    expect(table[0].team).toBe('ALFA')
    expect(table[0].pts).toBe(3)
  })
})

describe('getBestThirdPlacedTeams — criterios generales entre grupos', () => {
  it('ordena por puntos y luego DG (sin head-to-head entre grupos)', () => {
    const standings: Record<string, TeamStats[]> = {
      A: [
        { team: 'W_A', mp: 3, w: 3, d: 0, l: 0, gf: 9, ga: 0, gd: 9, pts: 9 },
        { team: 'R_A', mp: 3, w: 2, d: 0, l: 1, gf: 5, ga: 3, gd: 2, pts: 6 },
        { team: 'T_A', mp: 3, w: 1, d: 0, l: 2, gf: 4, ga: 4, gd: 0, pts: 3 },
      ],
      B: [
        { team: 'W_B', mp: 3, w: 3, d: 0, l: 0, gf: 7, ga: 1, gd: 6, pts: 9 },
        { team: 'R_B', mp: 3, w: 2, d: 0, l: 1, gf: 6, ga: 4, gd: 2, pts: 6 },
        { team: 'T_B', mp: 3, w: 1, d: 0, l: 2, gf: 6, ga: 4, gd: 2, pts: 3 },
      ],
    }
    const thirds = getBestThirdPlacedTeams(standings)
    // T_B (3 pts, DG +2) por delante de T_A (3 pts, DG 0)
    expect(thirds.map((t) => t.team)).toEqual(['T_B', 'T_A'])
  })
})
