import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import { getPointsBadge } from '../utils/points'
import { useAuth } from '../context/AuthContext'

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
  const { user } = useAuth()
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans">
        
        {/* Back navigation */}
        <Link
          to="/groups"
          className="text-yellow-400 text-sm hover:underline mb-6 inline-block font-semibold"
          id="back-to-groups-compare-btn"
        >
          ← Volver a Grupos
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-barlow font-black uppercase tracking-wide text-yellow-400 flex items-center gap-3">
                🤜🤛 Frente a Frente
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Comparando tus predicciones con las de <span className="text-white font-bold">{username}</span>
              </p>
            </div>

            {/* Direct Comparison Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              
              {/* My Score Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px] tracking-wider block">Tus Puntos (Comparados)</span>
                  <span className="text-yellow-400 font-black text-3xl font-barlow">{myTotalComparedPoints} pts</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Acumulado en partidos disputados</p>
              </div>

              {/* Other Score Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px] tracking-wider block">Puntos de {username}</span>
                  <span className="text-rose-500 font-black text-3xl font-barlow">{otherTotalComparedPoints} pts</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Acumulado en partidos disputados</p>
              </div>

              {/* Direct Wins Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px] tracking-wider block">Victorias Directas</span>
                  <span className="text-green-500 font-black text-3xl font-barlow">{myWins}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Partidos donde tuviste mejor marcador</p>
              </div>

              {/* Ratio / Outcome Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                <div>
                  <span className="text-gray-500 uppercase font-bold text-[10px] tracking-wider block">Victorias de {username} / Empates</span>
                  <span className="text-blue-500 font-black text-3xl font-barlow">
                    {otherWins} / <span className="text-gray-400">{ties}</span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Partidos donde {username} fue mejor / empataron</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    filter === code
                      ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                      : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Matches List */}
            {filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={`bg-gray-900 border rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${
                        outcome === 'win'
                          ? 'border-green-500/40 hover:border-green-500/60 shadow-lg shadow-green-500/5'
                          : outcome === 'lose'
                          ? 'border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-500/5'
                          : outcome === 'tie'
                          ? 'border-yellow-400/40 hover:border-yellow-400/60'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {/* Top metadata */}
                      <div className="flex justify-between items-start text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        <div className="flex flex-col gap-0.5">
                          <span>{m.stage}</span>
                          {m.stadiumName && (
                            <span className="text-gray-600 flex items-center gap-1 font-medium select-none normal-case">
                              🏟️ {m.stadiumName}
                            </span>
                          )}
                        </div>
                        <span>
                          {new Date(m.matchDate).toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Main Teams Match Score */}
                      <div className="flex justify-between items-center font-barlow font-black text-lg tracking-wide py-1">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl no-invert">{getFlag(m.homeTeam)}</span>
                          <span className="truncate uppercase">{m.homeTeam}</span>
                        </div>

                        <div className="flex items-center justify-center bg-gray-950/80 px-4 py-1.5 rounded-2xl border border-gray-800 min-w-20 text-center font-sans text-sm">
                          {hasResult ? (
                            <span className="text-white font-bold">
                              {m.homeScore} - {m.awayScore}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs uppercase font-bold tracking-widest">VS</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="truncate uppercase">{m.awayTeam}</span>
                          <span className="text-2xl no-invert">{getFlag(m.awayTeam)}</span>
                        </div>
                      </div>

                      {/* Side-by-side Predictions */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800/60">
                        {/* My Prediction */}
                        <div
                          className={`p-3 rounded-2xl border ${
                            outcome === 'win'
                              ? 'bg-green-500/5 border-green-500/20'
                              : outcome === 'tie'
                              ? 'bg-yellow-400/5 border-yellow-400/10'
                              : 'bg-gray-950/40 border-gray-800/80'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Tu Predicción</span>
                          {m.myPred ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-yellow-400 font-barlow">
                                {m.myPred.home} - {m.myPred.away}
                              </span>
                              {hasResult && (
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block self-start ${
                                    myPts === 3
                                      ? 'bg-green-700/20 text-green-400 border border-green-700/40'
                                      : myPts === 1
                                      ? 'bg-blue-700/20 text-blue-400 border border-blue-700/40'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                                  }`}
                                >
                                  {myPts} pts — {getPointsBadge(myPts ?? 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600 font-bold italic">Sin pred. ⚠️</span>
                          )}
                        </div>

                        {/* Other User Prediction */}
                        <div
                          className={`p-3 rounded-2xl border ${
                            outcome === 'lose'
                              ? 'bg-rose-500/5 border-rose-500/20'
                              : outcome === 'tie'
                              ? 'bg-yellow-400/5 border-yellow-400/10'
                              : 'bg-gray-950/40 border-gray-800/80'
                          }`}
                        >
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                            Pred. de {username}
                          </span>
                          {m.otherPred ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-rose-400 font-barlow">
                                {m.otherPred.home} - {m.otherPred.away}
                              </span>
                              {hasResult && (
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block self-start ${
                                    otherPts === 3
                                      ? 'bg-green-700/20 text-green-400 border border-green-700/40'
                                      : otherPts === 1
                                      ? 'bg-blue-700/20 text-blue-400 border border-blue-700/40'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                                  }`}
                                >
                                  {otherPts} pts — {getPointsBadge(otherPts ?? 0)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600 font-bold italic">Sin pred. ⚠️</span>
                          )}
                        </div>
                      </div>

                      {/* Direct winner badge overlay */}
                      {hasResult && (
                        <div className="absolute right-4 top-4">
                          {outcome === 'win' && (
                            <span className="text-xs font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-full">
                              ¡Ganaste! 🏆
                            </span>
                          )}
                          {outcome === 'lose' && (
                            <span className="text-xs font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full">
                              Perdiste ❌
                            </span>
                          )}
                          {outcome === 'tie' && (
                            <span className="text-xs font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 px-2 py-0.5 rounded-full">
                              Empate 🤝
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-3xl">
                <span className="text-5xl block mb-3 no-invert">🥅</span>
                <h3 className="text-lg font-bold text-white mb-1">No hay partidos en esta categoría</h3>
                <p className="text-gray-400 text-sm">Prueba seleccionando una pestaña de filtro diferente.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
