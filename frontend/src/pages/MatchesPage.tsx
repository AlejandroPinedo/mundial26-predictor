import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'

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
    if (!input?.home || !input?.away) {
      toast.error('Ingresa ambos marcadores')
      return
    }
    try {
      await apiFetch('/predictions', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          predictedHome: Number(input.home),
          predictedAway: Number(input.away),
        }),
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

  const groups = [...new Set(matches.map(m => m.group_name))].sort()
  const groupMatches = matches.filter(m => m.group_name === activeGroup)
  const nextMatch = matches.find(m => m.home_score === null && new Date() < new Date(m.match_date))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">Partidos</h1>

        {nextMatch && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">Próximo partido</p>
            <div className="flex justify-between items-center">
              <span className="font-bold">{nextMatch.home_team}</span>
              <div className="text-center">
                <p className="text-gray-400 text-xs">
                  {new Date(nextMatch.match_date).toLocaleDateString('es', {
                    weekday: 'long', day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <p className="text-gray-600 text-xs">Grupo {nextMatch.group_name}</p>
              </div>
              <span className="font-bold">{nextMatch.away_team}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {groups.map(g => (
            <button key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition flex-shrink-0 ${
                activeGroup === g
                  ? 'bg-yellow-400 text-gray-950'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>
              Grupo {g}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <div className="flex flex-col gap-4">
            {groupMatches.map(match => {
              const pred = predictions[match.id]
              const played = match.home_score !== null
              const started = new Date() > new Date(match.match_date)
              const isNext = nextMatch?.id === match.id

              return (
                <div key={match.id}
                  className={`rounded-xl p-4 ${isNext ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-gray-900'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">{match.home_team}</span>
                    <span className={`text-sm px-2 ${played ? 'text-white font-bold' : 'text-gray-500'}`}>
                      {played ? `${match.home_score} - ${match.away_score}` : 'vs'}
                    </span>
                    <span className="font-bold text-sm">{match.away_team}</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-3 text-center">
                    {new Date(match.match_date).toLocaleDateString('es', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {pred && (
                    <p className="text-sm text-yellow-400 mb-2 text-center">
                      Tu predicción: {pred.predicted_home} - {pred.predicted_away}
                      {pred.points !== null && ` · ${pred.points} pts`}
                    </p>
                  )}
                  {!played && !started && (
                    <div className="flex gap-2 items-center justify-center">
                      <input type="number" min="0" max="20" placeholder="0"
                        className="w-14 bg-gray-800 text-center rounded px-2 py-1 text-sm"
                        value={inputs[match.id]?.home || ''}
                        onChange={e => setInputs(prev => ({
                          ...prev, [match.id]: { ...prev[match.id], home: e.target.value }
                        }))} />
                      <span className="text-gray-500">-</span>
                      <input type="number" min="0" max="20" placeholder="0"
                        className="w-14 bg-gray-800 text-center rounded px-2 py-1 text-sm"
                        value={inputs[match.id]?.away || ''}
                        onChange={e => setInputs(prev => ({
                          ...prev, [match.id]: { ...prev[match.id], away: e.target.value }
                        }))} />
                      <button onClick={() => handlePredict(match.id)}
                        className="bg-yellow-400 text-gray-950 font-bold px-4 py-1 rounded hover:bg-yellow-300 text-sm">
                        Predecir
                      </button>
                    </div>
                  )}
                  {started && !played && (
                    <p className="text-gray-600 text-xs text-center mt-1">Partido en curso</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
