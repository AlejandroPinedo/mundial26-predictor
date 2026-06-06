import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { getFlag } from '../utils/flags'

const KICKOFF = new Date('2026-06-11T19:00:00Z')

function useCountdown() {
  const [t, setT] = useState(KICKOFF.getTime() - Date.now())
  useEffect(() => {
    const i = setInterval(() => setT(KICKOFF.getTime() - Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  return {
    days: Math.max(0, Math.floor(t / 86400000)),
    hours: Math.max(0, Math.floor((t % 86400000) / 3600000)),
    minutes: Math.max(0, Math.floor((t % 3600000) / 60000)),
    seconds: Math.max(0, Math.floor((t % 60000) / 1000)),
    started: t <= 0,
  }
}

type Match = { id: string; home_team: string; away_team: string; match_date: string; home_score: null | number; group_name: string }
type Entry = { username: string; total_points: string }
type Stats = { total_predictions: string; total_points: string }

export default function HomePage() {
  const { user } = useAuth()
  const { days, hours, minutes, seconds, started } = useCountdown()
  const [nextMatches, setNextMatches] = useState<Match[]>([])
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/leaderboard'),
      apiFetch('/predictions/stats'),
    ]).then(([m, l, s]) => {
      const now = new Date()
      const upcoming = m.matches
        .filter((x: Match) => x.home_score === null && now < new Date(x.match_date))
        .slice(0, 3)
      setNextMatches(upcoming)
      setLeaderboard(l.leaderboard.slice(0, 5))
      setStats(s.stats)
    }).finally(() => setLoading(false))
  }, [])

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-6 md:p-10 mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-600/5 rounded-full translate-y-8 -translate-x-8 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1 text-yellow-400 text-xs font-bold mb-4 uppercase tracking-wider">
              🏆 USA · CANADA · MÉXICO 2026
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">
              Bienvenido, <span className="text-yellow-400">{user?.username}</span> 👋
            </h1>
            <p className="text-gray-400 mb-6 max-w-lg">
              Predice los marcadores, compite con amigos y demuestra que la tienes clara.
            </p>

            {!started ? (
              <div className="flex gap-3 mb-6">
                {[{ v: days, l: 'días' }, { v: hours, l: 'hrs' }, { v: minutes, l: 'min' }, { v: seconds, l: 'seg' }].map(({ v, l }) => (
                  <div key={l} className="bg-gray-950/60 border border-gray-800 rounded-2xl px-4 py-3 text-center min-w-[56px]">
                    <div className="text-2xl font-black text-yellow-400 tabular-nums">{String(v).padStart(2, '0')}</div>
                    <div className="text-gray-600 text-xs">{l}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-2 mb-6">
                <span className="text-yellow-400 font-bold">🏆 ¡El torneo ya comenzó!</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link to="/matches" className="bg-yellow-400 text-gray-950 font-black px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20 text-sm">
                Ver partidos →
              </Link>
              <Link to="/bracket" className="border border-gray-700 text-gray-300 font-bold px-5 py-2.5 rounded-xl hover:border-gray-500 hover:text-white transition text-sm">
                Mi bracket
              </Link>
            </div>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: '🌍', value: '48', label: 'Equipos', to: '/teams' },
            { icon: '🔠', value: '12', label: 'Grupos', to: '/matches' },
            { icon: '⚽', value: '104', label: 'Partidos', to: '/matches' },
            { icon: '🏟️', value: '16', label: 'Sedes', to: '/rules' },
          ].map(stat => (
            <Link key={stat.label} to={stat.to}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Mi progreso */}
          {stats && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-wider">Tu rendimiento</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: stats.total_points, l: 'Puntos', c: 'text-yellow-400' },
                  { v: stats.total_predictions, l: 'Predicciones', c: 'text-white' },
                  { v: myRank > 0 ? `#${myRank}` : '--', l: 'Posición', c: 'text-blue-400' },
                  { v: `${leaderboard.length}`, l: 'Jugadores', c: 'text-gray-300' },
                ].map(({ v, l, c }) => (
                  <div key={l} className="bg-gray-950 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-black ${c}`}>{v}</div>
                    <div className="text-gray-600 text-xs">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 5 ranking */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Top ranking</h2>
              <Link to="/leaderboard" className="text-yellow-400 text-xs hover:underline">Ver todo →</Link>
            </div>
            {loading ? <Spinner /> : (
              <div className="flex flex-col gap-2">
                {leaderboard.map((e, i) => (
                  <div key={e.username}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${e.username === user?.username ? 'bg-yellow-400/10' : ''}`}>
                    <span className="text-sm w-5">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-600">{i + 1}</span>}</span>
                    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-black">
                      {e.username[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">
                      {e.username}
                      {e.username === user?.username && <span className="text-yellow-400 text-xs ml-1">tú</span>}
                    </span>
                    <span className="text-yellow-400 font-bold text-sm">{e.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Próximos partidos */}
        {nextMatches.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Próximos partidos</h2>
              <Link to="/matches" className="text-yellow-400 text-xs hover:underline">Ver todos →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {nextMatches.map(m => (
                <Link key={m.id} to="/matches"
                  className="bg-gray-950 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-center flex-1">
                      <div className="text-xl">{getFlag(m.home_team)}</div>
                      <div className="text-xs font-bold truncate">{m.home_team}</div>
                    </div>
                    <div className="text-gray-600 text-xs px-2">vs</div>
                    <div className="text-center flex-1">
                      <div className="text-xl">{getFlag(m.away_team)}</div>
                      <div className="text-xs font-bold truncate">{m.away_team}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-600 text-xs">
                      {new Date(m.match_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="ml-2 text-yellow-400/70 text-xs">Grupo {m.group_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
