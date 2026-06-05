import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'
import { getPointsBadge } from '../utils/points'

type Prediction = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  predicted_home: number
  predicted_away: number
  home_score: number | null
  away_score: number | null
  points: number | null
}

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])

  useEffect(() => {
    apiFetch('/predictions/my').then(d => setPredictions(d.predictions))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Mis Predicciones</h1>
        <div className="flex flex-col gap-4">
          {predictions.map(p => (
            <div key={p.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex justify-between font-bold mb-2">
                <span>{p.home_team}</span>
                <span className="text-gray-500">vs</span>
                <span>{p.away_team}</span>
              </div>
              <p className="text-yellow-400 text-sm">
                Tu predicción: {p.predicted_home} - {p.predicted_away}
              </p>
              {p.home_score !== null ? (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-gray-400 text-sm">
                    Resultado: {p.home_score} - {p.away_score}
                  </span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                    p.points === 3 ? 'bg-green-700 text-green-200' :
                    p.points === 1 ? 'bg-blue-700 text-blue-200' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {p.points} pts — {getPointsBadge(p.points ?? 0)}
                  </span>
                </div>
              ) : (
                <p className="text-gray-600 text-xs mt-1">Partido pendiente</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
