import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Skeleton from '../components/Skeleton'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { getFlag } from '../utils/flags'
import { LIMA_TZ } from '../utils/dates'

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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

      {/* ── Hero: estado del torneo + cuenta regresiva ─────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-panel border border-white/8 mb-6 fade-up select-none">
        <div className="tri-stripe" />
        <span className="wm-26 -right-4 -bottom-12" aria-hidden="true">26</span>

        <div className="relative z-10 p-6 md:p-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-mx live-dot flex-shrink-0" />
            <span className="text-mx text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em]">
              En curso · FIFA World Cup 2026
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl text-white leading-none uppercase tracking-tight">
            {user?.username}
          </h1>
          <p className="text-gray-500 text-sm mt-2 mb-7 font-sans">Tu zona de predicciones del Mundial 2026</p>

          {started ? (
            <div className="flex items-center gap-3 mb-7 px-4 py-2.5 rounded-xl w-fit bg-gold/10 border border-gold/25">
              <span className="w-2 h-2 rounded-full bg-gold live-dot flex-shrink-0" />
              <span className="text-gold font-condensed font-extrabold text-sm uppercase tracking-wider">
                <span className="no-invert">🏆</span> Torneo en curso
              </span>
            </div>
          ) : (
            <div className="mb-7">
              <p className="text-gray-600 text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em] mb-2">
                Cuenta regresiva al pitazo inicial
              </p>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {[{ v: days, l: 'días' }, { v: hours, l: 'hrs' }, { v: minutes, l: 'min' }, { v: seconds, l: 'seg' }].map(({ v, l }) => (
                  <div key={l} className="scoreboard px-4 py-3 rounded-xl text-center min-w-[64px] border border-gold/15">
                    <div className="text-3xl md:text-4xl tabular-nums leading-none">{String(v).padStart(2, '0')}</div>
                    <div className="text-gold/50 text-[9px] font-condensed font-extrabold uppercase tracking-[0.2em] mt-1.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link to="/matches" className="btn-gold text-sm">
              Ver partidos
              <Icon name="chevronRight" size={15} />
            </Link>
            <Link to="/bracket" className="btn-ghost text-sm">
              <Icon name="trophy" size={15} />
              Mi bracket
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://mundial26-predictor.vercel.app')
                toast.success('Link copiado — ¡compártelo!')
              }}
              className="btn-ghost text-sm">
              <Icon name="share" size={15} />
              Invitar amigos
            </button>
          </div>
        </div>
      </section>

      {/* ── Stat tiles del torneo ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-up-1">
        {[
          { value: '48', label: 'Equipos', to: '/teams', color: 'text-gold' },
          { value: '12', label: 'Grupos', to: '/matches', color: 'text-mx' },
          { value: '104', label: 'Partidos', to: '/matches', color: 'text-us' },
          { value: '16', label: 'Estadios', to: '/stadiums', color: 'text-ca' },
        ].map(stat => (
          <Link key={stat.label} to={stat.to}
            className="bg-panel border border-white/8 rounded-2xl p-4 text-center hover-lift">
            <div className={`font-display text-4xl md:text-5xl leading-none ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] mt-2">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* ── Resumen de perfil: tu rendimiento ────────────────── */}
        {stats && (
          <section className="bg-panel border border-white/8 rounded-2xl p-6 fade-up-2">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="trending" size={16} className="text-gold" />
              <h2 className="font-condensed font-extrabold text-xs text-gray-300 uppercase tracking-[0.18em]">
                Tu Rendimiento
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: stats.total_points, l: 'Puntos', c: 'text-gold' },
                { v: stats.total_predictions, l: 'Predicciones', c: 'text-white' },
                { v: myRank > 0 ? `#${myRank}` : '--', l: 'Posición Global', c: 'text-mx' },
                { v: `${stats.total_predictions ? stats.total_points : 0}`, l: 'Total Acumulado', c: 'text-gray-400' },
              ].map(({ v, l, c }) => (
                <div key={l} className="bg-ink-900 border border-white/6 rounded-xl p-4 text-center">
                  <div className={`font-display text-2xl md:text-3xl leading-none mb-1.5 ${c}`}>{v}</div>
                  <div className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.14em]">{l}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Top 5 ranking global ─────────────────────────────── */}
        <section className="relative overflow-hidden bg-panel border border-white/8 rounded-2xl p-6 fade-up-3 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Icon name="trophy" size={16} className="text-gold" />
              <h2 className="font-condensed font-extrabold text-xs text-gray-300 uppercase tracking-[0.18em]">
                Top Global
              </h2>
            </div>
            <Link to="/leaderboard"
              className="inline-flex items-center gap-1 text-gold text-[11px] font-condensed font-extrabold uppercase tracking-[0.12em] hover:underline">
              Ver todo
              <Icon name="chevronRight" size={13} />
            </Link>
          </div>
          {loading ? (
            <div className="py-2"><Skeleton rows={5} /></div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {leaderboard.map((e, i) => (
                <div key={e.username}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${
                    e.username === user?.username ? 'bg-gold/5 border-gold/20' : 'border-transparent'
                  }`}
                >
                  <span className="w-6 text-center flex-shrink-0">
                    {i < 3
                      ? <span className="no-invert text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      : <span className="font-display text-sm text-gray-600">{i + 1}</span>}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-panel-2 border border-white/8 flex items-center justify-center text-[10px] font-condensed font-extrabold uppercase text-gray-400 flex-shrink-0">
                    {e.username[0]}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-white truncate">
                    {e.username}
                    {e.username === user?.username && (
                      <span className="chip text-gold border-gold/30 bg-gold/10 ml-1.5">tú</span>
                    )}
                  </span>
                  <span className="font-display text-base text-gold whitespace-nowrap">{e.total_points} pts</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Siguientes partidos (tickets) ──────────────────────── */}
      {nextMatches.length > 0 && (
        <section className="fade-up-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Icon name="flame" size={16} className="text-ca" />
              <h2 className="font-condensed font-extrabold text-xs text-gray-300 uppercase tracking-[0.18em]">
                Siguientes Partidos
              </h2>
            </div>
            <Link to="/matches"
              className="inline-flex items-center gap-1 text-gold text-[11px] font-condensed font-extrabold uppercase tracking-[0.12em] hover:underline">
              Ver todos
              <Icon name="chevronRight" size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextMatches.map(m => (
              <Link key={m.id} to="/matches"
                className="ticket-card hover-lift p-4 pr-7 flex flex-col justify-between"
              >
                <div className="flex justify-center mb-3">
                  <span className="chip text-us border-us/30 bg-us/10">Grupo {m.group_name}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center flex-1 min-w-0">
                    <div className="text-2xl mb-1 no-invert">{getFlag(m.home_team)}</div>
                    <div className="text-[11px] font-condensed font-bold truncate text-white uppercase tracking-wide">{m.home_team}</div>
                  </div>
                  <div className="font-display text-xs text-gray-600 px-3 select-none">VS</div>
                  <div className="text-center flex-1 min-w-0">
                    <div className="text-2xl mb-1 no-invert">{getFlag(m.away_team)}</div>
                    <div className="text-[11px] font-condensed font-bold truncate text-white uppercase tracking-wide">{m.away_team}</div>
                  </div>
                </div>
                <div className="border-t border-white/6 pt-2.5 select-none">
                  <span className="flex items-center justify-center gap-1.5 text-gray-500 text-[10px] font-condensed font-bold uppercase tracking-wide">
                    <Icon name="clock" size={11} />
                    {new Date(m.match_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: LIMA_TZ })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
