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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Ranking Global</h1>
        {loading ? <Spinner /> : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-400 font-bold">Sin jugadores todavía</p>
            <p className="text-gray-600 text-sm">Sé el primero en hacer una predicción</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            {leaderboard.map((entry, i) => (
              <div key={entry.username}
                className={`flex items-center gap-4 px-6 py-4 border-b border-gray-800 last:border-0
                  ${entry.username === user?.username ? 'bg-yellow-400/10' : ''}`}
              >
                <span className={`text-2xl font-bold w-8 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span className="flex-1 font-bold">
                  {entry.username}
                  {entry.username === user?.username && (
                    <span className="text-yellow-400 text-xs ml-2">tú</span>
                  )}
                </span>
                <span className="text-gray-400 text-sm hidden sm:block">{entry.total_predictions} pred.</span>
                <span className="text-yellow-400 font-bold text-lg">{entry.total_points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
