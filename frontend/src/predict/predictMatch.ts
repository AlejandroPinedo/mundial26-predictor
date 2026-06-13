// Predicción ML del resultado de un partido a partir del modelo entrenado.
// Reusa la matemática de Poisson del simulador y aplica la corrección Dixon-Coles
// para obtener 1X2, marcadores más probables y goles esperados de forma cerrada.
//
// Espejo exacto de la inferencia validada en ml/train.py (ver test de paridad).
import { poissonPmf } from '../sim/poisson'
import { MODEL } from './model'

export type ScoreLine = { home: number; away: number; p: number }

export type MatchPrediction = {
  lambdaHome: number // goles esperados local (xG)
  lambdaAway: number // goles esperados visita (xG)
  probHome: number // P(gana local)
  probDraw: number // P(empate)
  probAway: number // P(gana visita)
  topScores: ScoreLine[] // marcadores más probables (desc), top 3
  mostLikely: ScoreLine // marcador más probable
}

export type PredictOptions = {
  // true = sede neutral (sin ventaja de local). En el Mundial casi todo es neutral
  // salvo los anfitriones jugando en casa (MX/USA/CAN).
  neutralVenue: boolean
  // Elo actual por equipo (normalmente el de currentElo()).
  elo: Record<string, number>
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

  // Matriz de marcadores P(local=i, visita=j) con corrección Dixon-Coles en el rincón bajo.
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
