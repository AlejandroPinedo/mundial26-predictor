import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

type Stats = {
  total_predictions: string
  total_points: string
  exact_scores: string
  correct_results: string
  played: string                                                                                                    
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    apiFetch('/predictions/stats').then(d => setStats(d.stats))
  }, [])

  const accuracy = stats && Number(stats.played) > 0
    ? Math.round((Number(stats.correct_results) / Number(stats.played)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">                                                           
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-gray-950 text-2xl font-black">
            {user?.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { label: 'Puntos totales', value: stats.total_points, color: 'text-yellow-400' },
              { label: 'Predicciones', value: stats.total_predictions, color: 'text-white' },
              { label: 'Marcadores exactos', value: stats.exact_scores, color: 'text-green-400' },
              { label: 'Aciertos %', value: `${accuracy}%`, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-5 text-center">
                <div className={`text-4xl font-black mb-1 ${color}`}>{value}</div>
                <div className="text-gray-500 text-sm">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}