import { useEffect, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import PredictionProgress from '../components/PredictionProgress'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import Flag from '../components/Flag'
import MatchPrediction from '../components/MatchPrediction'
import { LIMA_TZ } from '../utils/dates'
import { useRealtimeMatches } from '../hooks/useRealtimeMatches'
import { calculateGroupStandings, getBestThirdPlacedTeams, type TeamStats, type ThirdPlaceStats } from '../utils/standings'
import { HOST_NATIONS } from '../utils/ratings'
import { currentElo } from '../predict/elo'
import { predictMatch } from '../predict/predictMatch'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  group_name: string
  home_score: number | null
  away_score: number | null
  stadium_name?: string
}

type Prediction = {
  match_id: string
  predicted_home: number
  predicted_away: number
  points: number | null
}

function StandingsTable({ teams }: { teams: TeamStats[] }) {
  return (
    <div className="bg-panel border border-white/8 rounded-2xl overflow-hidden">
      <div className="tri-stripe" aria-hidden="true" />
      <div className="p-4">
        <h3 className="font-condensed font-extrabold text-gold text-[11px] uppercase tracking-[0.18em] mb-3">Tabla del Grupo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/8 font-condensed uppercase tracking-wider">
                <th className="py-2 w-8 font-extrabold">#</th>
                <th className="py-2 font-extrabold">Equipo</th>
                <th className="py-2 text-center w-8 font-extrabold">PJ</th>
                <th className="py-2 text-center w-8 font-extrabold">DG</th>
                <th className="py-2 text-center w-10 font-extrabold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t, idx) => (
                <tr key={t.team} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition">
                  <td className="py-2.5 font-display text-sm">
                    <span className={idx < 2 ? 'text-mx' : idx === 2 ? 'text-us' : 'text-gray-600'}>{idx + 1}</span>
                  </td>
                  <td className="py-2.5 flex items-center gap-1.5 font-medium truncate">
                    <Flag team={t.team} className="h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[110px] text-gray-200">{t.team}</span>
                  </td>
                  <td className="py-2.5 text-center text-gray-400">{t.mp}</td>
                  <td className="py-2.5 text-center text-gray-400">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                  <td className="py-2.5 text-center font-display text-gold">{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] text-gray-500 flex flex-col gap-1 border-t border-white/8 pt-3 font-condensed font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-mx inline-block"/> Clasifica directo (1° y 2°)</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-us inline-block"/> Posible clasificación (3°)</span>
        </div>
      </div>
    </div>
  )
}

function BestThirdsModal({ thirds, onClose }: { thirds: ThirdPlaceStats[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-panel border border-white/10 rounded-2xl w-full max-w-md overflow-hidden fade-up" onClick={e => e.stopPropagation()}>
        <div className="tri-stripe" aria-hidden="true" />
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-condensed font-extrabold text-sm text-gold uppercase tracking-[0.16em]">Tabla de Mejores Terceros</h3>
            <button onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-white transition cursor-pointer p-1">
              <Icon name="x" size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Los 8 mejores terceros avanzan a la Ronda de 32 (Dieciseisavos de Final).</p>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-white/8 font-condensed uppercase tracking-wider">
                  <th className="py-2 w-8 font-extrabold">#</th>
                  <th className="py-2 w-16 text-center font-extrabold">Grupo</th>
                  <th className="py-2 font-extrabold">Equipo</th>
                  <th className="py-2 text-center w-8 font-extrabold">PJ</th>
                  <th className="py-2 text-center w-8 font-extrabold">DG</th>
                  <th className="py-2 text-center w-10 font-extrabold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {thirds.map((t, idx) => (
                  <tr key={t.team} className={`border-b border-white/5 last:border-0 ${idx < 8 ? 'bg-us/5' : ''}`}>
                    <td className="py-2.5">
                      <span className={idx < 8 ? 'text-us font-display text-sm' : 'text-gray-600 font-bold'}>{idx + 1}</span>
                    </td>
                    <td className="py-2.5 text-gray-400 font-condensed font-bold text-center uppercase">Grupo {t.group}</td>
                    <td className="py-2.5 flex items-center gap-1.5 font-medium truncate">
                      <Flag team={t.team} className="h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[120px] text-gray-200">{t.team}</span>
                    </td>
                    <td className="py-2.5 text-center text-gray-400">{t.mp}</td>
                    <td className="py-2.5 text-center text-gray-400">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                    <td className="py-2.5 text-center font-display text-gold">{t.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [activeGroup, setActiveGroup] = useState<string>('A')
  const [loading, setLoading] = useState(true)
  const [showThirds, setShowThirds] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my'),
    ]).then(([matchData, predData]) => {
      setMatches(matchData.matches)
      const map: Record<string, Prediction> = {}
      for (const p of predData.predictions) map[p.match_id] = p
      setPredictions(map)

      // Seed inputs with saved predictions
      const initInputs: Record<string, { home: string; away: string }> = {}
      for (const p of predData.predictions) {
        initInputs[p.match_id] = { home: String(p.predicted_home), away: String(p.predicted_away) }
      }
      setInputs(initInputs)
    }).finally(() => setLoading(false))
  }, [])

  const handleRealtimeUpdate = useCallback((updatedMatches: Match[]) => {
    setMatches(updatedMatches)
  }, [])

  useRealtimeMatches(handleRealtimeUpdate)

  // Elo en vivo: snapshot + resultados ya jugados. Se recalcula al cambiar los marcadores,
  // por lo que las predicciones de los partidos siguientes reaccionan a lo que va pasando.
  const liveElo = useMemo(() => currentElo(matches), [matches])

  async function handlePredict(matchId: string) {
    const input = inputs[matchId]
    if (!input?.home || !input?.away) { toast.error('Ingresa ambos marcadores'); return }
    try {
      await apiFetch('/predictions', {
        method: 'POST',
        body: JSON.stringify({ matchId, predictedHome: Number(input.home), predictedAway: Number(input.away) }),
      })
      toast.success('Predicción guardada')
      const d = await apiFetch('/predictions/my')
      const map: Record<string, Prediction> = {}
      for (const p of d.predictions) map[p.match_id] = p
      setPredictions(map)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  async function handlePredictAll() {
    const pending = groupMatches.filter(m => m.home_score === null && new Date() < new Date(m.match_date))
    const toPredict = pending.filter(m => inputs[m.id]?.home && inputs[m.id]?.away)
    if (toPredict.length === 0) { toast.error('Completa al menos un marcador'); return }
    try {
      await Promise.all(toPredict.map(m =>
        apiFetch('/predictions', {
          method: 'POST',
          body: JSON.stringify({ matchId: m.id, predictedHome: Number(inputs[m.id].home), predictedAway: Number(inputs[m.id].away) }),
        })
      ))
      toast.success(`${toPredict.length} predicciones guardadas`)
      const d = await apiFetch('/predictions/my')
      const map: Record<string, Prediction> = {}
      for (const p of d.predictions) map[p.match_id] = p
      setPredictions(map)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const now = new Date()
  const groups = [...new Set(matches.map(m => m.group_name))].sort()
  const totalPending = matches.filter(m => m.home_score === null && now < new Date(m.match_date)).length
  const predicted = matches.filter(m => m.home_score === null && now < new Date(m.match_date) && predictions[m.id]).length
  const groupMatches = matches
    .filter(m => m.group_name === activeGroup)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const nextMatch = matches.find(m => m.home_score === null && now < new Date(m.match_date))

  function getDeadlineWarning(match_date: string) {
    const diff = new Date(match_date).getTime() - now.getTime()
    const hours = diff / (1000 * 60 * 60)
    if (hours < 0) return null
    if (hours < 3) return { label: `${Math.floor(diff / 60000)} min`, color: 'text-ca' }
    if (hours < 24) return { label: `${Math.floor(hours)}h`, color: 'text-gold' }
    return null
  }

  // Reactive / real-time standings calculation
  const computedPredictions: Record<string, Prediction> = { ...predictions }
  for (const [matchId, input] of Object.entries(inputs)) {
    if (input?.home !== undefined && input?.away !== undefined && input.home !== '' && input.away !== '') {
      computedPredictions[matchId] = {
        match_id: matchId,
        predicted_home: Number(input.home),
        predicted_away: Number(input.away),
        points: null
      }
    }
  }

  const standings = calculateGroupStandings(matches, computedPredictions)
  const groupStandings = standings[activeGroup] || []
  const thirds = getBestThirdPlacedTeams(standings)

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 py-6 font-sans">

      <PageHeader title="PARTIDOS" subtitle="Fase de grupos · Copa Mundial FIFA 2026 · Horarios en hora de Perú (GMT-5)" live badge="FIFA WC26" icon="⚽" />

      <div className="mb-6 fade-up-1">
        <PredictionProgress predicted={predicted} total={totalPending} />
      </div>

      {nextMatch && (
        <div className="ticket-card rounded-2xl p-5 mb-6 fade-up-2">
          <span className="wm-26 -right-2 -bottom-12" aria-hidden="true">26</span>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="chip border-gold/30 bg-gold/10 text-gold">
                <span className="w-1.5 h-1.5 rounded-full bg-gold live-dot" />
                Próximo partido
              </span>
              <span className="ml-auto chip text-gray-400">Grupo {nextMatch.group_name}</span>
            </div>
            <div className="flex justify-between items-center max-w-3xl mx-auto">
              <div className="text-center flex-1 min-w-0">
                <p className="mb-1.5"><Flag team={nextMatch.home_team} className="h-7" /></p>
                <p className="font-display text-sm md:text-base text-white uppercase tracking-wide truncate">{nextMatch.home_team}</p>
              </div>
              <div className="text-center px-4 sm:px-6 flex-shrink-0">
                <div className="scoreboard px-4 py-2 rounded-lg text-2xl">VS</div>
                <p className="text-gray-500 text-[10px] mt-2 font-condensed font-extrabold uppercase tracking-[0.18em]">
                  {new Date(nextMatch.match_date).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: LIMA_TZ })}
                </p>
                <p className="text-gold font-display text-base leading-tight">
                  {new Date(nextMatch.match_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ })}
                </p>
              </div>
              <div className="text-center flex-1 min-w-0">
                <p className="mb-1.5"><Flag team={nextMatch.away_team} className="h-7" /></p>
                <p className="font-display text-sm md:text-base text-white uppercase tracking-wide truncate">{nextMatch.away_team}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-4 gap-3 flex-wrap fade-up-3">
        <div>
          <h2 className="font-display text-2xl text-white uppercase tracking-tight">Partidos y Tablas</h2>
          <div className="tri-stripe w-16 rounded-full mt-2" aria-hidden="true" />
        </div>
        <button
          onClick={() => setShowThirds(true)}
          className="bg-us/10 border border-us/30 text-us font-condensed font-extrabold uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-us/20 text-xs transition cursor-pointer inline-flex items-center gap-1.5"
        >
          <Icon name="trophy" size={13} />
          Ver Mejores Terceros
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto py-2 mb-6">
        {groups.map(g => {
          const groupUnpredicted = matches.filter(m =>
            m.group_name === g && m.home_score === null &&
            now < new Date(m.match_date) && !predictions[m.id]
          ).length
          return (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-condensed font-extrabold uppercase tracking-wider transition flex-shrink-0 cursor-pointer ${
                activeGroup === g ? 'bg-gold text-ink-950 shadow-lg shadow-gold/20' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}>
              Grupo {g}
              {groupUnpredicted > 0 && (
                <span className="inline-flex items-center justify-center bg-ca text-white font-black rounded-full flex-shrink-0"
                  style={{ fontSize: 9, minWidth: 16, height: 16, padding: '0 3px' }}>
                  {groupUnpredicted}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? <Spinner /> : (
        <div className="grid lg:grid-cols-3 gap-6 fade-up-4">

          {/* Standings Column */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <StandingsTable teams={groupStandings} />
          </div>

          {/* Matches Column */}
          <div className="lg:col-span-2">
            {groupMatches.some(m => m.home_score === null && now < new Date(m.match_date) && inputs[m.id]?.home && inputs[m.id]?.away) && (
              <button onClick={handlePredictAll}
                className="w-full bg-gold/10 border border-gold/30 text-gold font-condensed font-extrabold uppercase tracking-wider py-2.5 rounded-xl mb-4 hover:bg-gold/20 transition text-xs cursor-pointer">
                Guardar todas las predicciones del Grupo {activeGroup}
              </button>
            )}

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              {groupMatches.map(match => {
                const pred = predictions[match.id]
                const played = match.home_score !== null
                const started = now > new Date(match.match_date)
                const isNext = nextMatch?.id === match.id
                const deadline = getDeadlineWarning(match.match_date)
                const prediction = played ? null : predictMatch(match.home_team, match.away_team, {
                  neutralVenue: !HOST_NATIONS.has(match.home_team),
                  elo: liveElo,
                })

                return (
                  <div key={match.id}
                    className={`ticket-card rounded-2xl flex flex-col transition-all hover:-translate-y-0.5 ${
                      isNext ? 'ring-1 ring-gold/30 shadow-lg shadow-gold/5' :
                      played ? 'opacity-75' : ''
                    }`}>
                    <div className="p-4 sm:p-5 relative z-10 flex flex-1 flex-col">
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        {played ? (
                          <span className="chip text-gray-400">
                            <Icon name="check" size={10} />
                            Finalizado
                          </span>
                        ) : started ? (
                          <span className="chip border-mx/30 bg-mx/10 text-mx">
                            <span className="w-1.5 h-1.5 rounded-full bg-mx animate-pulse" />
                            En juego
                          </span>
                        ) : (
                          <span className="chip border-us/25 bg-us/10 text-us">
                            <Icon name="clock" size={10} />
                            Pendiente
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <p className="text-gray-500 text-[10px] font-condensed font-bold uppercase tracking-[0.14em]">
                            {new Date(match.match_date).toLocaleDateString('es', {
                              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ
                            })}
                          </p>
                          {deadline && !played && !started && (
                            <span className={`text-[10px] font-condensed font-extrabold ${deadline.color} flex items-center gap-1`}>
                              <Icon name="clock" size={11} />{deadline.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Flag team={match.home_team} className="h-4.5 flex-shrink-0" />
                          <span className="font-display text-sm text-white uppercase tracking-wide truncate">{match.home_team}</span>
                        </div>
                        <div className="text-center px-3 flex-shrink-0">
                          {played ? (
                            <div className="scoreboard px-3 py-1.5 rounded-lg text-base">
                              {match.home_score} - {match.away_score}
                            </div>
                          ) : started ? (
                            <span className="text-mx text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-mx animate-pulse" />
                              En vivo
                            </span>
                          ) : (
                            <span className="text-gray-600 text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em]">vs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                          <span className="font-display text-sm text-white uppercase tracking-wide truncate text-right">{match.away_team}</span>
                          <Flag team={match.away_team} className="h-4.5 flex-shrink-0" />
                        </div>
                      </div>

                      {pred && (played || started) && (
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-gray-500 text-[10px] font-condensed font-bold uppercase tracking-wider">Tu pred:</span>
                          <span className="text-gold font-display text-sm">{pred.predicted_home} — {pred.predicted_away}</span>
                          {pred.points !== null && (
                            <span className={`chip ${
                              pred.points === 3 ? 'border-gold/30 bg-gold/10 text-gold' :
                              pred.points === 1 ? 'border-mx/30 bg-mx/10 text-mx' :
                              'border-ca/25 bg-ca/10 text-ca'
                            }`}>{pred.points}pts</span>
                          )}
                        </div>
                      )}

                      {!played && !started && (
                        <div className="flex gap-2 items-center justify-center">
                          <input type="number" min="0" max="20" placeholder="0"
                            className="w-11 h-11 bg-ink-950 text-gold text-center rounded-xl font-display text-base border border-white/10 focus:border-gold/60 focus:shadow-[0_0_12px_-2px_rgba(255,195,0,0.4)] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={inputs[match.id]?.home || ''}
                            onChange={e => setInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))} />
                          <span className="text-gray-600 text-[10px] font-condensed font-extrabold select-none">VS</span>
                          <input type="number" min="0" max="20" placeholder="0"
                            className="w-11 h-11 bg-ink-950 text-gold text-center rounded-xl font-display text-base border border-white/10 focus:border-gold/60 focus:shadow-[0_0_12px_-2px_rgba(255,195,0,0.4)] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={inputs[match.id]?.away || ''}
                            onChange={e => setInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))} />
                          <button onClick={() => handlePredict(match.id)}
                            className="btn-gold text-xs active:scale-95 cursor-pointer">
                            {pred ? 'Actualizar' : 'Predecir'}
                          </button>
                        </div>
                      )}

                      {prediction && (
                        <MatchPrediction
                          prediction={prediction}
                          userPred={pred ? { home: pred.predicted_home, away: pred.predicted_away } : null}
                          className="mt-auto"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}

      {showThirds && (
        <BestThirdsModal thirds={thirds} onClose={() => setShowThirds(false)} />
      )}
    </div>
  )
}
