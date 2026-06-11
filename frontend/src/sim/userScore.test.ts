import { describe, it, expect } from 'vitest'
import { STAGE, type IterationResult, type Prepared } from './tournament'
import { prepareBracketPicks, scoreIteration, summarizePoints } from './userScore'

const fakePrep = {
  teams: ['Argentina', 'Brasil', 'España', 'Francia'],
  teamIndex: new Map([['Argentina', 0], ['Brasil', 1], ['España', 2], ['Francia', 3]]),
} as unknown as Prepared

function fakeIteration(partial: Partial<IterationResult>): IterationResult {
  return {
    stageReached: new Uint8Array(4),
    groupPos: new Uint8Array(4),
    finalistA: 0,
    finalistB: 1,
    championIdx: 0,
    simScores: {},
    degenerate: false,
    ...partial,
  }
}

describe('prepareBracketPicks', () => {
  it('maps rounds to stages with the official points', () => {
    const picks = prepareBracketPicks(
      { champion: ['España'], semi: ['Argentina', 'Brasil'] },
      fakePrep
    )
    expect(picks).toContainEqual({ stage: STAGE.CHAMPION, teamIdx: 2, points: 10 })
    expect(picks).toContainEqual({ stage: STAGE.SF, teamIdx: 0, points: 4 })
    expect(picks).toHaveLength(3)
  })

  it('skips nulls and unknown teams', () => {
    const picks = prepareBracketPicks({ champion: [null], quarter: ['Atlantis'] }, fakePrep)
    expect(picks).toHaveLength(0)
  })
})

describe('scoreIteration', () => {
  it('scores group predictions 3/1/0 against simulated scores', () => {
    const iter = fakeIteration({
      simScores: { m1: [2, 1], m2: [3, 0], m3: [0, 2] },
    })
    const { group } = scoreIteration(iter, [
      { match_id: 'm1', predicted_home: 2, predicted_away: 1 },  // exacto → 3
      { match_id: 'm2', predicted_home: 1, predicted_away: 0 },  // resultado → 1
      { match_id: 'm3', predicted_home: 1, predicted_away: 1 },  // fallo → 0
      { match_id: 'mX', predicted_home: 5, predicted_away: 5 },  // partido no simulado → ignorado
    ], [])
    expect(group).toBe(4)
  })

  it('awards bracket points when the team reaches the predicted stage', () => {
    const stageReached = new Uint8Array(4)
    stageReached[2] = STAGE.CHAMPION   // España campeona
    stageReached[0] = STAGE.SF         // Argentina semifinalista
    const iter = fakeIteration({ stageReached })
    const picks = prepareBracketPicks(
      { champion: ['España'], semi: ['Argentina', 'Brasil'], finalist: ['España'] },
      fakePrep
    )
    const { bracket } = scoreIteration(iter, [], picks)
    // España campeona (10) + España finalista (6) + Argentina semi (4); Brasil no llegó
    expect(bracket).toBe(20)
  })
})

describe('summarizePoints', () => {
  it('computes expectation, percentiles and histogram', () => {
    const totals = Array.from({ length: 100 }, (_, i) => 10 + i) // 10..109
    const s = summarizePoints(totals, 3000, 2000, 10)
    expect(s.basePoints).toBe(10)
    expect(s.expectedGroup).toBe(30)
    expect(s.expectedBracket).toBe(20)
    expect(s.expectedTotal).toBe(60)
    expect(s.min).toBe(10)
    expect(s.max).toBe(109)
    expect(s.p50).toBeGreaterThanOrEqual(59)
    expect(s.p50).toBeLessThanOrEqual(61)
    expect(s.p5).toBeLessThan(s.p95)
    const totalCount = s.histogram.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(100)
  })
})
