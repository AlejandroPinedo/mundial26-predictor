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
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900/60 to-gray-950/80 border border-gray-800/80 p-6 md:p-10 mb-6 backdrop-blur-md shadow-xl select-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/5 rounded-full -translate-y-20 translate-x-20 blur-[90px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600/5 rounded-full translate-y-20 -translate-x-20 blur-[80px] pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1 text-yellow-400 text-xs font-black mb-4 uppercase tracking-wider">
              <span className="no-invert">🏆</span> USA · CANADA · MÉXICO 2026
            </div>
            <h1 className="text-3xl md:text-5xl font-barlow font-black uppercase tracking-wide mb-2">
               Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">{user?.username}</span> <span className="no-invert">👋</span>
            </h1>
            <p className="text-gray-400 mb-6 max-w-lg text-sm md:text-base leading-relaxed">
              Predice los marcadores oficiales, compite con tus amigos y demuestra que tienes el control del fixture mundialista.
            </p>

            {!started ? (
              <div className="flex gap-3 mb-6">
                {[
                  { v: days, l: 'días' },
                  { v: hours, l: 'hrs' },
                  { v: minutes, l: 'min' },
                  { v: seconds, l: 'seg' }
                ].map(({ v, l }) => (
                  <div key={l} className="bg-gray-950/70 border border-gray-800/60 rounded-2xl px-4 py-3 text-center min-w-[60px] shadow-md">
                    <div className="text-2xl font-barlow font-black text-yellow-400 tabular-nums leading-none">{String(v).padStart(2, '0')}</div>
                    <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mt-1">{l}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-4 py-2 mb-6">
                <span className="text-yellow-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <span className="no-invert">🏆</span> ¡El torneo ya comenzó!
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link to="/matches" className="bg-yellow-400 text-gray-950 font-black px-6 py-3 rounded-2xl hover:bg-yellow-300 transition-all shadow-lg hover:shadow-yellow-400/15 text-sm uppercase tracking-wider font-barlow cursor-pointer">
                Ver partidos →
              </Link>
              <Link to="/bracket" className="border border-gray-800 text-gray-300 font-bold px-6 py-3 rounded-2xl hover:border-gray-650 hover:text-white transition-all bg-gray-900/30 backdrop-blur text-sm cursor-pointer">
                Mi bracket
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '🌍', value: '48', label: 'Equipos', to: '/teams' },
            { icon: '🔠', value: '12', label: 'Grupos', to: '/matches' },
            { icon: '⚽', value: '104', label: 'Partidos', to: '/matches' },
            { icon: '🏟️', value: '16', label: 'Sedes', to: '/stadiums' },
          ].map(stat => (
            <Link key={stat.label} to={stat.to}
              className="bg-gray-900/50 border border-gray-800/80 rounded-3xl p-5 premium-glow shadow-md"
              id={`stat-card-${stat.label.toLowerCase()}`}
            >
              <div className="text-2xl mb-2 no-invert">{stat.icon}</div>
              <div className="text-2xl font-barlow font-black text-white leading-none mb-1">{stat.value}</div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* My Progress */}
          {stats && (
            <div className="bg-gray-900/50 border border-gray-800/80 rounded-3xl p-6 shadow-md">
              <h2 className="font-barlow font-black text-base text-yellow-400/90 uppercase tracking-wider mb-5 flex items-center gap-2">
                📈 Tu Rendimiento
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { v: stats.total_points, l: 'Puntos', c: 'text-yellow-400' },
                  { v: stats.total_predictions, l: 'Predicciones', c: 'text-white' },
                  { v: myRank > 0 ? `#${myRank}` : '--', l: 'Posición Global', c: 'text-emerald-400' },
                  { v: `${stats.total_predictions ? stats.total_points : 0}`, l: 'Total Acumulado', c: 'text-gray-400' },
                ].map(({ v, l, c }) => (
                  <div key={l} className="bg-gray-950/40 border border-gray-850/60 rounded-2xl p-4 text-center">
                    <div className={`text-2xl font-barlow font-black leading-none mb-1 ${c}`}>{v}</div>
                    <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 5 ranking */}
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-barlow font-black text-base text-yellow-400/90 uppercase tracking-wider flex items-center gap-2">
                  🏆 Top Global
                </h2>
                <Link to="/leaderboard" className="text-yellow-400 text-xs font-bold hover:underline">Ver todo →</Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leaderboard.map((e, i) => (
                    <div key={e.username}
                      className={`flex items-center gap-3 px-3 py-2 rounded-2xl border border-transparent transition-all ${
                        e.username === user?.username ? 'bg-yellow-400/5 border-yellow-400/10' : ''
                      }`}
                    >
                      <span className="text-sm w-5 text-center font-bold">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-650">{i + 1}</span>}
                      </span>
                      <div className="w-7 h-7 rounded-xl bg-gray-850 border border-gray-800 flex items-center justify-center text-[10px] font-black uppercase text-gray-400">
                        {e.username[0]}
                      </div>
                      <span className="flex-1 text-sm font-bold text-white truncate">
                        {e.username}
                        {e.username === user?.username && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-full ml-1.5">tú</span>
                        )}
                      </span>
                      <span className="text-yellow-400 font-bold text-sm">{e.total_points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming matches */}
        {nextMatches.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800/80 rounded-3xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-barlow font-black text-base text-yellow-400/90 uppercase tracking-wider flex items-center gap-2">
                🔥 Siguientes Partidos
              </h2>
              <Link to="/matches" className="text-yellow-400 text-xs font-bold hover:underline">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextMatches.map(m => (
                <Link key={m.id} to="/matches"
                  className="bg-gray-950/40 border border-gray-850/60 rounded-3xl p-4 premium-glow shadow-sm flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center flex-1 min-w-0">
                      <div className="text-2xl mb-1 no-invert">{getFlag(m.home_team)}</div>
                      <div className="text-xs font-bold truncate text-white uppercase">{m.home_team}</div>
                    </div>
                    <div className="text-gray-600 text-xs px-3 font-semibold select-none">VS</div>
                    <div className="text-center flex-1 min-w-0">
                      <div className="text-2xl mb-1 no-invert">{getFlag(m.away_team)}</div>
                      <div className="text-xs font-bold truncate text-white uppercase">{m.away_team}</div>
                    </div>
                  </div>
                  <div className="text-center border-t border-gray-900/60 pt-3 flex flex-col gap-0.5 select-none">
                    <span className="text-gray-500 text-[10px] font-bold">
                      {new Date(m.match_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-yellow-400/70 text-[9px] font-black uppercase tracking-wider">Grupo {m.group_name}</span>
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
