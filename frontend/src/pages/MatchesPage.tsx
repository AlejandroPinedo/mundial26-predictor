import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  home_score: number | null
  away_score: number | null
}

type Prediction = {
  match_id: string
  predicted_home: number
  predicted_away: number
  points: number | null
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})

  useEffect(() => {
    apiFetch('/predictions/matches').then(d => setMatches(d.matches))
    apiFetch('/predictions/my').then(d => {
      const map: Record<string, Prediction> = {}
      for (const p of d.predictions) map[p.match_id] = p
      setPredictions(map)
    })
  }, [])

  async function handlePredict(matchId: string) {
    const input = inputs[matchId]
    if (!input) return
    await apiFetch('/predictions', {
      method: 'POST',
      body: JSON.stringify({
        matchId,
        predictedHome: Number(input.home),
        predictedAway: Number(input.away),
      }),
    })
    const d = await apiFetch('/predictions/my')
    const map: Record<string, Prediction> = {}
    for (const p of d.predictions) map[p.match_id] = p
    setPredictions(map)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Partidos</h1>
        <div className="flex flex-col gap-4">
          {matches.map(match => {
            const pred = predictions[match.id]
            const played = match.home_score !== null
            return (
              <div key={match.id} className="bg-gray-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold">{match.home_team}</span>
                  <span className="text-gray-500 text-sm">
                    {played ? `${match.home_score} - ${match.away_score}` : 'vs'}
                  </span>
                  <span className="font-bold">{match.away_team}</span>
                </div>
                <p className="text-gray-500 text-xs mb-3">
                  {new Date(match.match_date).toLocaleDateString('es', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {pred && (
                  <p className="text-sm text-yellow-400 mb-2">
                    Tu predicción: {pred.predicted_home} - {pred.predicted_away}
                    {pred.points !== null && ` · ${pred.points} pts`}
                  </p>
                )}
                {!played && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" min="0" max="20" placeholder="0"
                      className="w-14 bg-gray-800 text-center rounded px-2 py-1"
                      onChange={e => setInputs(prev => ({
                        ...prev, [match.id]: { ...prev[match.id], home: e.target.value }
                      }))}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number" min="0" max="20" placeholder="0"
                      className="w-14 bg-gray-800 text-center rounded px-2 py-1"
                      onChange={e => setInputs(prev => ({
                        ...prev, [match.id]: { ...prev[match.id], away: e.target.value }
                      }))}
                    />
                    <button
                      onClick={() => handlePredict(match.id)}
                      className="bg-yellow-400 text-gray-950 font-bold px-4 py-1 rounded hover:bg-yellow-300 text-sm"
                    >
                      Predecir
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
