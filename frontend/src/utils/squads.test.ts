import { describe, it, expect } from 'vitest'
import { SQUADS, getSquadElo, blendRating } from './squads'
import { ELO_RATINGS, getElo } from './ratings'
import { getFlag } from './flags'

describe('SQUADS', () => {
  it('has exactly 48 teams, the same as ELO_RATINGS', () => {
    expect(Object.keys(SQUADS)).toHaveLength(48)
    for (const team of Object.keys(SQUADS)) {
      expect(ELO_RATINGS[team], `"${team}" no está en ELO_RATINGS`).toBeDefined()
    }
  })

  it('every key resolves to a real flag (guards against typos)', () => {
    for (const team of Object.keys(SQUADS)) {
      expect(getFlag(team), `sin bandera para "${team}"`).not.toBe('🏳️')
    }
  })

  it('every squad has 3 stars and a positive market value', () => {
    for (const [team, squad] of Object.entries(SQUADS)) {
      expect(squad.stars, team).toHaveLength(3)
      expect(squad.marketValue, team).toBeGreaterThan(0)
    }
  })
})

describe('getSquadElo', () => {
  it('is monotonic in market value', () => {
    expect(getSquadElo('Francia').elo).toBeGreaterThan(getSquadElo('España').elo - 100)
    expect(getSquadElo('Francia').elo).toBeGreaterThan(getSquadElo('México').elo)
    expect(getSquadElo('México').elo).toBeGreaterThan(getSquadElo('Catar').elo)
  })

  it('is bounded to a sane Elo range', () => {
    for (const team of Object.keys(SQUADS)) {
      const { elo } = getSquadElo(team)
      expect(elo, team).toBeGreaterThanOrEqual(1350)
      expect(elo, team).toBeLessThanOrEqual(2250)
    }
  })

  it('falls back to the team Elo for unknown teams', () => {
    const result = getSquadElo('Equipo Inventado')
    expect(result.fallback).toBe(true)
    expect(result.elo).toBe(getElo('Equipo Inventado'))
  })
})

describe('blendRating', () => {
  it('w=0 returns the pure team Elo', () => {
    expect(blendRating(1900, 2100, 0)).toBe(1900)
  })

  it('w=1 returns the pure squad Elo', () => {
    expect(blendRating(1900, 2100, 1)).toBe(2100)
  })

  it('interpolates linearly', () => {
    expect(blendRating(1800, 2000, 0.5)).toBe(1900)
  })
})
