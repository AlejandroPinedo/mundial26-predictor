import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'

type ChampCount = {
  team: string
  count: number
}

type Scoreline = {
  predicted_home: number
  predicted_away: number
  count: number
}

type HotMatch = {
  match_id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  prediction_count: number
}

type GlobalInsights = {
  mostPredictedChampions: ChampCount[]
  averageScores: { avg_home: number; avg_away: number }
  popularScores: Scoreline[]
  hotMatches: HotMatch[]
  totalPredictions: number
  averagePoints: number
}

export default function StatsPage() {
  const [data, setData] = useState<GlobalInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/predictions/global-insights')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.error('Error fetching global insights:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-barlow font-black uppercase tracking-wide text-yellow-400">
            Estadísticas Globales 📊
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Análisis y tendencias de predicciones de toda la comunidad del Mundial 2026
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          data && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                
                {/* Total Predictions */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400" />
                  <span className="text-gray-500 uppercase font-bold text-xs tracking-wider block mb-1">
                    Predicciones Totales
                  </span>
                  <span className="text-white font-black text-4xl font-barlow">
                    {data.totalPredictions.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Pronósticos enviados en la plataforma</p>
                </div>

                {/* Avg points */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
                  <span className="text-gray-500 uppercase font-bold text-xs tracking-wider block mb-1">
                    Rendimiento Promedio
                  </span>
                  <span className="text-white font-black text-4xl font-barlow">
                    {data.averagePoints} <span className="text-lg text-gray-500 font-sans">pts/partido</span>
                  </span>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Promedio de puntos por predicción evaluada</p>
                </div>

                {/* Avg predicted goals */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                  <span className="text-gray-500 uppercase font-bold text-xs tracking-wider block mb-1">
                    Goles Promedio Predichos
                  </span>
                  <span className="text-white font-black text-4xl font-barlow">
                    {(data.averageScores.avg_home + data.averageScores.avg_away).toFixed(2)}
                  </span>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Local: {data.averageScores.avg_home.toFixed(2)} · Visitante: {data.averageScores.avg_away.toFixed(2)}
                  </p>
                </div>

              </div>

              {/* Bento Grid section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Champion Candidates */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-barlow font-black uppercase tracking-wider text-yellow-400/90 mb-6 flex items-center gap-2">
                      🏆 Favoritos al Título
                    </h2>
                    
                    {data.mostPredictedChampions.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          const totalChampVotes = data.mostPredictedChampions.reduce((sum, item) => sum + item.count, 0)
                          return data.mostPredictedChampions.map((item, index) => {
                            const pct = totalChampVotes > 0 ? (item.count / totalChampVotes) * 100 : 0
                            return (
                              <div key={item.team} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-sm font-bold text-white">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 w-5 text-center">#{index + 1}</span>
                                    <span className="text-xl no-invert">{getFlag(item.team)}</span>
                                    <span className="uppercase">{item.team}</span>
                                  </div>
                                  <span>{pct.toFixed(1)}% <span className="text-xs text-gray-500 font-medium">({item.count})</span></span>
                                </div>
                                <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden border border-gray-800/80">
                                  <div
                                    className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-500">
                        No hay suficientes predicciones de campeón todavía.
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-6 border-t border-gray-800/60 pt-4">
                    Basado en las elecciones del cuadro de eliminatorias guardadas por los usuarios.
                  </div>
                </div>

                {/* 2. Most popular scores */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-barlow font-black uppercase tracking-wider text-yellow-400/90 mb-6 flex items-center gap-2">
                      ⚽ Marcadores Más Comunes
                    </h2>

                    {data.popularScores.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                        {(() => {
                          const totalScoreVotes = data.popularScores.reduce((sum, item) => sum + item.count, 0)
                          return data.popularScores.map((score, index) => {
                            const pct = totalScoreVotes > 0 ? (score.count / totalScoreVotes) * 100 : 0
                            return (
                              <div
                                key={`${score.predicted_home}-${score.predicted_away}`}
                                className="bg-gray-950/60 border border-gray-850 rounded-2xl p-4 flex flex-col items-center justify-between shadow-md text-center group hover:border-yellow-400/35 transition-all"
                              >
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">#{index + 1}</span>
                                <div className="font-barlow font-black text-2xl text-yellow-400 my-2">
                                  {score.predicted_home} - {score.predicted_away}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold block">
                                  {score.count} pred.
                                </span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-500">
                        No hay suficientes predicciones registradas.
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-gray-500 mt-6 border-t border-gray-800/60 pt-4">
                    Porcentaje calculado en base a todos los marcadores individuales enviados.
                  </div>
                </div>

                {/* 3. Hot Matches */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl lg:col-span-2">
                  <h2 className="text-xl font-barlow font-black uppercase tracking-wider text-yellow-400/90 mb-6 flex items-center gap-2">
                    🔥 Partidos Hottest (Más Predichos)
                  </h2>

                  {data.hotMatches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {data.hotMatches.map((match, idx) => (
                        <div
                          key={match.match_id}
                          className="bg-gray-950/50 border border-gray-850 rounded-2xl p-4 flex flex-col justify-between hover:border-yellow-400/35 transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-2 right-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            #{idx + 1}
                          </div>
                          
                          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                            {match.stage}
                          </div>

                          <div className="flex flex-col gap-1 my-3 font-barlow font-black text-sm uppercase tracking-wide">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg no-invert">{getFlag(match.home_team)}</span>
                              <span className="truncate">{match.home_team}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-sans font-bold py-0.5">vs</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg no-invert">{getFlag(match.away_team)}</span>
                              <span className="truncate">{match.away_team}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400 font-bold">
                            <span>{match.prediction_count} predicciones</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      No hay suficientes predicciones en partidos disputados.
                    </div>
                  )}
                </div>

              </div>
            </>
          )
        )}

      </div>
    </div>
  )
}
