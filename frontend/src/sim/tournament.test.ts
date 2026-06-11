import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'
import { prepareTournament, simulateOnce, STAGE, type ApiMatch, type SimConfig } from './tournament'
import { runSimulation } from './runner'

// Grupos reales del Mundial 2026 (mismos nombres que la BD/flags.ts)
const GROUPS: Record<string, string[]> = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'República Checa'],
  B: ['Canadá', 'Bosnia y Herzegovina', 'Catar', 'Suiza'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudí', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Irak', 'Noruega'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'República Democrática del Congo', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
}

// Round-robin de 6 partidos por grupo → 72 partidos, sin resultados
function buildFixture(): ApiMatch[] {
  const matches: ApiMatch[] = []
  const pairs = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
  for (const [g, teams] of Object.entries(GROUPS)) {
    pairs.forEach(([i, j], k) => {
      matches.push({
        id: `${g}${k}`,
        home_team: teams[i],
        away_team: teams[j],
        group_name: g,
        home_score: null,
        away_score: null,
      })
    })
  }
  return matches
}

const CONFIG: SimConfig = { iterations: 300, surprise: 0, squadWeight: 0, hostBoost: false, seed: 42 }

describe('prepareTournament', () => {
  it('validates and indexes the 48 teams', () => {
    const prep = prepareTournament(buildFixture(), CONFIG)
    expect(prep.teams).toHaveLength(48)
    expect(prep.matches).toHaveLength(72)
    expect(prep.teamIndex.get('España')).toBeDefined()
  })

  it('throws on incomplete data', () => {
    const partial = buildFixture().slice(0, 30)
    expect(() => prepareTournament(partial, CONFIG)).toThrow()
  })

  it('host boost raises rating only for hosts when enabled', () => {
    const fixture = buildFixture()
    const off = prepareTournament(fixture, { ...CONFIG, hostBoost: false })
    const on = prepareTournament(fixture, { ...CONFIG, hostBoost: true })
    const mx = off.teamIndex.get('México')!
    const es = off.teamIndex.get('España')!
    expect(on.elos[mx]).toBe(off.elos[mx] + 100)
    expect(on.elos[es]).toBe(off.elos[es])
  })
})

describe('simulateOnce — invariantes por iteración', () => {
  it('produces a structurally valid tournament', () => {
    const prep = prepareTournament(buildFixture(), CONFIG)
    const rng = mulberry32(7)
    for (let i = 0; i < 20; i++) {
      const r = simulateOnce(prep, 1, rng)
      expect(r.groupWinners).toHaveLength(12)
      const countAtLeast = (s: number) => r.stageReached.filter(v => v >= s).length
      expect(countAtLeast(STAGE.R32)).toBe(32)
      expect(countAtLeast(STAGE.R16)).toBe(16)
      expect(countAtLeast(STAGE.QF)).toBe(8)
      expect(countAtLeast(STAGE.SF)).toBe(4)
      expect(countAtLeast(STAGE.FINAL)).toBe(2)
      expect(countAtLeast(STAGE.CHAMPION)).toBe(1)
      expect(r.stageReached[r.championIdx]).toBe(STAGE.CHAMPION)
    }
  })
})

describe('runSimulation', () => {
  it('is deterministic for a fixed seed', () => {
    const fixture = buildFixture()
    const a = runSimulation(fixture, CONFIG)
    const b = runSimulation(fixture, CONFIG)
    expect(a.teams).toEqual(b.teams)
    expect(a.degenerateIterations).toBe(b.degenerateIterations)
  })

  it('locked real results are never re-simulated', () => {
    const fixture = buildFixture()
    // Grupo A jugado por completo: México gana todo, Sudáfrica segunda
    const scores: Record<string, [number, number]> = {
      A0: [3, 0], A1: [2, 1], A2: [2, 0], A3: [0, 1], A4: [1, 0], A5: [0, 2],
    }
    for (const m of fixture) {
      if (scores[m.id]) {
        m.home_score = scores[m.id][0]
        m.away_score = scores[m.id][1]
      }
    }
    const results = runSimulation(fixture, { ...CONFIG, iterations: 200 })
    const mexico = results.teams.find(t => t.team === 'México')!
    expect(mexico.winGroup).toBe(1)   // gana el grupo en el 100% de las iteraciones
    expect(mexico.r32).toBe(1)
  })

  it('favorites outperform minnows with surprise = 0', () => {
    const results = runSimulation(buildFixture(), { ...CONFIG, iterations: 500 })
    const spain = results.teams.find(t => t.team === 'España')!
    const qatar = results.teams.find(t => t.team === 'Catar')!
    expect(spain.champion).toBeGreaterThan(qatar.champion)
    expect(spain.sf).toBeGreaterThan(qatar.sf)
  })

  it('high surprise flattens probabilities', () => {
    const sharp = runSimulation(buildFixture(), { ...CONFIG, iterations: 500 })
    const flat = runSimulation(buildFixture(), { ...CONFIG, iterations: 500, surprise: 100 })
    const top = (r: typeof sharp) => r.teams[0].champion
    expect(top(flat)).toBeLessThan(top(sharp))
  })

  it('reports progress in monotonic chunks', () => {
    const calls: number[] = []
    runSimulation(buildFixture(), { ...CONFIG, iterations: 600 }, done => calls.push(done))
    expect(calls).toEqual([250, 500, 600])
  })
})

describe('aggregate — consistencia de probabilidades', () => {
  it('champion probabilities sum to 1 and group wins to 12', () => {
    const results = runSimulation(buildFixture(), { ...CONFIG, iterations: 400 })
    const sumChampion = results.teams.reduce((s, t) => s + t.champion, 0)
    const sumWinGroup = results.teams.reduce((s, t) => s + t.winGroup, 0)
    expect(sumChampion).toBeCloseTo(1, 6)
    expect(sumWinGroup).toBeCloseTo(12, 6)
  })
})
