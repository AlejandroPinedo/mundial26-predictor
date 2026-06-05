import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'
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

  useEffect(() => {
    apiFetch(`/groups/${id}/leaderboard`).then(d => {
      setGroup(d.group)
      setLeaderboard(d.leaderboard)
    })
  }, [id])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        {group && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-yellow-400">{group.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Código de invitación: <span className="text-yellow-400 font-mono font-bold">{group.invite_code}</span>
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl overflow-hidden">
              {leaderboard.map((entry, i) => (
                <div key={entry.username}
                  className={`flex items-center gap-4 px-6 py-4 border-b border-gray-800 last:border-0
                    ${entry.username === user?.username ? 'bg-yellow-400/10' : ''}`}>
                  <span className="text-2xl font-bold text-gray-600 w-8">{i + 1}</span>
                  <span className="flex-1 font-bold">
                    {entry.username}
                    {entry.username === user?.username && (
                      <span className="text-yellow-400 text-xs ml-2">tú</span>
                    )}
                  </span>
                  <span className="text-gray-400 text-sm">{entry.total_predictions} predicciones</span>
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
