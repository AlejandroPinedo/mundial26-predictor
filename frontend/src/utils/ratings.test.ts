import { describe, it, expect } from 'vitest'
import { ELO_RATINGS, getElo, DEFAULT_ELO, HOST_NATIONS } from './ratings'
import { getFlag } from './flags'

describe('ELO_RATINGS', () => {
  it('has exactly 48 teams', () => {
    expect(Object.keys(ELO_RATINGS)).toHaveLength(48)
  })

  it('every key resolves to a real flag (guards against typos)', () => {
    for (const team of Object.keys(ELO_RATINGS)) {
      expect(getFlag(team), `sin bandera para "${team}"`).not.toBe('🏳️')
    }
  })

  it('values are in a sane Elo range', () => {
    for (const [team, elo] of Object.entries(ELO_RATINGS)) {
      expect(elo, team).toBeGreaterThan(1300)
      expect(elo, team).toBeLessThan(2300)
    }
  })

  it('getElo falls back to DEFAULT_ELO for unknown teams', () => {
    expect(getElo('Equipo Inventado')).toBe(DEFAULT_ELO)
  })

  it('host nations are present in the ratings table', () => {
    for (const host of HOST_NATIONS) {
      expect(ELO_RATINGS[host]).toBeDefined()
    }
  })
})
