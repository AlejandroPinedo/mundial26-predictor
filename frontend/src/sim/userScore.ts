import { STAGE, type IterationResult, type Prepared } from './tournament'

// Puntos del juego: 3 exacto / 1 resultado / 0 — y por ronda del bracket (mismos
// valores que el backend en routes/bracket.ts y la query del leaderboard).
export const BRACKET_ROUND_POINTS: Record<string, number> = {
  round16: 1,
  quarter: 2,
  semi: 4,
  finalist: 6,
  champion: 10,
}

// El bracket de la app empieza en 16avos: round16 = estar entre los 16 de octavos.
const ROUND_TO_STAGE: Record<string, number> = {
  round16: STAGE.R16,
  quarter: STAGE.QF,
  semi: STAGE.SF,
  finalist: STAGE.FINAL,
  champion: STAGE.CHAMPION,
}

export type UserPrediction = { match_id: string; predicted_home: number; predicted_away: number }
export type UserBracket = Partial<Record<keyof typeof BRACKET_ROUND_POINTS, (string | null)[]>>

export type UserInputs = {
  predictions: UserPrediction[]
  bracket: UserBracket
  basePoints: number   // puntos reales ya ganados en partidos jugados
}

// Pre-resuelve el bracket del usuario a pares (etapa requerida, índice de equipo, puntos).
export type BracketPick = { stage: number; teamIdx: number; points: number }

export function prepareBracketPicks(bracket: UserBracket, prep: Prepared): BracketPick[] {
  const picks: BracketPick[] = []
  for (const [round, teams] of Object.entries(bracket)) {
    const stage = ROUND_TO_STAGE[round]
    const points = BRACKET_ROUND_POINTS[round]
    if (stage === undefined || !teams) continue
    for (const team of teams) {
      if (!team) continue
      const teamIdx = prep.teamIndex.get(team)
      if (teamIdx !== undefined) picks.push({ stage, teamIdx, points })
    }
  }
  return picks
}

function matchPoints(ph: number, pa: number, h: number, a: number): number {
  if (ph === h && pa === a) return 3
  if (Math.sign(ph - pa) === Math.sign(h - a)) return 1
  return 0
}

// Puntos del usuario en UNA iteración simulada (solo la parte futura/simulada).
export function scoreIteration(
  iter: IterationResult,
  predictions: UserPrediction[],
  bracketPicks: BracketPick[]
): { group: number; bracket: number } {
  let group = 0
  for (const p of predictions) {
    const sim = iter.simScores[p.match_id]
    if (sim) group += matchPoints(p.predicted_home, p.predicted_away, sim[0], sim[1])
  }
  let bracket = 0
  for (const pick of bracketPicks) {
    if (iter.stageReached[pick.teamIdx] >= pick.stage) bracket += pick.points
  }
  return { group, bracket }
}

export type PointsSummary = {
  basePoints: number
  expectedGroup: number
  expectedBracket: number
  expectedTotal: number
  min: number
  max: number
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
  histogram: { from: number; to: number; count: number }[]
}

export function summarizePoints(
  totals: number[],          // puntos TOTALES (base + simulados) por iteración
  groupSum: number,
  bracketSum: number,
  basePoints: number
): PointsSummary {
  const n = totals.length
  const sorted = [...totals].sort((a, b) => a - b)
  const q = (p: number) => sorted[Math.min(n - 1, Math.floor(p * n))]
  const min = sorted[0]
  const max = sorted[n - 1]

  // Histograma de ~12 buckets con límites enteros
  const bucketCount = 12
  const width = Math.max(1, Math.ceil((max - min + 1) / bucketCount))
  const buckets = new Map<number, number>()
  for (const t of totals) {
    const b = Math.floor((t - min) / width)
    buckets.set(b, (buckets.get(b) ?? 0) + 1)
  }
  const histogram = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, count]) => ({ from: min + b * width, to: min + (b + 1) * width - 1, count }))

  return {
    basePoints,
    expectedGroup: groupSum / n,
    expectedBracket: bracketSum / n,
    expectedTotal: basePoints + (groupSum + bracketSum) / n,
    min, max,
    p5: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95),
    histogram,
  }
}
