import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'

import Spinner from '../components/Spinner'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/predictions/my')
      .then(d => setPredictions(d.predictions))
      .finally(() => setLoading(false))
  }, [])

  const played = predictions.filter(p => p.home_score !== null)
  const pending = predictions.filter(p => p.home_score === null)
  const totalPoints = played.reduce((sum, p) => sum + (p.points ?? 0), 0)

  function handleShare() {
    const lines = [
      '⚽ Mis predicciones — Mundial26 Predictor',
      '',
      ...predictions.slice(0, 5).map(p =>
        `${p.home_team} ${p.predicted_home}-${p.predicted_away} ${p.away_team}${p.points !== null ? ` (${p.points}pts)` : ''}`
      ),
      predictions.length > 5 ? `...y ${predictions.length - 5} más` : '',
      '',
      `Total: ${totalPoints} pts`,
      'https://mundial26-predictor.vercel.app',
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(lines)
    toast.success('Predicciones copiadas al portapapeles')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">Mis Predicciones</h1>
          {predictions.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 font-bold">{totalPoints} pts</span>
              <button onClick={handleShare}
                className="text-gray-400 hover:text-white text-sm border border-gray-700 px-3 py-1 rounded-lg hover:border-gray-500 transition">
                Compartir
              </button>
            </div>
          )}
        </div>

        {loading ? <Spinner /> : predictions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-gray-400 font-bold mb-1">Sin predicciones todavía</p>
            <p className="text-gray-600 text-sm mb-6">Ve a partidos y predice antes del 11 de junio</p>
            <Link to="/matches"
              className="bg-yellow-400 text-gray-950 font-bold px-6 py-2 rounded-lg hover:bg-yellow-300">
              Ver partidos
            </Link>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-6">
                <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">
                  Pendientes ({pending.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {pending.map(p => (
                    <div key={p.id} className="bg-gray-900 rounded-xl p-4">
                      <div className="flex justify-between font-bold mb-2 text-sm">
                        <span>{p.home_team}</span>
                        <span className="text-gray-500">vs</span>
                        <span>{p.away_team}</span>
                      </div>
                      <p className="text-yellow-400 text-sm text-center">
                        {p.predicted_home} - {p.predicted_away}
                      </p>
                      <p className="text-gray-600 text-xs text-center mt-1">
                        {new Date(p.match_date).toLocaleDateString('es', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {played.length > 0 && (
              <div>
                <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">
                  Jugados ({played.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {played.map(p => (
                    <div key={p.id} className="bg-gray-900 rounded-xl p-4">
                      <div className="flex justify-between font-bold mb-2 text-sm">
                        <span>{p.home_team}</span>
                        <span className="text-white">{p.home_score} - {p.away_score}</span>
                        <span>{p.away_team}</span>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-yellow-400 text-sm">
                          Tu pred: {p.predicted_home} - {p.predicted_away}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          p.points === 3 ? 'bg-green-700 text-green-200' :
                          p.points === 1 ? 'bg-blue-700 text-blue-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {p.points} pts — {getPointsBadge(p.points ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
