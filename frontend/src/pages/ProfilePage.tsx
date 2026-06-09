import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
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
  const [rank, setRank] = useState<string | null>(null)
  const [totalPlayers, setTotalPlayers] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    apiFetch('/predictions/stats')
      .then(d => { setStats(d.stats); setRank(d.rank); setTotalPlayers(d.totalPlayers) })
      .finally(() => setLoading(false))
  }, [])

  const accuracy = stats && Number(stats.played) > 0
    ? Math.round((Number(stats.correct_results) / Number(stats.played)) * 100)
    : 0

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (pwForm.next.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    setChangingPw(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      })
      toast.success('Contraseña actualizada')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-gray-950 text-3xl font-barlow font-black">
            {user?.username[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">{user?.username}</h1>
            <p className="text-gray-400">{user?.email}</p>
            {rank && totalPlayers && (
              <p className="text-yellow-400 text-sm font-bold mt-1">
                #{rank} de {totalPlayers} jugadores
              </p>
            )}
          </div>
          <Link to={`/compare/${user?.username}`}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition">
            ⚔️ Comparar
          </Link>
        </div>

        {loading ? <Spinner /> : stats && (
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

        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="font-bold mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <input type="password" placeholder="Contraseña actual"
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
              value={pwForm.current}
              onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
            <input type="password" placeholder="Nueva contraseña (mín. 6 caracteres)"
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
              value={pwForm.next}
              onChange={e => setPwForm({ ...pwForm, next: e.target.value })} />
            <input type="password" placeholder="Confirmar nueva contraseña"
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
              value={pwForm.confirm}
              onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
            <button type="submit" disabled={changingPw}
              className="bg-gray-700 text-white font-bold py-2 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50">
              {changingPw ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
