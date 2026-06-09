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
    if (pwForm.next !== pwForm.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (pwForm.next.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setChangingPw(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      })
      toast.success('Contraseña actualizada')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally { setChangingPw(false) }
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">

        {/* Player card header */}
        <div className="wc-page-header fade-up mb-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-gray-950 text-4xl font-display"
                style={{ background: 'linear-gradient(135deg, #facc15, #f59e0b)' }}>
                {user?.username[0].toUpperCase()}
              </div>
              {rank && Number(rank) <= 3 && (
                <div className="absolute -top-2 -right-2 text-xl">
                  {rank === '1' ? '🥇' : rank === '2' ? '🥈' : '🥉'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-green-400/70 font-bold uppercase tracking-[0.2em] mb-1">Jugador FIFA WC26</p>
              <h1 className="font-display text-5xl text-white leading-none uppercase">{user?.username}</h1>
              <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
              {rank && totalPlayers && (
                <p className="text-yellow-400 text-sm font-bold mt-1">
                  Posición <span className="text-2xl font-display">#{rank}</span>
                  <span className="text-gray-500 font-normal ml-1">de {totalPlayers} jugadores</span>
                </p>
              )}
            </div>
            <Link to={`/compare/${user?.username}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:-translate-y-0.5 flex-shrink-0"
              style={{ border: '1px solid rgba(250,204,21,0.2)', background: 'rgba(250,204,21,0.06)', color: '#facc15' }}>
              ⚔️ Comparar
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? <Spinner /> : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-up-1">
            {[
              { label: 'Puntos', value: stats.total_points, icon: '🏆', color: 'text-yellow-400' },
              { label: 'Predicciones', value: stats.total_predictions, icon: '🎯', color: 'text-white' },
              { label: 'Exactos', value: stats.exact_scores, icon: '✅', color: 'text-green-400' },
              { label: 'Aciertos', value: `${accuracy}%`, icon: '📊', color: 'text-blue-400' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="ticket-card rounded-xl p-4 text-center">
                <div className="text-2xl no-invert mb-1">{icon}</div>
                <div className={`font-display text-4xl leading-none ${color}`}>{value}</div>
                <div className="text-gray-600 text-[10px] uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Change password */}
        <div className="ticket-card rounded-2xl p-6 fade-up-2">
          <h2 className="font-display text-2xl text-white mb-4 uppercase tracking-wide">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            {[
              { ph: 'Contraseña actual', key: 'current' },
              { ph: 'Nueva contraseña (mín. 6)', key: 'next' },
              { ph: 'Confirmar nueva contraseña', key: 'confirm' },
            ].map(({ ph, key }) => (
              <input key={key} type="password" placeholder={ph}
                className="bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition"
                value={pwForm[key as keyof typeof pwForm]}
                onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })} />
            ))}
            <button type="submit" disabled={changingPw}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50">
              {changingPw ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
