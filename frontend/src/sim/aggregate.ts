import { STAGE, STAGE_COUNT, type IterationResult, type Prepared } from './tournament'

export type TeamProbabilities = {
  team: string
  winGroup: number
  r32: number
  r16: number
  qf: number
  sf: number
  final: number
  champion: number
}

export type SimResults = {
  iterations: number
  degenerateIterations: number
  warnings: string[]
  elapsedMs: number
  teams: TeamProbabilities[]   // ordenado por prob. de campeón desc
}

// Layout: por equipo, 7 contadores de etapa alcanzada (>= etapa) + 1 de ganar grupo.
const SLOTS = STAGE_COUNT + 1
const WIN_GROUP_SLOT = STAGE_COUNT

export function createAccumulator(nTeams: number): Uint32Array {
  return new Uint32Array(nTeams * SLOTS)
}

export function accumulate(acc: Uint32Array, r: IterationResult): void {
  for (let i = 0; i < r.stageReached.length; i++) {
    const reached = r.stageReached[i]
    for (let s = STAGE.R32; s <= reached; s++) acc[i * SLOTS + s]++
  }
  for (const w of r.groupWinners) acc[w * SLOTS + WIN_GROUP_SLOT]++
}

export function finalize(
  acc: Uint32Array,
  prep: Prepared,
  iterations: number,
  degenerateIterations: number,
  elapsedMs: number
): SimResults {
  const teams: TeamProbabilities[] = prep.teams.map((team, i) => {
    const base = i * SLOTS
    const p = (slot: number) => acc[base + slot] / iterations
    return {
      team,
      winGroup: p(WIN_GROUP_SLOT),
      r32: p(STAGE.R32),
      r16: p(STAGE.R16),
      qf: p(STAGE.QF),
      sf: p(STAGE.SF),
      final: p(STAGE.FINAL),
      champion: p(STAGE.CHAMPION),
    }
  })
  teams.sort((a, b) => b.champion - a.champion || b.final - a.final || a.team.localeCompare(b.team))
  return { iterations, degenerateIterations, warnings: prep.warnings, elapsedMs, teams }
}
