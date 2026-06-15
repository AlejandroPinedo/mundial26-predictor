// Predicción ML del resultado de un partido a partir del modelo entrenado.
// ESPEJO de frontend/src/predict/predictMatch.ts + sim/poisson.ts — mantener
// sincronizado. Es una función DETERMINISTA: solo necesita los Elo y la sede,
// nunca el marcador real (clave para la justicia del Pez Oráculo).
import { MODEL } from './model.js'

export type ScoreLine = { home: number; away: number; p: number }

export type MatchPrediction = {
  lambdaHome: number
  lambdaAway: number
  probHome: number
  probDraw: number
  probAway: number
  topScores: ScoreLine[]
  mostLikely: ScoreLine
}

export type PredictOptions = {
  neutralVenue: boolean
  elo: Record<string, number>
}

// PMF cerrada de Poisson: P(X=k) = e^-λ · λ^k / k!. Se calcula en espacio log.
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 2; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

export function predictMatch(
  homeTeam: string,
  awayTeam: string,
  opts: PredictOptions,
): MatchPrediction | null {
  const eloHome = opts.elo[homeTeam]
  const eloAway = opts.elo[awayTeam]
  if (eloHome === undefined || eloAway === undefined) return null

  const { intercept, eloDiff: betaElo, homeAdv } = MODEL.coef
  const diff = (eloHome - eloAway) / MODEL.eloScale
  const localH = opts.neutralVenue ? 0 : 1
  const lambdaHome = Math.exp(intercept + betaElo * diff + homeAdv * localH)
  const lambdaAway = Math.exp(intercept - betaElo * diff)

  const { maxGoals: K, dixonColesRho: rho } = MODEL
  const ph: number[] = new Array(K + 1)
  const pa: number[] = new Array(K + 1)
  for (let i = 0; i <= K; i++) {
    ph[i] = poissonPmf(i, lambdaHome)
    pa[i] = poissonPmf(i, lambdaAway)
  }

  // Matriz P(local=i, visita=j) con corrección Dixon-Coles en el rincón bajo.
  const m: number[][] = []
  for (let i = 0; i <= K; i++) {
    m[i] = new Array(K + 1)
    for (let j = 0; j <= K; j++) m[i][j] = ph[i] * pa[j]
  }
  m[0][0] *= 1 - lambdaHome * lambdaAway * rho
  m[0][1] *= 1 + lambdaHome * rho
  m[1][0] *= 1 + lambdaAway * rho
  m[1][1] *= 1 - rho

  let total = 0
  for (let i = 0; i <= K; i++) {
    for (let j = 0; j <= K; j++) {
      if (m[i][j] < 0) m[i][j] = 0
      total += m[i][j]
    }
  }

  let probHome = 0
  let probDraw = 0
  let probAway = 0
  const scores: ScoreLine[] = []
  for (let i = 0; i <= K; i++) {
    for (let j = 0; j <= K; j++) {
      const p = m[i][j] / total
      if (i > j) probHome += p
      else if (i === j) probDraw += p
      else probAway += p
      scores.push({ home: i, away: j, p })
    }
  }
  scores.sort((a, b) => b.p - a.p)

  return {
    lambdaHome,
    lambdaAway,
    probHome,
    probDraw,
    probAway,
    topScores: scores.slice(0, 3),
    mostLikely: scores[0],
  }
}
