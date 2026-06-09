import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'

type Entry = {
  username: string
  total_predictions: string
  total_points: string
}

type Group = {
  id: string
  name: string
  invite_code: string
}

type ChatMessage = {
  id: number
  group_id: number
  user_id: number
  message: string
  created_at: string
  username: string
}

export default function GroupLeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [group, setGroup] = useState<Group | null>(null)
  const [leaderboard, setLeaderboard] = useState<Entry[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadData = () => {
    Promise.all([
      apiFetch(`/groups/${id}/leaderboard`),
      apiFetch(`/groups/${id}/messages`),
    ])
      .then(([lbData, msgData]) => {
        setGroup(lbData.group)
        setLeaderboard(lbData.leaderboard)
        setMessages(msgData.messages)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // Poll for new messages every 15 seconds
    const interval = setInterval(() => {
      apiFetch(`/groups/${id}/messages`)
        .then(data => {
          setMessages(data.messages)
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await apiFetch(`/groups/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage }),
      })
      setMessages(prev => [...prev, res.message])
      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Código ${code} copiado`)
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans">
        
        {/* Back navigation */}
        <Link
          to="/groups"
          className="text-yellow-400 text-sm hover:underline mb-6 inline-block font-semibold"
          id="back-to-groups-btn"
        >
          ← Volver a Mis Grupos
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          group && (
            <>
              {/* Header Box */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 mb-8 backdrop-blur-md relative overflow-hidden group shadow-xl">
                <div className="absolute top-0 left-0 w-2.5 h-full bg-yellow-400" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display text-5xl text-white uppercase leading-none">
                      {group.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span>Código de invitación:</span>
                        <span className="font-mono font-bold text-yellow-400 bg-yellow-400/5 border border-yellow-400/10 px-2.5 py-0.5 rounded">
                          {group.invite_code}
                        </span>
                        <button
                          onClick={() => copyCode(group.invite_code)}
                          className="text-gray-400 hover:text-white font-bold underline ml-1 cursor-pointer"
                        >
                          Copiar 📋
                        </button>
                      </div>
                      {myRank > 0 && (
                        <>
                          <span className="w-px h-3 bg-gray-800 hidden md:inline-block" />
                          <p>
                            Tu posición: <span className="text-yellow-400 font-bold">#{myRank}</span> de {leaderboard.length}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bento Grid layout: Leaderboard & Message Wall */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Leaderboard Column */}
                <div className="lg:col-span-2 flex flex-col">
                  <h2 className="text-xl font-displayr text-yellow-400 mb-4 flex items-center gap-2">
                    🏆 Tabla de Clasificación
                  </h2>
                  
                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/40 flex justify-between items-center text-[10px] text-gray-500 font-black uppercase tracking-wider">
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center">Pos</span>
                        <span>Competidor</span>
                      </div>
                      <div className="flex gap-12 items-center">
                        <span className="w-16 text-right hidden sm:inline-block">Preds</span>
                        <span className="w-20 text-right">Puntos</span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      {leaderboard.length > 0 ? (
                        leaderboard.map((entry, idx) => {
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
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-gray-950 select-none ${
                                  isTop3 ? 'bg-yellow-400' : 'bg-gray-800 text-gray-300'
                                }`}>
                                  {entry.username[0].toUpperCase()}
                                </div>

                                {/* Competitor Username & Compare */}
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-white truncate max-w-[100px] sm:max-w-[180px]">
                                    {entry.username}
                                  </span>
                                  {isMe ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                                      tú
                                    </span>
                                  ) : (
                                    <Link
                                      to={`/compare/${encodeURIComponent(entry.username)}`}
                                      className="text-[10px] font-bold text-gray-400 hover:text-yellow-400 bg-gray-950/60 border border-gray-800 hover:border-yellow-400/30 px-2.5 py-1 rounded-xl transition-all"
                                    >
                                      Comparar 🤜🤛
                                    </Link>
                                  )}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex gap-12 items-center flex-shrink-0">
                                <span className="text-gray-500 text-xs font-semibold w-16 text-right hidden sm:inline-block">
                                  {entry.total_predictions} pred.
                                </span>
                                
                                <span className={`w-20 text-right font-barlow font-black text-xl ${
                                  idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-500' : 'text-white'
                                }`}>
                                  {entry.total_points} <span className="text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wide">pts</span>
                                </span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="p-10 text-center text-gray-500">
                          Aún no hay participantes en este grupo. ¡Invita a tus amigos!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Private Chat Wall Column */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col h-[550px] shadow-2xl relative">
                  <h2 className="text-xl font-displayr text-yellow-400 mb-4 flex items-center gap-2">
                    💬 Chat del Grupo
                  </h2>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                    {messages.length > 0 ? (
                      messages.map(msg => {
                        const isMe = msg.username === user?.username
                        return (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-2xl max-w-[85%] border transition-all ${
                              isMe
                                ? 'bg-yellow-400/5 border-yellow-400/15 ml-auto rounded-tr-none'
                                : 'bg-gray-950/60 border-gray-850 mr-auto rounded-tl-none'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1 select-none">
                              <span className={`text-[10px] font-black uppercase ${isMe ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {msg.username}
                              </span>
                              <span className="text-[9px] text-gray-500 font-bold">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed break-words">{msg.message}</p>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
                        <span className="text-4xl block mb-2 no-invert">💬</span>
                        <p className="text-white font-bold text-sm">¡Aún no hay mensajes!</p>
                        <p className="text-xs text-gray-500 mt-1">Envía el primer mensaje para empezar el banter con el grupo.</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-gray-800/80">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      disabled={submitting}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400/40 text-white disabled:opacity-50"
                      id="chat-message-input"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newMessage.trim()}
                      className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-4 py-2.5 rounded-2xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                      id="chat-send-btn"
                    >
                      {submitting ? '...' : 'Enviar'}
                    </button>
                  </form>
                </div>

              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
