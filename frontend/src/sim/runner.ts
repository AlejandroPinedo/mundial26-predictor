import { mulberry32 } from './rng'
import { prepareTournament, simulateOnce, type ApiMatch, type SimConfig } from './tournament'
import { createAccumulator, accumulate, finalize, finalKey, type SimResults } from './aggregate'
import { prepareBracketPicks, scoreIteration, summarizePoints, type UserInputs, type PointsSummary } from './userScore'

const CHUNK = 250

export function runSimulation(
  matches: ApiMatch[],
  config: SimConfig,
  onProgress?: (done: number, total: number) => void,
  user?: UserInputs
): SimResults {
  const start = performance.now()
  const prep = prepareTournament(matches, config)
  const rng = mulberry32(config.seed)
  const tau = 1 + config.surprise / 50
  const acc = createAccumulator(prep.teams.length)
  const finalsCount = new Map<number, { count: number; lowWins: number }>()

  const bracketPicks = user ? prepareBracketPicks(user.bracket, prep) : []
  const scoreUser = !!user && (user.predictions.length > 0 || bracketPicks.length > 0)
  const totals: number[] = scoreUser ? new Array(config.iterations) : []
  let groupSum = 0
  let bracketSum = 0

  let degenerate = 0
  let done = 0
  while (done < config.iterations) {
    const target = Math.min(done + CHUNK, config.iterations)
    for (; done < target; done++) {
      const result = simulateOnce(prep, tau, config.momentum, rng)
      accumulate(acc, result)
      if (result.degenerate) degenerate++

      // Final de esta iteración
      const key = finalKey(result.finalistA, result.finalistB)
      const entry = finalsCount.get(key) ?? { count: 0, lowWins: 0 }
      entry.count++
      if (result.championIdx === Math.floor(key / 64)) entry.lowWins++
      finalsCount.set(key, entry)

      // Puntos del usuario contra este mundial simulado
      if (scoreUser && user) {
        const { group, bracket } = scoreIteration(result, user.predictions, bracketPicks)
        groupSum += group
        bracketSum += bracket
        totals[done] = user.basePoints + group + bracket
      }
    }
    onProgress?.(done, config.iterations)
  }

  const myPoints: PointsSummary | null = scoreUser && user
    ? summarizePoints(totals, groupSum, bracketSum, user.basePoints)
    : null

  return finalize(acc, prep, config.iterations, degenerate, finalsCount, myPoints, Math.round(performance.now() - start))
}
