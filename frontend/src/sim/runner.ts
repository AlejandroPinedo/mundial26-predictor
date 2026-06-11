import { mulberry32 } from './rng'
import { prepareTournament, simulateOnce, type ApiMatch, type SimConfig } from './tournament'
import { createAccumulator, accumulate, finalize, type SimResults } from './aggregate'

const CHUNK = 250

export function runSimulation(
  matches: ApiMatch[],
  config: SimConfig,
  onProgress?: (done: number, total: number) => void
): SimResults {
  const start = performance.now()
  const prep = prepareTournament(matches, config)
  const rng = mulberry32(config.seed)
  const tau = 1 + config.surprise / 50
  const acc = createAccumulator(prep.teams.length)

  let degenerate = 0
  let done = 0
  while (done < config.iterations) {
    const target = Math.min(done + CHUNK, config.iterations)
    for (; done < target; done++) {
      const result = simulateOnce(prep, tau, rng)
      accumulate(acc, result)
      if (result.degenerate) degenerate++
    }
    onProgress?.(done, config.iterations)
  }

  return finalize(acc, prep, config.iterations, degenerate, Math.round(performance.now() - start))
}
