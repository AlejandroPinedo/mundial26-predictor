import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Skeleton from '../components/Skeleton'
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
  const [lastResultCount, setLastResultCount] = useState<number | null>(null)

  useEffect(() => {
    const load = (silent = false) => Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/leaderboard'),
      apiFetch('/predictions/stats'),
    ]).then(([m, l, s]) => {
      const now = new Date()
      const upcoming = m.matches
        .filter((x: Match) => x.home_score === null && now < new Date(x.match_date))
        .slice(0, 3)
      const playedCount = m.matches.filter((x: Match) => x.home_score !== null).length
      if (silent && lastResultCount !== null && playedCount > lastResultCount) {
        toast('⚽ Nuevo resultado cargado — ¡revisa tus puntos!', { icon: '🎯' })
      }
      setLastResultCount(playedCount)
      setNextMatches(upcoming)
      setLeaderboard(l.leaderboard.slice(0, 5))
      setStats(s.stats)
    }).finally(() => setLoading(false))

    load()
    const interval = setInterval(() => load(true), 30_000)
    return () => clearInterval(interval)
  }, [])

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1
  // Remove unused Spinner import - using Skeleton instead

  return (
    <div className="min-h-screen bg-[#020817] text-white font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8">

        {/* Hero — Stadium scoreboard style */}
        <div className="relative overflow-hidden rounded-2xl mb-6 select-none"
          style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #07090f 100%)', border: '1px solid rgba(250,204,21,0.12)' }}>
          {/* Top gold stripe */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #facc15, #f97316, #facc15)' }} />
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(250,204,21,0.06) 0%, transparent 70%)' }} />

          <div className="relative p-6 md:p-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 live-dot" />
              <span className="text-green-400 text-[10px] font-bold uppercase tracking-[0.2em]">En curso · FIFA World Cup 2026</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl text-white leading-none uppercase">{user?.username}</h1>
            <p className="text-gray-500 text-sm mb-6">Tu zona de predicciones del Mundial 2026</p>

            {started ? (
              <div className="flex items-center gap-3 mb-6 px-4 py-2.5 rounded-xl w-fit"
                style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)' }}>
                <span className="w-2 h-2 rounded-full bg-yellow-400 live-dot" />
                <span className="text-yellow-400 font-bold text-sm uppercase tracking-wider">🏆 Torneo en curso</span>
              </div>
            ) : (
              <div className="flex gap-3 mb-6">
                {[{ v: days, l: 'días' }, { v: hours, l: 'hrs' }, { v: minutes, l: 'min' }, { v: seconds, l: 'seg' }].map(({ v, l }) => (
                  <div key={l} className="scoreboard scanlines px-4 py-3 rounded-xl text-center min-w-[60px] relative">
                    <div className="text-2xl tabular-nums leading-none">{String(v).padStart(2, '0')}</div>
                    <div className="text-yellow-400/50 text-[9px] uppercase tracking-widest mt-1 font-sans">{l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link to="/matches" className="font-display text-lg px-6 py-2.5 rounded-xl tracking-wider transition-all cursor-pointer"
                style={{ background: '#facc15', color: '#030712' }}>
                VER PARTIDOS →
              </Link>
              <Link to="/bracket" className="font-display text-lg px-6 py-2.5 rounded-xl tracking-wider transition-all cursor-pointer text-gray-300 hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                MI BRACKET
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://mundial26-predictor.vercel.app')
                  toast.success('Link copiado — ¡compártelo!')
                }}
                className="border border-gray-800 text-gray-400 font-bold px-6 py-3 rounded-2xl hover:border-yellow-400/30 hover:text-yellow-400 transition-all bg-gray-900/30 text-sm cursor-pointer flex items-center gap-2">
                🔗 Invitar amigos
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats — scoreboard style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { value: '48', label: 'Equipos', to: '/teams', color: 'text-yellow-400' },
            { value: '12', label: 'Grupos', to: '/matches', color: 'text-green-400' },
            { value: '104', label: 'Partidos', to: '/matches', color: 'text-blue-400' },
            { value: '16', label: 'Estadios', to: '/stadiums', color: 'text-orange-400' },
          ].map(stat => (
            <Link key={stat.label} to={stat.to}
              className="ticket-card rounded-xl p-4 text-center hover:-translate-y-0.5 transition-all">
              <div className={`font-display text-5xl leading-none ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-600 text-[10px] uppercase tracking-widest mt-1">{stat.label}</div>
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
          <div className="ticket-card rounded-2xl overflow-hidden p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-barlow font-black text-base text-yellow-400/90 uppercase tracking-wider flex items-center gap-2">
                  🏆 Top Global
                </h2>
                <Link to="/leaderboard" className="text-yellow-400 text-xs font-bold hover:underline">Ver todo →</Link>
              </div>
              {loading ? (
                <div className="py-2"><Skeleton rows={5} /></div>
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
                      <span className="font-display text-lg text-yellow-400">{e.total_points} pts</span>
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
                  className="ticket-card rounded-xl p-4 flex-shrink-0 hover-lift flex flex-col justify-between"
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
