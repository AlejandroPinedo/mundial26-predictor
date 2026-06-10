import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import Icon from '../components/Icon'
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
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 font-sans text-white">

      {/* Hero: tarjeta de jugador */}
      <div className="relative overflow-hidden bg-panel border border-white/8 rounded-2xl fade-up mb-6">
        <div className="tri-stripe" />
        <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
        <div className="relative z-10 p-6 flex flex-col sm:flex-row sm:items-center gap-5">

          {/* Avatar con anillo tricolor */}
          <div className="relative flex-shrink-0 self-start sm:self-auto">
            <div className="w-21 h-21 md:w-24 md:h-24 rounded-full p-[3px] bg-gradient-to-br from-ca via-gold to-us">
              <div className="w-full h-full rounded-full bg-ink-950 flex items-center justify-center">
                <span className="font-display text-3xl md:text-4xl text-gold uppercase leading-none">
                  {user?.username[0].toUpperCase()}
                </span>
              </div>
            </div>
            {rank && Number(rank) <= 3 && (
              <span className="absolute -top-1 -right-1 text-xl no-invert" aria-label={`Top ${rank}`}>
                {rank === '1' ? '🥇' : rank === '2' ? '🥈' : '🥉'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="chip text-mx border-mx/30 bg-mx/10 mb-2">
              <Icon name="user" size={11} /> Jugador FIFA WC26
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-none uppercase tracking-tight truncate">
              {user?.username}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 truncate">{user?.email}</p>
            {rank && totalPlayers && (
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-500">Posición</span>
                <span className="font-display text-3xl text-gold leading-none">#{rank}</span>
                <span className="text-gray-500 text-xs">de {totalPlayers} jugadores</span>
              </div>
            )}
          </div>

          <Link to={`/compare/${user?.username}`} className="btn-ghost text-xs flex-shrink-0 self-start sm:self-center">
            <span className="no-invert">⚔️</span> Comparar
          </Link>
        </div>
      </div>

      {/* Stats del jugador */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-up-1">
          {[
            { label: 'Puntos', value: stats.total_points, icon: 'trophy' as const, color: 'text-gold', chip: 'text-gold border-gold/25 bg-gold/10' },
            { label: 'Predicciones', value: stats.total_predictions, icon: 'target' as const, color: 'text-white', chip: 'text-gray-400 border-white/10 bg-white/5' },
            { label: 'Exactos', value: stats.exact_scores, icon: 'check' as const, color: 'text-mx', chip: 'text-mx border-mx/25 bg-mx/10' },
            { label: 'Aciertos', value: `${accuracy}%`, icon: 'chart' as const, color: 'text-us', chip: 'text-us border-us/25 bg-us/10' },
          ].map(({ label, value, icon, color, chip }) => (
            <div key={label} className="bg-panel border border-white/8 rounded-2xl p-4 text-center hover-lift">
              <div className={`font-display text-4xl leading-none ${color}`}>{value}</div>
              <span className={`chip mt-3 ${chip}`}>
                <Icon name={icon} size={11} /> {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cambiar contraseña */}
      <div className="glass rounded-2xl p-6 fade-up-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold flex-shrink-0">
            <Icon name="lock" size={16} />
          </span>
          <h2 className="font-display text-2xl text-white uppercase tracking-wide leading-none">Cambiar contraseña</h2>
        </div>
        <p className="text-gray-500 text-xs mb-5 mt-2">Tu nueva contraseña debe tener al menos 6 caracteres.</p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          {[
            { ph: 'Contraseña actual', key: 'current' },
            { ph: 'Nueva contraseña (mín. 6)', key: 'next' },
            { ph: 'Confirmar nueva contraseña', key: 'confirm' },
          ].map(({ ph, key }) => (
            <input key={key} type="password" placeholder={ph}
              className="bg-white/[0.04] border border-white/10 focus:border-gold/40 text-white placeholder:text-gray-600 px-4 py-2.5 rounded-xl text-sm outline-none transition"
              value={pwForm[key as keyof typeof pwForm]}
              onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })} />
          ))}
          <button type="submit" disabled={changingPw} className="btn-gold text-sm mt-1">
            {changingPw ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
