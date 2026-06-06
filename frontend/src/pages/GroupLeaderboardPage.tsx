import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'

type Entry = {
  username: string
  total_predictions: string
  total_points: string
}

type Group = {
  id: string
  name: string
  invite_code: string
}

export default function GroupLeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/groups/${id}/leaderboard`)
      .then(d => { setGroup(d.group); setLeaderboard(d.leaderboard) })
      .finally(() => setLoading(false))
  }, [id])

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="max-w-5xl mx-auto p-6">
        {loading ? <Spinner /> : group && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">{group.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-500 text-sm">
                  Código: <span className="text-yellow-400 font-mono font-bold">{group.invite_code}</span>
                </p>
                {myRank > 0 && (
                  <p className="text-gray-500 text-sm">
                    Tu posición: <span className="text-white font-bold">#{myRank}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl overflow-hidden">
              {leaderboard.map((entry, i) => (
                <div key={entry.username}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-gray-800 last:border-0
                    ${entry.username === user?.username ? 'bg-yellow-400/10' : ''}`}>
                  <span className="text-2xl font-bold w-8">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-600">{i + 1}</span>}
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
          </>
        )}
      </div>
    </div>
  )
}
