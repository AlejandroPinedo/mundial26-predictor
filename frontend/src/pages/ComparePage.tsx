import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import { getPointsBadge } from '../utils/points'
import { LIMA_TZ } from '../utils/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

type Prediction = {
  id: string
  match_id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  predicted_home: number
  predicted_away: number
  home_score: number | null
  away_score: number | null
  points: number | null
  stadium_name?: string
}

type ComparedMatch = {
  matchId: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  stage: string
  homeScore: number | null
  awayScore: number | null
  stadiumName?: string
  myPred: { home: number; away: number; points: number | null } | null
  otherPred: { home: number; away: number; points: number | null } | null
}

export default function ComparePage() {
  const { username } = useParams<{ username: string }>()
  const [loading, setLoading] = useState(true)
  const [comparedMatches, setComparedMatches] = useState<ComparedMatch[]>([])
  const [filter, setFilter] = useState<'all' | 'played' | 'pending'>('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFetch('/predictions/my'),
      apiFetch(`/predictions/user/${encodeURIComponent(username || '')}`),
    ])
      .then(([myData, otherData]) => {
        const myPredictions: Prediction[] = myData.predictions
        const otherPredictions: Prediction[] = otherData.predictions

        // Map predictions by match_id
        const myMap = new Map(myPredictions.map(p => [p.match_id, p]))
        const otherMap = new Map(otherPredictions.map(p => [p.match_id, p]))

        // Collect all match IDs
        const allMatchIds = Array.from(
          new Set([...myPredictions.map(p => p.match_id), ...otherPredictions.map(p => p.match_id)])
        )

        // Merge match predictions
        const merged: ComparedMatch[] = allMatchIds.map(matchId => {
          const m = myMap.get(matchId) || otherMap.get(matchId)
          if (!m) throw new Error('Missing match metadata')

          const my = myMap.get(matchId)
          const other = otherMap.get(matchId)

          return {
            matchId,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            matchDate: m.match_date,
            stage: m.stage,
            homeScore: m.home_score,
            awayScore: m.away_score,
            stadiumName: m.stadium_name,
            myPred: my ? { home: my.predicted_home, away: my.predicted_away, points: my.points } : null,
            otherPred: other ? { home: other.predicted_home, away: other.predicted_away, points: other.points } : null,
          }
        })

        // Sort by match date
        merged.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())

        setComparedMatches(merged)
      })
      .catch(err => {
        console.error('Error fetching comparisons:', err)
      })
      .finally(() => setLoading(false))
  }, [username])

  // Direct comparison stats
  const played = comparedMatches.filter(m => m.homeScore !== null)
  const myTotalComparedPoints = played.reduce((sum, m) => sum + (m.myPred?.points ?? 0), 0)
  const otherTotalComparedPoints = played.reduce((sum, m) => sum + (m.otherPred?.points ?? 0), 0)

  let myWins = 0
  let otherWins = 0
  let ties = 0

  played.forEach(m => {
    const myPts = m.myPred?.points ?? 0
    const otherPts = m.otherPred?.points ?? 0
    if (myPts > otherPts) myWins++
    else if (otherPts > myPts) otherWins++
    else ties++
  })

  const filteredMatches = comparedMatches.filter(m => {
    if (filter === 'played') return m.homeScore !== null
    if (filter === 'pending') return m.homeScore === null
    return true
  })

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

      {/* Back navigation */}
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-gold text-xs font-condensed font-extrabold uppercase tracking-[0.15em] hover:underline mb-6"
        id="back-to-groups-compare-btn"
      >
        <Icon name="chevronLeft" size={14} strokeWidth={2.6} />
        Volver a Grupos
      </Link>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <>
          <PageHeader title="COMPARADOR" subtitle={`Predicciones cara a cara vs ${username}`} icon="⚔️" />

          {/* VS Hero: head to head */}
          <div className="ticket-card mb-8 fade-up-1">
            <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
            <div className="relative z-10 p-5 md:p-7 pl-4 md:pl-7">

              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 md:gap-6">
                {/* My side (CA red) */}
                <div className="text-center min-w-0">
                  <p className="font-display text-2xl md:text-4xl text-ca uppercase leading-none truncate">Tú</p>
                  <div className="mt-3">
                    <span className="scoreboard inline-block px-3 py-1 rounded-lg text-xl md:text-2xl leading-none">
                      {myTotalComparedPoints}
                    </span>
                    <span className="block mt-1.5 text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500">
                      Tus puntos
                    </span>
                  </div>
                </div>

                {/* Center VS */}
                <div className="text-center pt-1 md:pt-2">
                  <span className="font-display text-lg md:text-2xl text-gray-600 select-none">VS</span>
                </div>

                {/* Other side (US blue) */}
                <div className="text-center min-w-0">
                  <p className="font-display text-2xl md:text-4xl text-us uppercase leading-none truncate">{username}</p>
                  <div className="mt-3">
                    <span className="scoreboard inline-block px-3 py-1 rounded-lg text-xl md:text-2xl leading-none">
                      {otherTotalComparedPoints}
                    </span>
                    <span className="block mt-1.5 text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500">
                      Puntos de {username}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pitch-divider mt-5 mb-4" />

              {/* Head-to-head record */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                <span className="chip text-mx border-mx/25 bg-mx/10">{myWins} victorias directas</span>
                <span className="chip text-gold border-gold/25 bg-gold/10">{ties} empates</span>
                <span className="chip text-us border-us/25 bg-us/10">{otherWins} victorias de {username}</span>
              </div>
              <p className="text-center text-[10px] text-gray-500 mt-2.5 font-medium">
                Acumulado en partidos disputados
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap fade-up-2">
            {(
              [
                { code: 'all', label: 'Todos los partidos' },
                { code: 'played', label: `Jugados (${played.length})` },
                { code: 'pending', label: `Pendientes (${comparedMatches.length - played.length})` },
              ] as const
            ).map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setFilter(code)}
                className={`px-4 py-2 rounded-xl text-[11px] font-condensed font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  filter === code
                    ? 'bg-gold text-ink-950 shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]'
                    : 'bg-panel border border-white/8 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Matches List */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up-3">
              {filteredMatches.map(m => {
                const hasResult = m.homeScore !== null
                const myPts = m.myPred?.points
                const otherPts = m.otherPred?.points

                // Determine winner of this match comparison
                let outcome: 'win' | 'lose' | 'tie' | 'none' = 'none'
                if (hasResult) {
                  const myPointsVal = myPts ?? 0
                  const otherPointsVal = otherPts ?? 0
                  if (myPointsVal > otherPointsVal) outcome = 'win'
                  else if (otherPointsVal > myPointsVal) outcome = 'lose'
                  else outcome = 'tie'
                }

                return (
                  <div
                    key={m.matchId}
                    className={`bg-panel border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${
                      outcome === 'win'
                        ? 'border-mx/35 hover:border-mx/55'
                        : outcome === 'lose'
                        ? 'border-ca/35 hover:border-ca/55'
                        : outcome === 'tie'
                        ? 'border-gold/35 hover:border-gold/55'
                        : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    {/* Top metadata */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="chip text-us border-us/20 bg-us/[0.08] self-start">{m.stage}</span>
                        {m.stadiumName && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                            <Icon name="stadium" size={11} />
                            {m.stadiumName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Icon name="clock" size={11} />
                          {new Date(m.matchDate).toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: LIMA_TZ,
                          })}
                        </span>
                        {hasResult && (
                          <>
                            {outcome === 'win' && (
                              <span className="chip text-mx border-mx/30 bg-mx/10">¡Ganaste!</span>
                            )}
                            {outcome === 'lose' && (
                              <span className="chip text-ca border-ca/30 bg-ca/10">Perdiste</span>
                            )}
                            {outcome === 'tie' && (
                              <span className="chip text-gold border-gold/30 bg-gold/10">Empate</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Main Teams Match Score */}
                    <div className="flex justify-between items-center gap-2 font-condensed font-extrabold text-base md:text-lg tracking-wide py-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-2xl no-invert">{getFlag(m.homeTeam)}</span>
                        <span className="truncate uppercase text-white">{m.homeTeam}</span>
                      </div>

                      <div className="flex-shrink-0">
                        {hasResult ? (
                          <span className="scoreboard px-3 py-1 rounded-lg text-sm md:text-base leading-none">
                            {m.homeScore} - {m.awayScore}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.25em]">
                            VS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className="truncate uppercase text-white">{m.awayTeam}</span>
                        <span className="text-2xl no-invert">{getFlag(m.awayTeam)}</span>
                      </div>
                    </div>

                    {/* Side-by-side Predictions */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      {/* My Prediction */}
                      <div
                        className={`p-3 rounded-xl border ${
                          outcome === 'win'
                            ? 'bg-mx/[0.05] border-mx/20'
                            : outcome === 'tie'
                            ? 'bg-gold/[0.04] border-gold/15'
                            : 'bg-ink-950/60 border-white/8'
                        }`}
                      >
                        <span className="text-[9px] text-ca font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5">
                          Tu Predicción
                        </span>
                        {m.myPred ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-display text-base text-white">
                              {m.myPred.home} - {m.myPred.away}
                            </span>
                            {hasResult && (
                              <span
                                className={`chip self-start ${
                                  myPts === 3
                                    ? 'text-gold border-gold/30 bg-gold/10'
                                    : myPts === 1
                                    ? 'text-mx border-mx/30 bg-mx/10'
                                    : 'text-gray-500'
                                }`}
                              >
                                {myPts} pts — {getPointsBadge(myPts ?? 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold italic">
                            Sin pred. <span className="no-invert">⚠️</span>
                          </span>
                        )}
                      </div>

                      {/* Other User Prediction */}
                      <div
                        className={`p-3 rounded-xl border ${
                          outcome === 'lose'
                            ? 'bg-ca/[0.05] border-ca/20'
                            : outcome === 'tie'
                            ? 'bg-gold/[0.04] border-gold/15'
                            : 'bg-ink-950/60 border-white/8'
                        }`}
                      >
                        <span className="text-[9px] text-us font-condensed font-extrabold uppercase tracking-[0.15em] block mb-1.5 truncate">
                          Pred. de {username}
                        </span>
                        {m.otherPred ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-display text-base text-white">
                              {m.otherPred.home} - {m.otherPred.away}
                            </span>
                            {hasResult && (
                              <span
                                className={`chip self-start ${
                                  otherPts === 3
                                    ? 'text-gold border-gold/30 bg-gold/10'
                                    : otherPts === 1
                                    ? 'text-mx border-mx/30 bg-mx/10'
                                    : 'text-gray-500'
                                }`}
                              >
                                {otherPts} pts — {getPointsBadge(otherPts ?? 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold italic">
                            Sin pred. <span className="no-invert">⚠️</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-panel border border-white/8 rounded-2xl fade-up-2">
              <Icon name="target" size={44} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-white font-condensed font-extrabold uppercase tracking-wide text-base mb-1">
                No hay partidos en esta categoría
              </h3>
              <p className="text-gray-400 text-sm">Prueba seleccionando una pestaña de filtro diferente.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
