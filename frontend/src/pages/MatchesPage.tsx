import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import { calculateGroupStandings, getBestThirdPlacedTeams, type TeamStats, type ThirdPlaceStats } from '../utils/standings'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  group_name: string
  home_score: number | null
  away_score: number | null
}

type Prediction = {
  match_id: string
  predicted_home: number
  predicted_away: number
  points: number | null
}

function StandingsTable({ teams }: { teams: TeamStats[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-hidden">
      <h3 className="font-bold text-yellow-400 text-xs uppercase tracking-wider mb-3">Tabla del Grupo</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="py-2 w-8">#</th>
              <th className="py-2">Equipo</th>
              <th className="py-2 text-center w-8">PJ</th>
              <th className="py-2 text-center w-8">DG</th>
              <th className="py-2 text-center w-10 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, idx) => (
              <tr key={t.team} className="border-b border-gray-800/40 last:border-0 hover:bg-gray-800/20 transition">
                <td className="py-2.5 font-bold text-gray-500">
                  <span className={idx < 2 ? 'text-green-400' : idx === 2 ? 'text-blue-400' : ''}>{idx + 1}</span>
                </td>
                <td className="py-2.5 flex items-center gap-1.5 font-medium truncate">
                  <span className="text-lg flex-shrink-0 no-invert">{getFlag(t.team)}</span>
                  <span className="truncate max-w-[110px]">{t.team}</span>
                </td>
                <td className="py-2.5 text-center text-gray-400">{t.mp}</td>
                <td className="py-2.5 text-center text-gray-400">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                <td className="py-2.5 text-center font-bold text-yellow-400">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-[10px] text-gray-500 flex flex-col gap-1 border-t border-gray-800/60 pt-3">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/> Clasifica directo (1° y 2°)</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/> Posible clasificación (3°)</span>
      </div>
    </div>
  )
}

function BestThirdsModal({ thirds, onClose }: { thirds: ThirdPlaceStats[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-yellow-400 uppercase tracking-wider">Tabla de Mejores Terceros</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Los 8 mejores terceros avanzan a la Ronda de 32 (Dieciseisavos de Final).</p>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="py-2 w-8">#</th>
                <th className="py-2 w-16 text-center">Grupo</th>
                <th className="py-2">Equipo</th>
                <th className="py-2 text-center w-8">PJ</th>
                <th className="py-2 text-center w-8">DG</th>
                <th className="py-2 text-center w-10 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {thirds.map((t, idx) => (
                <tr key={t.team} className={`border-b border-gray-800/40 last:border-0 ${idx < 8 ? 'bg-blue-500/5' : ''}`}>
                  <td className="py-2.5 font-bold">
                    <span className={idx < 8 ? 'text-blue-400 font-black' : 'text-gray-600'}>{idx + 1}</span>
                  </td>
                  <td className="py-2.5 text-gray-400 font-bold text-center">Grupo {t.group}</td>
                  <td className="py-2.5 flex items-center gap-1.5 font-medium truncate">
                    <span className="text-lg flex-shrink-0 no-invert">{getFlag(t.team)}</span>
                    <span className="truncate max-w-[120px]">{t.team}</span>
                  </td>
                  <td className="py-2.5 text-center text-gray-400">{t.mp}</td>
                  <td className="py-2.5 text-center text-gray-400">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                  <td className="py-2.5 text-center font-bold text-yellow-400">{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const groupMatches = matches
    .filter(m => m.group_name === activeGroup)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const nextMatch = matches.find(m => m.home_score === null && now < new Date(m.match_date))

  function getDeadlineWarning(match_date: string) {
    const diff = new Date(match_date).getTime() - now.getTime()
    const hours = diff / (1000 * 60 * 60)
    if (hours < 0) return null
    if (hours < 3) return { label: `${Math.floor(diff / 60000)} min`, color: 'text-red-400' }
    if (hours < 24) return { label: `${Math.floor(hours)}h`, color: 'text-orange-400' }
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {nextMatch && (
          <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-2xl p-5 mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3">⚡ Próximo partido</p>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-2xl mb-1 no-invert">{getFlag(nextMatch.home_team)}</p>
                <p className="font-bold text-sm">{nextMatch.home_team}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-gray-400 text-xs font-bold">
                  {new Date(nextMatch.match_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-white font-bold">
                  {new Date(nextMatch.match_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-gray-600 text-xs">Grupo {nextMatch.group_name}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl mb-1 no-invert">{getFlag(nextMatch.away_team)}</p>
                <p className="font-bold text-sm">{nextMatch.away_team}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-yellow-400">Partidos y Tablas <span className="no-invert">⚽</span></h1>
          <button
            onClick={() => setShowThirds(true)}
            className="bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-4 py-1.5 rounded-xl hover:bg-blue-500/20 text-xs transition"
          >
            Ver Mejores Terceros
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto py-2 mb-6 scrollbar-hide">
          {groups.map(g => {
            const groupUnpredicted = matches.filter(m =>
              m.group_name === g && m.home_score === null &&
              now < new Date(m.match_date) && !predictions[m.id]
            ).length
            return (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition flex-shrink-0 ${
                  activeGroup === g ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}>
                Grupo {g}
                {groupUnpredicted > 0 && (
                  <span className="inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full flex-shrink-0"
                    style={{ fontSize: 9, minWidth: 16, height: 16, padding: '0 3px' }}>
                    {groupUnpredicted}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? <Spinner /> : (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Standings Column */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <StandingsTable teams={groupStandings} />
            </div>

            {/* Matches Column */}
            <div className="lg:col-span-2">
              {groupMatches.some(m => m.home_score === null && now < new Date(m.match_date) && inputs[m.id]?.home && inputs[m.id]?.away) && (
                <button onClick={handlePredictAll}
                  className="w-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold py-2 rounded-xl mb-4 hover:bg-yellow-400/20 transition text-sm">
                  Guardar todas las predicciones del Grupo {activeGroup}
                </button>
              )}

              <div className="flex flex-col gap-3">
                {groupMatches.map(match => {
                  const pred = predictions[match.id]
                  const played = match.home_score !== null
                  const started = now > new Date(match.match_date)
                  const isNext = nextMatch?.id === match.id
                  const deadline = getDeadlineWarning(match.match_date)

                  return (
                    <div key={match.id}
                      className={`rounded-2xl p-4 transition ${
                        isNext ? 'bg-yellow-400/10 border border-yellow-400/20' :
                        played ? 'bg-gray-900/60' : 'bg-gray-900'
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl no-invert">{getFlag(match.home_team)}</span>
                          <span className="font-bold text-sm truncate max-w-[120px]">{match.home_team}</span>
                        </div>
                        <div className="text-center px-2">
                          {played ? (
                            <span className="bg-gray-800 px-3 py-1 rounded-lg font-bold text-white text-sm">
                              {match.home_score} - {match.away_score}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">vs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-bold text-sm truncate max-w-[120px]">{match.away_team}</span>
                          <span className="text-2xl no-invert">{getFlag(match.away_team)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 mb-3">
                        <p className="text-gray-600 text-xs font-medium">
                          {new Date(match.match_date).toLocaleDateString('es', {
                            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {deadline && !played && !started && (
                          <span className={`text-xs font-bold ${deadline.color}`}><span className="no-invert">⏰</span> {deadline.label}</span>
                        )}
                      </div>

                      {pred && (
                        <p className="text-sm text-yellow-400 mb-2 text-center">
                          Tu pred: {pred.predicted_home} - {pred.predicted_away}
                          {pred.points !== null && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                              pred.points === 3 ? 'bg-green-700 text-green-200' :
                              pred.points === 1 ? 'bg-blue-700 text-blue-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>{pred.points} pts</span>
                          )}
                        </p>
                      )}

                      {!played && !started && (
                        <div className="flex gap-2 items-center justify-center">
                          <input type="number" min="0" max="20" placeholder="0"
                            className="w-14 bg-gray-800 text-center rounded-lg px-2 py-1.5 text-sm font-bold border border-gray-700 focus:border-yellow-400 outline-none"
                            value={inputs[match.id]?.home || ''}
                            onChange={e => setInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))} />
                          <span className="text-gray-500 font-bold">-</span>
                          <input type="number" min="0" max="20" placeholder="0"
                            className="w-14 bg-gray-800 text-center rounded-lg px-2 py-1.5 text-sm font-bold border border-gray-700 focus:border-yellow-400 outline-none"
                            value={inputs[match.id]?.away || ''}
                            onChange={e => setInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))} />
                          <button onClick={() => handlePredict(match.id)}
                            className="bg-yellow-400 text-gray-950 font-bold px-4 py-1.5 rounded-lg hover:bg-yellow-300 text-sm transition">
                            {pred ? 'Actualizar' : 'Predecir'}
                          </button>
                        </div>
                      )}
                      {started && !played && (
                        <p className="text-orange-400/70 text-xs text-center mt-1 font-medium">En curso</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {showThirds && (
        <BestThirdsModal thirds={thirds} onClose={() => setShowThirds(false)} />
      )}
    </div>
  )
}
