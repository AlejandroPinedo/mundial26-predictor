import { describe, it, expect } from 'vitest'
import { lockOraclePredictions, computeOracleEntry } from './lock.js'
import { predictMatch } from './predict.js'
import { currentElo, type EloMatch } from './elo.js'
import { HOST_NATIONS } from './ratings.js'

type FakeMatch = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
}

// Doble de la BD: responde a las consultas de lock.ts y registra los INSERT.
function makeFakeDb(matches: FakeMatch[]) {
  const locked: { match_id: string }[] = []
  const inserts: { match_id: string; home: number; away: number }[] = []
  const db = {
    inserts,
    locked,
    query: async (text: string, params?: unknown[]) => {
      if (text.includes('FROM matches WHERE stage')) return { rows: matches }
      if (text.includes('SELECT match_id FROM oracle_predictions')) return { rows: locked }
      if (text.includes('INSERT INTO oracle_predictions')) {
        const [match_id, home, away] = params as [string, number, number]
        locked.push({ match_id })
        inserts.push({ match_id, home, away })
        return { rows: [] }
      }
      if (text.includes('JOIN matches m ON op.match_id')) {
        const rows = inserts.map((i) => {
          const m = matches.find((mm) => mm.id === i.match_id)!
          return {
            predicted_home: i.home,
            predicted_away: i.away,
            home_score: m.home_score,
            away_score: m.away_score,
          }
        })
        return { rows }
      }
      return { rows: [] }
    },
  }
  return db
}

const expectedScore = (home: string, away: string, basis: EloMatch[]) =>
  predictMatch(home, away, { neutralVenue: !HOST_NATIONS.has(home), elo: currentElo(basis) })!.mostLikely

describe('lockOraclePredictions — regla de justicia', () => {
  // m1, m2 = jornada 1 (matchdayOneCount: 2); m3 = adaptativo.
  const baseMatches: FakeMatch[] = [
    { id: 'm1', home_team: 'España', away_team: 'Catar', match_date: '2026-06-11T19:00:00Z', home_score: null, away_score: null },
    { id: 'm2', home_team: 'Brasil', away_team: 'Argentina', match_date: '2026-06-12T19:00:00Z', home_score: null, away_score: null },
    { id: 'm3', home_team: 'Catar', away_team: 'España', match_date: '2026-06-18T19:00:00Z', home_score: null, away_score: null },
  ]

  it('congela la jornada 1 al inicio (aunque los partidos sean futuros) y no toca los demás', async () => {
    const db = makeFakeDb(structuredClone(baseMatches))
    const n = await lockOraclePredictions(db, { now: new Date('2026-06-01T00:00:00Z'), matchdayOneCount: 2 })

    expect(n).toBe(2)
    expect(db.inserts.map((i) => i.match_id).sort()).toEqual(['m1', 'm2'])

    // Usaron el Elo pre-torneo (base vacía).
    const m1 = db.inserts.find((i) => i.match_id === 'm1')!
    const exp = expectedScore('España', 'Catar', [])
    expect({ home: m1.home, away: m1.away }).toEqual({ home: exp.home, away: exp.away })
  })

  it('congela un partido adaptativo usando SOLO resultados anteriores, nunca el propio', async () => {
    const matches = structuredClone(baseMatches)
    matches[0].home_score = 4 // España 4-0 Catar (mueve el Elo)
    matches[0].away_score = 0
    matches[2].home_score = 0 // m3 ya tiene su propio resultado…
    matches[2].away_score = 3 // …que NO debe influir en su predicción

    const db = makeFakeDb(matches)
    const n = await lockOraclePredictions(db, { now: new Date('2026-06-20T00:00:00Z'), matchdayOneCount: 2 })

    expect(n).toBe(3)
    const m3 = db.inserts.find((i) => i.match_id === 'm3')!
    // Base correcta = solo m1 (fecha < m3), excluyendo el propio resultado de m3.
    const exp = expectedScore('Catar', 'España', [
      { home_team: 'España', away_team: 'Catar', home_score: 4, away_score: 0, match_date: '2026-06-11T19:00:00Z' },
    ])
    expect({ home: m3.home, away: m3.away }).toEqual({ home: exp.home, away: exp.away })
  })

  it('es idempotente: una segunda corrida no reescribe picks', async () => {
    const db = makeFakeDb(structuredClone(baseMatches))
    const opts = { now: new Date('2026-06-20T00:00:00Z'), matchdayOneCount: 2 }
    const first = await lockOraclePredictions(db, opts)
    const second = await lockOraclePredictions(db, opts)

    expect(first).toBe(3)
    expect(second).toBe(0)
    expect(db.inserts).toHaveLength(3)
  })
})

describe('computeOracleEntry', () => {
  it('puntúa con la misma regla que los usuarios (3 exacto / 1 resultado)', async () => {
    const matches: FakeMatch[] = [
      { id: 'm1', home_team: 'España', away_team: 'Catar', match_date: '2026-06-11T19:00:00Z', home_score: 2, away_score: 0 },
      { id: 'm2', home_team: 'Brasil', away_team: 'Argentina', match_date: '2026-06-12T19:00:00Z', home_score: null, away_score: null },
    ]
    const db = makeFakeDb(matches)
    await lockOraclePredictions(db, { now: new Date('2026-06-20T00:00:00Z'), matchdayOneCount: 2 })

    const entry = await computeOracleEntry(db)
    expect(entry).not.toBeNull()
    expect(entry!.username).toBe('Pez Oráculo')
    expect(entry!.is_oracle).toBe(true)
    // 2 picks congelados; solo m1 tiene resultado → puntaje entre 0 y 3.
    expect(entry!.total_predictions).toBe('2')
    expect(Number(entry!.total_points)).toBeGreaterThanOrEqual(0)
    expect(Number(entry!.total_points)).toBeLessThanOrEqual(3)
  })

  it('devuelve null cuando no hay predicciones', async () => {
    const db = makeFakeDb([])
    expect(await computeOracleEntry(db)).toBeNull()
  })

  it('suma puntos de grupo + bracket con los pesos correctos', async () => {
    // Doble directo: 1 acierto exacto de grupo (3 pts) + bracket campeón (10) + semi (4).
    const db = {
      query: async (text: string) => {
        if (text.includes('JOIN matches m ON op.match_id')) {
          return { rows: [{ predicted_home: 2, predicted_away: 1, home_score: 2, away_score: 1 }] }
        }
        if (text.includes('JOIN bracket_results')) {
          return { rows: [{ round: 'champion' }, { round: 'semi' }] }
        }
        return { rows: [] }
      },
    }
    const entry = await computeOracleEntry(db)
    expect(entry).not.toBeNull()
    expect(entry!.total_points).toBe('17') // 3 + 10 + 4
  })
})
