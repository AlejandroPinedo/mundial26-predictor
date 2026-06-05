type Score = { home: number; away: number }

export function calculatePoints(predicted: Score, actual: Score): number {
  if (predicted.home === actual.home && predicted.away === actual.away) {
    return 3
  }

  const predictedResult = Math.sign(predicted.home - predicted.away)
  const actualResult = Math.sign(actual.home - actual.away)

  if (predictedResult === actualResult) {                                             
    return 1
  }

  return 0
}