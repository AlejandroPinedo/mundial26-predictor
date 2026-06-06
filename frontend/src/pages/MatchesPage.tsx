import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'

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

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [activeGroup, setActiveGroup] = useState<string>('A')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my'),
    ]).then(([matchData, predData]) => {
      setMatches(matchData.matches)
      const map: Record<string, Prediction> = {}
      for (const p of predData.predictions) map[p.match_id] = p
      setPredictions(map)
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
    const toPredicit = pending.filter(m => inputs[m.id]?.home && inputs[m.id]?.away)
    if (toPredicit.length === 0) { toast.error('Completa al menos un marcador'); return }
    try {
      await Promise.all(toPredicit.map(m =>
        apiFetch('/predictions', {
          method: 'POST',
          body: JSON.stringify({ matchId: m.id, predictedHome: Number(inputs[m.id].home), predictedAway: Number(inputs[m.id].away) }),
        })
      ))
      toast.success(`${toPredicit.length} predicciones guardadas`)
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
  // unpredicted count is handled by AppShell globally

  function getDeadlineWarning(match_date: string) {
    const diff = new Date(match_date).getTime() - now.getTime()
    const hours = diff / (1000 * 60 * 60)
    if (hours < 0) return null
    if (hours < 3) return { label: `${Math.floor(diff / 60000)} min`, color: 'text-red-400' }
    if (hours < 24) return { label: `${Math.floor(hours)}h`, color: 'text-orange-400' }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">

        {nextMatch && (
          <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-2xl p-5 mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3">⚡ Próximo partido</p>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-2xl mb-1">{getFlag(nextMatch.home_team)}</p>
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
                <p className="text-2xl mb-1">{getFlag(nextMatch.away_team)}</p>
                <p className="font-bold text-sm">{nextMatch.away_team}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto py-2 mb-4 scrollbar-hide">
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
          <>
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
                        <span className="text-2xl">{getFlag(match.home_team)}</span>
                        <span className="font-bold text-sm">{match.home_team}</span>
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
                        <span className="font-bold text-sm">{match.away_team}</span>
                        <span className="text-2xl">{getFlag(match.away_team)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-3">
                      <p className="text-gray-600 text-xs">
                        {new Date(match.match_date).toLocaleDateString('es', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {deadline && !played && !started && (
                        <span className={`text-xs font-bold ${deadline.color}`}>⏰ {deadline.label}</span>
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
                          className="w-14 bg-gray-800 text-center rounded-lg px-2 py-1.5 text-sm font-bold"
                          value={inputs[match.id]?.home || ''}
                          onChange={e => setInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))} />
                        <span className="text-gray-500 font-bold">-</span>
                        <input type="number" min="0" max="20" placeholder="0"
                          className="w-14 bg-gray-800 text-center rounded-lg px-2 py-1.5 text-sm font-bold"
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
          </>
        )}
      </div>
    </div>
  )
}
