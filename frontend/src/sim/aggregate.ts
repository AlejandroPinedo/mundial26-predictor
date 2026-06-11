import { STAGE, STAGE_COUNT, GROUP_POS, type IterationResult, type Prepared } from './tournament'
import type { PointsSummary } from './userScore'

export type TeamProbabilities = {
  team: string
  winGroup: number
  second: number
  thirdQualified: number
  eliminated: number
  r32: number
  r16: number
  qf: number
  sf: number
  final: number
  champion: number
}

export type FinalMatchup = {
  teamA: string         // el que más veces gana esa final
  teamB: string
  p: number             // frecuencia de esa final entre todas las simulaciones
  aWinShare: number     // de esas finales, cuántas gana teamA
}

export type SimResults = {
  iterations: number
  degenerateIterations: number
  warnings: string[]
  elapsedMs: number
  teams: TeamProbabilities[]      // ordenado por prob. de campeón desc
  topFinals: FinalMatchup[]       // las 5 finales más frecuentes
  myPoints: PointsSummary | null  // solo si el usuario aportó predicciones/bracket
}

// Layout por equipo: 7 contadores de etapa (>= etapa) + 4 de posición de grupo.
const SLOTS = STAGE_COUNT + 4
const POS_BASE = STAGE_COUNT

export function createAccumulator(nTeams: number): Uint32Array {
  return new Uint32Array(nTeams * SLOTS)
}

export function accumulate(acc: Uint32Array, r: IterationResult): void {
  for (let i = 0; i < r.stageReached.length; i++) {
    const base = i * SLOTS
    const reached = r.stageReached[i]
    for (let s = STAGE.R32; s <= reached; s++) acc[base + s]++
    acc[base + POS_BASE + r.groupPos[i]]++
  }
}

// Clave compacta para una final no ordenada entre dos índices de equipo.
export function finalKey(a: number, b: number): number {
  return a < b ? a * 64 + b : b * 64 + a
}

export function finalize(
  acc: Uint32Array,
  prep: Prepared,
  iterations: number,
  degenerateIterations: number,
  finalsCount: Map<number, { count: number; lowWins: number }>,
  myPoints: PointsSummary | null,
  elapsedMs: number
): SimResults {
  const teams: TeamProbabilities[] = prep.teams.map((team, i) => {
    const base = i * SLOTS
    const p = (slot: number) => acc[base + slot] / iterations
    return {
      team,
      winGroup: p(POS_BASE + GROUP_POS.FIRST),
      second: p(POS_BASE + GROUP_POS.SECOND),
      thirdQualified: p(POS_BASE + GROUP_POS.THIRD_QUALIFIED),
      eliminated: p(POS_BASE + GROUP_POS.ELIMINATED),
      r32: p(STAGE.R32),
      r16: p(STAGE.R16),
      qf: p(STAGE.QF),
      sf: p(STAGE.SF),
      final: p(STAGE.FINAL),
      champion: p(STAGE.CHAMPION),
    }
  })
  teams.sort((a, b) => b.champion - a.champion || b.final - a.final || a.team.localeCompare(b.team))

  const topFinals: FinalMatchup[] = [...finalsCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([key, { count, lowWins }]) => {
      const low = Math.floor(key / 64)
      const high = key % 64
      const lowShare = lowWins / count
      // teamA = el que gana esa final más veces
      const aIsLow = lowShare >= 0.5
      return {
        teamA: prep.teams[aIsLow ? low : high],
        teamB: prep.teams[aIsLow ? high : low],
        p: count / iterations,
        aWinShare: aIsLow ? lowShare : 1 - lowShare,
      }
    })

  return { iterations, degenerateIterations, warnings: prep.warnings, elapsedMs, teams, topFinals, myPoints }
}
