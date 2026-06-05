import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'

type Entry = {
  username: string
  total_predictions: string
  total_points: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => apiFetch('/predictions/leaderboard').then(d => setLeaderboard(d.leaderboard))
    load().finally(() => setLoading(false))
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1
  const myEntry = leaderboard.find(e => e.username === user?.username)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">Ranking Global</h1>
          <p className="text-gray-600 text-xs">Se actualiza cada 30s</p>
        </div>

        {myEntry && myRank > 3 && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl px-5 py-3 mb-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Tu posición</span>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">#{myRank}</span>
              <span className="text-yellow-400 font-bold">{myEntry.total_points} pts</span>
            </div>
          </div>
        )}

        {loading ? <Spinner /> : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-400 font-bold">Sin jugadores todavía</p>
            <p className="text-gray-600 text-sm">Sé el primero en hacer una predicción</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.username}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition ${
                  i === 0 ? 'bg-yellow-400/10 border border-yellow-400/20' :
                  i === 1 ? 'bg-gray-400/5 border border-gray-700' :
                  i === 2 ? 'bg-amber-900/10 border border-amber-800/30' :
                  entry.username === user?.username ? 'bg-yellow-400/5 border border-yellow-400/10' :
                  'bg-gray-900'
                }`}>
                <span className="text-xl w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-600 font-bold text-sm">{i + 1}</span>}
                </span>
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center font-black text-sm text-gray-300">
                  {entry.username[0].toUpperCase()}
                </div>
                <span className="flex-1 font-bold">
                  {entry.username}
                  {entry.username === user?.username && (
                    <span className="text-yellow-400 text-xs ml-2 font-normal">tú</span>
                  )}
                </span>
                <span className="text-gray-600 text-sm hidden sm:block">{entry.total_predictions} pred.</span>
                <span className={`font-black text-lg ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-500' : 'text-white'}`}>
                  {entry.total_points}
                  <span className="text-gray-600 font-normal text-xs ml-1">pts</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
