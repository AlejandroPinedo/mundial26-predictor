import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

type Entry = {
  username: string
  total_predictions: string
  total_points: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = () => apiFetch('/predictions/leaderboard').then(d => setLeaderboard(d.leaderboard))
    load().finally(() => setLoading(false))
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1
  const filtered = search
    ? leaderboard.filter(e => e.username.toLowerCase().includes(search.toLowerCase()))
    : leaderboard
  const myEntry = leaderboard.find(e => e.username === user?.username)

  const topThree = leaderboard.slice(0, 3)

  // Order for 3D podium: [2nd, 1st, 3rd]
  const podiumOrder = [
    topThree[1] ? { ...topThree[1], rank: 2, badge: '🥈', color: 'border-white/15 bg-white/[0.04]', text: 'text-gray-300', height: 'h-24 md:h-28' } : null,
    topThree[0] ? { ...topThree[0], rank: 1, badge: '🥇', color: 'border-gold/30 bg-gold/[0.07]', text: 'text-gold', height: 'h-32 md:h-40' } : null,
    topThree[2] ? { ...topThree[2], rank: 3, badge: '🥉', color: 'border-amber-500/25 bg-amber-500/[0.06]', text: 'text-amber-500', height: 'h-20 md:h-24' } : null,
  ].filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">

      <PageHeader title="RANKING GLOBAL" subtitle="Mundial26 Predictor · Se actualiza cada 30s" live badge="En vivo" icon="🏆" action={
        <div className="relative w-full sm:w-64">
          <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            placeholder="Buscar jugador..."
            className="w-full bg-white/[0.04] border border-white/10 focus:border-gold/40 text-white pl-9 pr-4 py-2.5 rounded-xl text-sm font-sans outline-none transition placeholder-gray-600"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      } />

      {/* My stats overview */}
      {myEntry && (
        <div className="ticket-card p-5 mb-8 flex items-center justify-between gap-4 flex-wrap font-sans fade-up-1">
          <div className="pl-1.5 min-w-0">
            <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">Mi Rendimiento</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-xl md:text-2xl text-white uppercase truncate max-w-[200px]">
                {user?.username}
              </span>
              <span className="chip text-gold border-gold/25 bg-gold/10">
                #{myRank} de {leaderboard.length}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">Puntos Acumulados</span>
            <span className="scoreboard inline-block px-3.5 py-1.5 rounded-xl text-2xl leading-none">
              {myEntry.total_points}
            </span>
            <span className="text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-600 ml-1.5">pts</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20 bg-panel border border-white/8 rounded-2xl font-sans fade-up-1">
          <Icon name="trophy" size={44} className="mx-auto text-gold/40 mb-4" />
          <p className="text-white font-condensed font-extrabold uppercase tracking-wide text-lg">Sin jugadores todavía</p>
          <p className="text-gray-500 text-sm mt-1">Sé el primero en guardar una predicción para liderar la tabla.</p>
        </div>
      ) : (
        <>
          {/* 3D Podium for Top 3 */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-3xl mx-auto mb-10 items-end font-sans fade-up-2">
              {podiumOrder.map((entry) => {
                if (!entry) return null
                const isMe = entry.username === user?.username
                const isFirst = entry.rank === 1
                return (
                  <div key={entry.username} className="flex flex-col items-center min-w-0">

                    {isFirst && <Icon name="crown" size={24} className="text-gold mb-1.5" strokeWidth={2.2} />}

                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-display text-base select-none mb-2 ${
                      isFirst
                        ? 'bg-gold text-ink-950 shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]'
                        : 'bg-panel-2 border border-white/10 text-gray-300'
                    }`}>
                      {entry.username[0].toUpperCase()}
                    </div>

                    <Link
                      to={`/compare/${encodeURIComponent(entry.username)}`}
                      className={`font-condensed font-extrabold uppercase tracking-wide text-xs md:text-sm truncate max-w-full hover:underline ${
                        isFirst ? 'text-gold' : 'text-white'
                      }`}
                    >
                      {entry.username}
                    </Link>
                    {isMe && (
                      <span className="chip text-gold border-gold/30 bg-gold/10 mt-1">Tú</span>
                    )}

                    <div className="text-center mt-1.5 mb-3">
                      <span className={`font-display text-2xl md:text-3xl ${isFirst ? 'trophy-text' : entry.text}`}>
                        {entry.total_points}
                      </span>
                      <span className="block text-[9px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.18em] leading-none mt-0.5">
                        puntos
                      </span>
                    </div>

                    {/* Podium base */}
                    <div className={`w-full ${entry.height} ${entry.color} border border-b-0 rounded-t-2xl relative overflow-hidden flex items-start justify-center pt-2.5`}>
                      <span className={`font-display text-3xl md:text-4xl opacity-80 ${entry.text}`}>
                        {entry.rank}
                      </span>
                      <span className="absolute -right-2 -bottom-4 text-4xl opacity-15 select-none no-invert" aria-hidden="true">
                        {entry.badge}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}


          {/* Leaderboard Table / List */}
          <div className="bg-panel border border-white/8 rounded-2xl overflow-hidden font-sans fade-up-3">
            <div className="tri-stripe" />
            <div className="px-4 md:px-6 py-3.5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.18em]">
              <div className="flex items-center gap-4">
                <span className="w-8 text-center">Pos</span>
                <span>Competidor</span>
              </div>
              <div className="flex gap-10 md:gap-16 items-center">
                <span className="w-16 text-right hidden sm:inline-block">Predicciones</span>
                <span className="w-16 text-right">Puntos</span>
              </div>
            </div>

            <div className="flex flex-col">
              {filtered.map((entry, idx) => {
                const isMe = entry.username === user?.username
                const isTop3 = idx < 3
                const rankColor = idx === 0 ? 'text-gold' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-500' : 'text-gray-600'

                return (
                  <div
                    key={entry.username}
                    className={`relative flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors duration-150 ${
                      isMe ? 'bg-gold/[0.04]' : ''
                    }`}
                  >
                    {isMe && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gold" aria-hidden="true" />}

                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      {/* Position Indicator */}
                      <span className={`w-8 text-center font-display text-sm ${rankColor}`}>
                        {idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-xs select-none flex-shrink-0 ${
                        isTop3 ? 'bg-gold text-ink-950' : 'bg-panel-2 border border-white/8 text-gray-300'
                      }`}>
                        {entry.username[0].toUpperCase()}
                      </div>

                      {/* Competitor Username & Links */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-white text-sm truncate max-w-[110px] sm:max-w-[180px]">
                          {entry.username}
                        </span>
                        {isMe ? (
                          <span className="chip text-gold border-gold/25 bg-gold/10">tú</span>
                        ) : (
                          <Link
                            to={`/compare/${encodeURIComponent(entry.username)}`}
                            className="chip text-gray-400 hover:text-gold hover:border-gold/30 transition-colors"
                          >
                            Comparar
                            <Icon name="chevronRight" size={10} />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-10 md:gap-16 items-center flex-shrink-0">
                      <span className="text-gray-500 text-xs font-semibold w-16 text-right hidden sm:inline-block">
                        {entry.total_predictions} pred.
                      </span>

                      <span className={`w-16 text-right font-display text-lg md:text-xl ${isTop3 ? rankColor : 'text-gold'}`}>
                        {entry.total_points}
                        <span className="block text-[8px] font-condensed font-extrabold text-gray-600 uppercase tracking-[0.18em] leading-tight">pts</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
