import { apiFetch } from '../api/client'

export async function simulatePredictions(matches: { id: string; home_score: null | number; match_date: string }[]) {
  const now = new Date()
  const pending = matches.filter(m => m.home_score === null && now < new Date(m.match_date))

  const predictions = pending.map(m => ({
    matchId: m.id,
    predictedHome: Math.floor(Math.random() * 4),
    predictedAway: Math.floor(Math.random() * 4),
  }))

  await Promise.all(predictions.map(p =>
    apiFetch('/predictions', { method: 'POST', body: JSON.stringify(p) })
  ))

  return predictions.length
}

export async function exportPredictions(predictions: unknown[]) {
  const data = JSON.stringify(predictions, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mundial26-predicciones-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
