import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getPointsBadge } from '../utils/points'
import { getFlag } from '../utils/flags'
import { LIMA_TZ } from '../utils/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

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

type BracketPredictions = { round16: string[]; quarter: string[]; semi: string[]; finalist: string[]; champion: string[] }

const ROUND_LABELS: Record<string, { label: string; pts: number; icon: string }> = {
  round16: { label: 'Ronda de 32', pts: 1, icon: '⚽' },
  quarter: { label: 'Cuartos de Final', pts: 2, icon: '🔥' },
  semi: { label: 'Semifinal', pts: 4, icon: '⭐' },
  finalist: { label: 'Finalistas', pts: 6, icon: '🥈' },
  champion: { label: 'Campeón', pts: 10, icon: '🏆' },
}

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [bracket, setBracket] = useState<BracketPredictions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/predictions/my'),
      apiFetch('/bracket/my'),
    ]).then(([d, b]) => {
      setPredictions(d.predictions)
      setBracket(b.predictions)
    }).finally(() => setLoading(false))
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
    <div className="max-w-5xl 2xl:max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

      <PageHeader title="MIS PREDICCIONES" subtitle="Tu historial de pronósticos · Mundial 2026" icon="🎯" action={
        predictions.length > 0 ? (
          <button
            onClick={handleShare}
            className="btn-gold text-xs cursor-pointer"
          >
            <Icon name="share" size={14} />
            Compartir
          </button>
        ) : undefined
      } />

      {!loading && predictions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 fade-up-1">
          <div className="ticket-card rounded-2xl p-4 text-center">
            <div className="font-display text-3xl text-gold leading-none">{totalPoints}</div>
            <div className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] mt-2">Puntos</div>
          </div>
          <div className="ticket-card rounded-2xl p-4 text-center">
            <div className="font-display text-3xl text-white leading-none">{played.length}</div>
            <div className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] mt-2">Jugados</div>
          </div>
          <div className="ticket-card rounded-2xl p-4 text-center">
            <div className="font-display text-3xl text-us leading-none">{pending.length}</div>
            <div className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] mt-2">Pendientes</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : predictions.length === 0 ? (
        <div className="relative overflow-hidden text-center py-20 bg-panel border border-white/8 rounded-2xl fade-up-1">
          <span className="wm-26 left-1/2 -translate-x-1/2 -bottom-10" aria-hidden="true">26</span>
          <div className="relative z-10">
            <p className="text-5xl mb-4 no-invert">🎯</p>
            <h3 className="text-white font-condensed font-extrabold uppercase tracking-wide text-lg mb-1">Aún no tienes predicciones</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Comienza a pronosticar los resultados de los partidos para acumular puntos.
            </p>
            <Link to="/matches" className="btn-gold text-sm">
              Ver Partidos <span className="no-invert">⚽</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8 fade-up-2">

          {/* Pending Section */}
          {pending.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="font-condensed font-black text-sm text-white uppercase tracking-[0.16em]">
                  Predicciones Pendientes <span className="text-us">({pending.length})</span>
                </h2>
                <div className="tri-stripe w-12 rounded-full mt-1.5" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {pending.map(p => (
                  <div key={p.id} className="ticket-card rounded-2xl p-4 flex flex-col justify-between hover-lift">
                    <div className="flex justify-between items-center gap-2 mb-2.5 relative z-10">
                      <span className="chip border-us/25 bg-us/10 text-us">
                        <Icon name="clock" size={10} />
                        Pendiente
                      </span>
                      <span className="text-[9px] font-condensed font-extrabold text-gray-500 uppercase tracking-wider text-right">
                        {p.group_name ? `Grupo ${p.group_name}` : p.stage || 'Mundial 2026'}
                        {' · '}
                        {new Date(p.match_date).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 py-1.5 relative z-10">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.home_team)}</span>
                        <span className="truncate uppercase font-display text-sm text-white">{p.home_team}</span>
                      </div>

                      <div className="scoreboard px-3 py-1 rounded-lg text-sm min-w-14 text-center flex-shrink-0">
                        {p.predicted_home} - {p.predicted_away}
                      </div>

                      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                        <span className="truncate uppercase font-display text-sm text-white text-right">{p.away_team}</span>
                        <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.away_team)}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/8 mt-3 pt-2.5 flex items-center justify-between gap-2 text-[10px] relative z-10">
                      <span className="text-gray-500 font-condensed font-bold tracking-wider truncate">
                        {p.stadium_name && (
                          <>
                            <span className="no-invert">🏟️</span> {p.stadium_name}
                          </>
                        )}
                      </span>
                      <Link to="/matches" className="text-gold hover:underline font-condensed font-extrabold uppercase tracking-wider flex-shrink-0">
                        Editar
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Played Section */}
          {played.length > 0 && (
            <div>
              <div className="mb-4">
                <h2 className="font-condensed font-black text-sm text-white uppercase tracking-[0.16em]">
                  Predicciones Evaluadas <span className="text-gold">({played.length})</span>
                </h2>
                <div className="tri-stripe w-12 rounded-full mt-1.5" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {played.map(p => {
                  const isExact = p.points === 3
                  const isCorrect = p.points === 1

                  return (
                    <div
                      key={p.id}
                      className={`ticket-card rounded-2xl p-4 flex flex-col justify-between ${
                        isExact
                          ? 'ring-1 ring-gold/30'
                          : isCorrect
                          ? 'ring-1 ring-mx/25'
                          : 'ring-1 ring-ca/15'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] font-condensed font-extrabold text-gray-500 uppercase tracking-wider mb-2 relative z-10">
                        <span>
                          {p.group_name ? `Grupo ${p.group_name}` : p.stage || 'Mundial 2026'}
                        </span>
                        <span>
                          {new Date(p.match_date).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: LIMA_TZ })}
                        </span>
                      </div>

                      {/* Match Result Scoreboard */}
                      <div className="flex items-center justify-between gap-3 py-1 relative z-10">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.home_team)}</span>
                          <span className="truncate uppercase font-display text-sm text-white">{p.home_team}</span>
                        </div>

                        <div className="scoreboard px-3 py-1 rounded-lg text-sm min-w-16 text-center select-none flex-shrink-0">
                          {p.home_score} - {p.away_score}
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                          <span className="truncate uppercase font-display text-sm text-white text-right">{p.away_team}</span>
                          <span className="text-xl no-invert leading-none flex-shrink-0">{getFlag(p.away_team)}</span>
                        </div>
                      </div>

                      {/* Prediction Comparison Footer */}
                      <div className="border-t border-white/8 mt-3 pt-3 flex items-center justify-between gap-2 relative z-10">
                        <div className="text-[10px] text-gray-500 font-condensed font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>Mi Pred:</span>
                          <span className="text-gold font-extrabold text-xs">
                            {p.predicted_home} - {p.predicted_away}
                          </span>
                        </div>

                        <span className={`chip flex-shrink-0 ${
                          isExact
                            ? 'border-gold/30 bg-gold/10 text-gold'
                            : isCorrect
                            ? 'border-mx/30 bg-mx/10 text-mx'
                            : 'border-ca/25 bg-ca/10 text-ca'
                        }`}>
                          {p.points} PTS — {getPointsBadge(p.points ?? 0)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Bracket predictions */}
      {bracket && Object.values(bracket).some(arr => arr.length > 0) && (
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="font-condensed font-black text-sm text-white uppercase tracking-[0.16em]">
              Bracket de Playoffs
            </h2>
            <div className="tri-stripe w-12 rounded-full mt-1.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(ROUND_LABELS).map(([round, meta]) => {
              const teams = bracket[round as keyof BracketPredictions] || []
              if (teams.length === 0) return null
              return (
                <div key={round} className="bg-panel border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="no-invert">{meta.icon}</span>
                    <span className="font-condensed font-extrabold text-sm text-white uppercase tracking-wide">{meta.label}</span>
                    <span className="chip border-gold/25 bg-gold/10 text-gold ml-auto">{meta.pts} pts c/u</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teams.map(team => (
                      <span key={team} className="flex items-center gap-1.5 bg-panel-2 border border-white/10 rounded-xl px-3 py-1 text-xs font-medium text-gray-200">
                        <span className="no-invert">{getFlag(team)}</span>
                        <span>{team}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
