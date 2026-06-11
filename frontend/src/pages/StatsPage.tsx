import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import Flag from '../components/Flag'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

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
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

        <PageHeader title="ESTADÍSTICAS" subtitle="Insights de la comunidad Mundial26" icon="📈" live badge="Live" />

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          data && (
            <>
              {/* Paneles resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">

                {/* Predicciones totales */}
                <div className="relative bg-panel border border-white/8 rounded-2xl p-6 overflow-hidden hover-lift fade-up-1">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
                  <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block mb-2">
                    Predicciones Totales
                  </span>
                  <span className="font-display text-4xl text-gold leading-none">
                    {data.totalPredictions.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-400 mt-3 font-medium">Pronósticos enviados en toda la plataforma</p>
                </div>

                {/* Rendimiento promedio */}
                <div className="relative bg-panel border border-white/8 rounded-2xl p-6 overflow-hidden hover-lift fade-up-2">
                  <div className="absolute top-0 left-0 w-1 h-full bg-mx" />
                  <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block mb-2">
                    Rendimiento Promedio
                  </span>
                  <span className="font-display text-4xl text-mx leading-none">
                    {data.averagePoints} <span className="font-condensed font-extrabold text-xs uppercase tracking-wider text-gray-500">pts/partido</span>
                  </span>
                  <p className="text-xs text-gray-400 mt-3 font-medium">Promedio de puntos por predicción evaluada</p>
                </div>

                {/* Promedio de goles */}
                <div className="relative bg-panel border border-white/8 rounded-2xl p-6 overflow-hidden hover-lift fade-up-3">
                  <div className="absolute top-0 left-0 w-1 h-full bg-us" />
                  <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.18em] text-gray-500 block mb-2">
                    Promedio Goles por Partido
                  </span>
                  <span className="font-display text-4xl text-us leading-none">
                    {(data.averageScores.avg_home + data.averageScores.avg_away).toFixed(2)}
                  </span>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    Local: <span className="text-gray-300 font-bold">{data.averageScores.avg_home.toFixed(2)}</span> · Visitante: <span className="text-gray-300 font-bold">{data.averageScores.avg_away.toFixed(2)}</span>
                  </p>
                </div>

              </div>

              {/* Detalle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

                {/* 1. Favoritos al título */}
                <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden flex flex-col justify-between fade-up-2">
                  <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
                  <div className="tri-stripe" />
                  <div className="relative z-10 p-6">
                    <h2 className="font-display text-lg text-white uppercase tracking-tight mb-6 flex items-center gap-2.5">
                      <Icon name="trophy" size={20} className="text-gold" />
                      <span className="trophy-text">Favoritos al Título</span>
                    </h2>

                    {data.mostPredictedChampions.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          const totalChampVotes = data.mostPredictedChampions.reduce((sum, item) => sum + item.count, 0)
                          return data.mostPredictedChampions.map((item, index) => {
                            const pct = totalChampVotes > 0 ? (item.count / totalChampVotes) * 100 : 0
                            return (
                              <div key={item.team} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center gap-3 text-sm">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`font-display text-base w-7 text-center flex-shrink-0 ${index === 0 ? 'text-gold' : 'text-gray-600'}`}>
                                      #{index + 1}
                                    </span>
                                    <Flag team={item.team} className="h-4 flex-shrink-0" />
                                    <span className="font-condensed font-extrabold uppercase tracking-wide text-white truncate">{item.team}</span>
                                    {index === 0 && <Icon name="crown" size={14} className="text-gold flex-shrink-0" />}
                                  </div>
                                  <span className="font-display text-sm text-gold flex-shrink-0">
                                    {pct.toFixed(1)}% <span className="font-sans text-xs text-gray-500 font-medium">({item.count})</span>
                                  </span>
                                </div>
                                <div className="w-full bg-ink-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-ca via-gold to-mx transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Icon name="trophy" size={32} className="mx-auto text-gray-600 mb-3" />
                        <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
                          No hay suficientes predicciones de campeón todavía.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 px-6 pb-5 mt-auto">
                    <p className="text-[10px] text-gray-500 border-t border-white/8 pt-4">
                      Elección basada en los campeones seleccionados en los playoffs (bracket) de los usuarios.
                    </p>
                  </div>
                </div>

                {/* 2. Marcadores más predichos */}
                <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden flex flex-col justify-between fade-up-3">
                  <div className="tri-stripe" />
                  <div className="p-6">
                    <h2 className="font-display text-lg text-white uppercase tracking-tight mb-6 flex items-center gap-2.5">
                      <Icon name="ball" size={20} className="text-gold" />
                      Marcadores Más Predichos
                    </h2>

                    {data.popularScores.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(() => {
                          return data.popularScores.map((score, index) => {
                            return (
                              <div
                                key={`${score.predicted_home}-${score.predicted_away}`}
                                className="bg-ink-950/60 border border-white/8 rounded-2xl p-3 flex flex-col items-center justify-between gap-2 text-center hover-lift"
                              >
                                <span className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500">Top {index + 1}</span>
                                <div className="scoreboard rounded-lg px-3 py-1.5 text-2xl whitespace-nowrap">
                                  {score.predicted_home} - {score.predicted_away}
                                </div>
                                <span className="font-condensed font-bold text-[9px] uppercase tracking-wider text-gray-400">
                                  {score.count} pred.
                                </span>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Icon name="ball" size={32} className="mx-auto text-gray-600 mb-3" />
                        <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
                          No hay suficientes predicciones registradas.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 pb-5 mt-auto">
                    <p className="text-[10px] text-gray-500 border-t border-white/8 pt-4">
                      Estadística acumulada en base a marcadores individuales de la fase de grupos.
                    </p>
                  </div>
                </div>

              </div>

              {/* 3. Partidos calientes */}
              <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden p-6 fade-up-4">
                <h2 className="font-display text-lg text-white uppercase tracking-tight mb-6 flex items-center gap-2.5">
                  <Icon name="flame" size={20} className="text-ca" />
                  Partidos con Más Predicciones
                </h2>

                {data.hotMatches.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {data.hotMatches.map((match, idx) => (
                      <div
                        key={match.match_id}
                        className="ticket-card p-4 flex flex-col justify-between hover-lift"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500 truncate">
                            {match.stage}
                          </span>
                          <span className="inline-flex items-center font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold flex-shrink-0">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 my-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Flag team={match.home_team} className="h-3.5 flex-shrink-0" />
                            <span className="font-condensed font-extrabold text-sm text-white uppercase tracking-wide truncate">{match.home_team}</span>
                          </div>
                          <span className="font-display text-[9px] text-gray-600 uppercase leading-none py-0.5">vs</span>
                          <div className="flex items-center gap-2 min-w-0">
                            <Flag team={match.away_team} className="h-3.5 flex-shrink-0" />
                            <span className="font-condensed font-extrabold text-sm text-white uppercase tracking-wide truncate">{match.away_team}</span>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/8 flex items-center gap-1.5 font-condensed font-bold text-[10px] uppercase tracking-wider text-gray-400">
                          <Icon name="chart" size={12} className="text-mx flex-shrink-0" />
                          {match.prediction_count} pronósticos
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Icon name="flame" size={32} className="mx-auto text-gray-600 mb-3" />
                    <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
                      No hay suficientes predicciones en partidos registrados.
                    </p>
                  </div>
                )}
              </div>
            </>
          )
        )}

      </div>
    </div>
  )
}
