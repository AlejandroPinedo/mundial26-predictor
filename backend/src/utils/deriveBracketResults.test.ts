import { describe, it, expect } from 'vitest'
import {
  deriveBracketResults,
  winnerOf,
  wentToShootout,
  type KoMatchRow,
} from './deriveBracketResults.js'

const mk = (o: Partial<KoMatchRow> & { stage: string; home_team: string; away_team: string }): KoMatchRow => ({
  home_score: null,
  away_score: null,
  home_pen: null,
  away_pen: null,
  ...o,
})

describe('winnerOf', () => {
  it('gana el de mayor marcador en el tiempo', () => {
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 2, away_score: 1 }))).toBe('Brasil')
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 0, away_score: 3 }))).toBe('Chile')
  })
  it('empate → lo define la tanda de penales', () => {
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 1, away_score: 1, home_pen: 4, away_pen: 5 }))).toBe('Chile')
  })
  it('empate sin penales (o penales iguales) → indeciso (null)', () => {
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 1, away_score: 1 }))).toBeNull()
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 1, away_score: 1, home_pen: 3, away_pen: 3 }))).toBeNull()
  })
  it('sin marcador → null', () => {
    expect(winnerOf(mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile' }))).toBeNull()
  })
})

describe('wentToShootout', () => {
  it('empate en el tiempo + tanda con ganador → true', () => {
    expect(wentToShootout(mk({ stage: 'Octavos', home_team: 'A', away_team: 'B', home_score: 0, away_score: 0, home_pen: 5, away_pen: 4 }))).toBe(true)
  })
  it('victoria en el tiempo → false', () => {
    expect(wentToShootout(mk({ stage: 'Octavos', home_team: 'A', away_team: 'B', home_score: 2, away_score: 1 }))).toBe(false)
  })
})

describe('deriveBracketResults', () => {
  it('mapea el GANADOR de cada etapa a la ronda de avance correcta', () => {
    const { resultsByRound } = deriveBracketResults([
      mk({ stage: 'Dieciseisavos', home_team: 'México', away_team: 'Perú', home_score: 3, away_score: 0 }),
      mk({ stage: 'Octavos', home_team: 'Brasil', away_team: 'Chile', home_score: 2, away_score: 1 }),
      mk({ stage: 'Cuartos', home_team: 'Francia', away_team: 'Italia', home_score: 1, away_score: 0 }),
      mk({ stage: 'Semifinales', home_team: 'España', away_team: 'Alemania', home_score: 0, away_score: 2 }),
      mk({ stage: 'Final', home_team: 'Argentina', away_team: 'Portugal', home_score: 3, away_score: 2 }),
    ])
    expect(resultsByRound).toEqual({
      round16: ['México'],
      quarter: ['Brasil'],
      semi: ['Francia'],
      finalist: ['Alemania'],
      champion: ['Argentina'],
    })
  })

  it('acumula varios ganadores en la misma ronda y omite empates sin penales', () => {
    const { resultsByRound } = deriveBracketResults([
      mk({ stage: 'Dieciseisavos', home_team: 'México', away_team: 'Perú', home_score: 3, away_score: 0 }),
      mk({ stage: 'Dieciseisavos', home_team: 'Brasil', away_team: 'Chile', home_score: 1, away_score: 1, home_pen: 5, away_pen: 4 }),
      mk({ stage: 'Dieciseisavos', home_team: 'Japón', away_team: 'Corea del Sur', home_score: 0, away_score: 0 }), // sin penales → omitido
    ])
    expect(resultsByRound.round16.sort()).toEqual(['Brasil', 'México'])
  })

  it('registra tandas reales bajo la ronda que el usuario predice (desfase de una ronda)', () => {
    const { shootoutTies } = deriveBracketResults([
      // Octavos a penales → el usuario lo predijo en la vista "round16"
      mk({ stage: 'Octavos', home_team: 'Chile', away_team: 'Brasil', home_score: 1, away_score: 1, home_pen: 3, away_pen: 4 }),
      // Final a penales → ronda "finalist"
      mk({ stage: 'Final', home_team: 'Portugal', away_team: 'Argentina', home_score: 0, away_score: 0, home_pen: 2, away_pen: 4 }),
    ])
    expect(shootoutTies).toEqual([
      { round: 'round16', teamA: 'Brasil', teamB: 'Chile' }, // ordenado alfabéticamente
      { round: 'finalist', teamA: 'Argentina', teamB: 'Portugal' },
    ])
  })

  it('ignora etapas fuera de mapeo (p.ej. tercer puesto) y fase de grupos', () => {
    const { resultsByRound, shootoutTies } = deriveBracketResults([
      mk({ stage: 'Tercer puesto', home_team: 'A', away_team: 'B', home_score: 2, away_score: 1 }),
      mk({ stage: 'Fase de Grupos', home_team: 'C', away_team: 'D', home_score: 1, away_score: 0 }),
    ])
    expect(resultsByRound).toEqual({})
    expect(shootoutTies).toEqual([])
  })

  it('normaliza acentos y mayúsculas del stage', () => {
    const { resultsByRound } = deriveBracketResults([
      mk({ stage: 'SEMIFINALES', home_team: 'España', away_team: 'Alemania', home_score: 2, away_score: 0 }),
    ])
    expect(resultsByRound).toEqual({ finalist: ['España'] })
  })
})
