import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getPointsBadge } from '../utils/points'
import { getFlag } from '../utils/flags'

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
  stadium_name?: string
  stage?: string
  group_name?: string
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
      window.location.origin,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(lines)
    toast.success('Predicciones copiadas al portapapeles')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-barlow font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
              Mis Predicciones 🎯
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Aquí puedes ver tu historial completo de pronósticos enviados.
            </p>
          </div>
          
          {predictions.length > 0 && (
            <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-2.5 rounded-2xl select-none">
              <div className="text-right">
                <span className="text-gray-500 uppercase font-black text-[9px] tracking-wider block">Puntaje Total</span>
                <span className="text-yellow-400 font-barlow font-black text-2xl leading-none">
                  {totalPoints} <span className="text-xs font-sans text-gray-500 font-normal">pts</span>
                </span>
              </div>
              <span className="w-px h-8 bg-gray-800" />
              <button
                onClick={handleShare}
                className="bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 transition text-xs cursor-pointer flex items-center gap-1.5"
              >
                Compartir 📋
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-3xl font-sans">
            <p className="text-5xl mb-4 no-invert">🎯</p>
            <h3 className="text-white font-bold text-lg mb-1">Aún no tienes predicciones</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Comienza a pronosticar los resultados de los partidos para acumular puntos.
            </p>
            <Link
              to="/matches"
              className="bg-yellow-400 text-gray-950 font-black px-6 py-3 rounded-xl hover:bg-yellow-300 transition-all font-barlow uppercase tracking-wider text-sm shadow-lg shadow-yellow-500/10"
            >
              Ver Partidos ⚽
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Pending Section */}
            {pending.length > 0 && (
              <div>
                <h2 className="font-barlow font-black uppercase tracking-wider text-gray-400 mb-4 text-base">
                  Predicciones Pendientes ({pending.length})
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pending.map(p => (
                    <div key={p.id} className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-sm">
                      <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        <span>
                          {p.group_name ? `Grupo ${p.group_name}` : p.stage || 'Mundial 2026'}
                        </span>
                        <span>
                          {new Date(p.match_date).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 py-1.5 font-barlow font-black text-sm">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.home_team)}</span>
                          <span className="truncate uppercase">{p.home_team}</span>
                        </div>
                        
                        <div className="bg-gray-950 border border-gray-850 px-3 py-1 rounded-xl text-yellow-450 font-bold font-sans text-xs min-w-14 text-center">
                          {p.predicted_home} - {p.predicted_away}
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                          <span className="truncate uppercase">{p.away_team}</span>
                          <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.away_team)}</span>
                        </div>
                      </div>

                      {p.stadium_name && (
                        <div className="border-t border-gray-800/50 mt-3 pt-2.5 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span className="normal-case">🏟️ {p.stadium_name}</span>
                          <Link to="/matches" className="text-yellow-400 hover:underline normal-case">Editar</Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Played Section */}
            {played.length > 0 && (
              <div>
                <h2 className="font-barlow font-black uppercase tracking-wider text-gray-400 mb-4 text-base">
                  Predicciones Evaluadas ({played.length})
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {played.map(p => {
                    const isExact = p.points === 3
                    const isCorrect = p.points === 1
                    
                    return (
                      <div
                        key={p.id}
                        className={`bg-gray-900/40 border rounded-2xl p-4 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden ${
                          isExact
                            ? 'border-green-500/25'
                            : isCorrect
                            ? 'border-blue-500/20'
                            : 'border-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          <span>
                            {p.group_name ? `Grupo ${p.group_name}` : p.stage || 'Mundial 2026'}
                          </span>
                          <span>
                            {new Date(p.match_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        {/* Match Result Scoreboard */}
                        <div className="flex items-center justify-between gap-3 py-1 font-barlow font-black text-sm">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.home_team)}</span>
                            <span className="truncate uppercase">{p.home_team}</span>
                          </div>
                          
                          <div className="bg-gray-950 border border-gray-800 px-3 py-1 rounded-xl text-white font-bold text-sm min-w-16 text-center select-none font-sans">
                            {p.home_score} - {p.away_score}
                          </div>

                          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                            <span className="truncate uppercase">{p.away_team}</span>
                            <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.away_team)}</span>
                          </div>
                        </div>

                        {/* Prediction Comparison Footer */}
                        <div className="border-t border-gray-800/50 mt-3 pt-3 flex items-center justify-between">
                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <span>Mi Pred:</span>
                            <span className="font-bold text-yellow-450 font-barlow text-xs">
                              {p.predicted_home} - {p.predicted_away}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              isExact
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : isCorrect
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                              {p.points} PTS — {getPointsBadge(p.points ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
