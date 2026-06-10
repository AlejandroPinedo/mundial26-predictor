import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

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
    topThree[1] ? { ...topThree[1], rank: 2, badge: '🥈', color: 'border-slate-500/20 bg-slate-900/40 shadow-slate-500/5', text: 'text-slate-350', height: 'h-48' } : null,
    topThree[0] ? { ...topThree[0], rank: 1, badge: '🥇', color: 'border-yellow-400/30 bg-yellow-950/20 shadow-yellow-500/10', text: 'text-yellow-400', height: 'h-56' } : null,
    topThree[2] ? { ...topThree[2], rank: 3, badge: '🥉', color: 'border-amber-700/20 bg-amber-950/20 shadow-amber-700/5', text: 'text-amber-500', height: 'h-44' } : null,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">

        <PageHeader title="RANKING GLOBAL" subtitle="Mundial26 Predictor · Se actualiza cada 30s" live badge="En vivo" icon="🏆" action={
          <input
            placeholder="🔍 Buscar jugador..."
            className="bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-2.5 rounded-xl text-sm outline-none transition w-full sm:w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        } />

        {/* My stats overview */}
        {myEntry && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-5 mb-8 flex items-center justify-between shadow-xl backdrop-blur-md relative overflow-hidden group premium-glow font-sans">
            <div className="absolute top-0 left-0 w-2.5 h-full bg-yellow-400" />
            <div>
              <span className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">Mi Rendimiento</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-white font-barlow font-black text-2xl">
                  {user?.username}
                </span>
                <span className="text-yellow-400 font-bold text-sm bg-yellow-400/10 border border-yellow-400/25 px-2.5 py-0.5 rounded-full">
                  #{myRank} de {leaderboard.length}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-500 uppercase font-black text-[10px] tracking-wider block">Puntos Acumulados</span>
              <span className="text-yellow-400 font-barlow font-black text-3xl block mt-0.5">
                {myEntry.total_points} <span className="text-xs font-sans text-gray-500 font-normal">pts</span>
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-3xl font-sans">
            <p className="text-5xl mb-4 no-invert">🏆</p>
            <p className="text-white font-bold text-lg">Sin jugadores todavía</p>
            <p className="text-gray-500 text-sm mt-1">Sé el primero en guardar una predicción para liderar la tabla.</p>
          </div>
        ) : (
          <>
            {/* 3D Podium for Top 3 */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto mb-10 items-end font-sans">
                {podiumOrder.map((entry) => {
                  if (!entry) return null
                  const isMe = entry.username === user?.username
                  return (
                    <div
                      key={entry.username}
                      className={`flex flex-col items-center justify-between border rounded-3xl p-3 md:p-5 shadow-2xl relative overflow-hidden transition-transform duration-300 hover:scale-102 ${entry.color} ${entry.height}`}
                    >
                      <span className="text-3xl md:text-4xl absolute -top-1 -right-1 opacity-20 select-none">
                        {entry.badge}
                      </span>
                      
                      <div className="flex flex-col items-center text-center mt-2 w-full">
                        <span className="text-2xl md:text-3xl mb-2">{entry.badge}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                          Puesto #{entry.rank}
                        </span>
                        
                        <Link
                          to={`/compare/${encodeURIComponent(entry.username)}`}
                          className={`font-black text-xs md:text-sm truncate w-full mt-1.5 uppercase hover:underline ${
                            isMe ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          {entry.username}
                        </Link>
                        {isMe && (
                          <span className="text-[8px] font-black uppercase tracking-widest bg-yellow-400 text-gray-950 px-1.5 py-0.5 rounded-full mt-1">
                            TÚ
                          </span>
                        )}
                      </div>

                      <div className="text-center mt-3">
                        <span className={`font-barlow font-black text-2xl md:text-3xl ${entry.text}`}>
                          {entry.total_points}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block leading-none">
                          puntos
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}


            {/* Leaderboard Table / List */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl font-sans">
              <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/40 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase tracking-wider">
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center">Pos</span>
                  <span>Competidor</span>
                </div>
                <div className="flex gap-16 items-center">
                  <span className="w-16 text-right hidden sm:inline-block">Predicciones</span>
                  <span className="w-16 text-right">Puntos</span>
                </div>
              </div>

              <div className="flex flex-col">
                {filtered.map((entry, idx) => {
                  const isMe = entry.username === user?.username
                  const isTop3 = idx < 3
                  
                  return (
                    <div
                      key={entry.username}
                      className={`flex items-center justify-between px-6 py-4 border-b border-gray-800/40 last:border-0 hover:bg-gray-850/40 transition-colors duration-150 ${
                        isMe ? 'bg-yellow-400/5 border-l-4 border-l-yellow-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Position Indicator */}
                        <span className="w-8 text-center font-barlow font-black text-base flex justify-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                            <span className="text-gray-500 font-bold text-sm">#{idx + 1}</span>
                          )}
                        </span>

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-gray-950 select-none ${
                          isTop3 ? 'bg-yellow-400' : 'bg-gray-800 text-gray-300'
                        }`}>
                          {entry.username[0].toUpperCase()}
                        </div>

                        {/* Competitor Username & Links */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                            {entry.username}
                          </span>
                          {isMe ? (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                              tú
                            </span>
                          ) : (
                            <Link
                              to={`/compare/${encodeURIComponent(entry.username)}`}
                              className="text-[10px] font-bold text-gray-400 hover:text-yellow-400 bg-gray-950/60 border border-gray-800 hover:border-yellow-400/30 px-2 py-1 rounded-xl transition-all"
                            >
                              Comparar 🤜🤛
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-16 items-center flex-shrink-0">
                        <span className="text-gray-500 text-xs font-semibold w-16 text-right hidden sm:inline-block">
                          {entry.total_predictions} pred.
                        </span>
                        
                        <span className={`w-16 text-right font-display text-2xl text-yellow-400`}>
                          {entry.total_points} <span className="text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wide">pts</span>
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
    </div>
  )
}
