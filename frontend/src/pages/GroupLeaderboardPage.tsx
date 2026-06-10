import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

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
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

      {/* Back navigation */}
      <Link
        to="/groups"
        className="inline-flex items-center gap-1.5 text-gold text-xs font-condensed font-extrabold uppercase tracking-[0.15em] hover:underline mb-6"
        id="back-to-groups-btn"
      >
        <Icon name="chevronLeft" size={14} strokeWidth={2.6} />
        Volver a Mis Grupos
      </Link>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        group && (
          <>
            {/* Header Box */}
            <div className="ticket-card p-6 mb-8 fade-up">
              <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pl-1.5">
                <div>
                  <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em] text-mx block mb-2">
                    Liga privada
                  </span>
                  <h1 className="font-display text-3xl md:text-5xl text-white uppercase leading-none">
                    {group.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.15em] text-gray-500">
                        Código de invitación
                      </span>
                      <span className="scoreboard px-2.5 py-1 rounded-lg text-sm tracking-[0.25em]">
                        {group.invite_code}
                      </span>
                      <button
                        onClick={() => copyCode(group.invite_code)}
                        className="inline-flex items-center gap-1 text-[10px] font-condensed font-extrabold uppercase tracking-wider text-gray-400 hover:text-gold cursor-pointer transition-colors"
                      >
                        <Icon name="copy" size={11} />
                        Copiar
                      </button>
                    </div>
                    {myRank > 0 && (
                      <>
                        <span className="w-px h-3 bg-white/10 hidden md:inline-block" />
                        <p>
                          Tu posición: <span className="text-gold font-bold">#{myRank}</span> de {leaderboard.length}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Grid layout: Leaderboard & Message Wall */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* Leaderboard Column */}
              <div className="lg:col-span-2 flex flex-col fade-up-1">
                <h2 className="flex items-center gap-2 text-sm font-condensed font-extrabold uppercase tracking-[0.2em] text-gold mb-4">
                  <Icon name="trophy" size={15} />
                  Tabla de Clasificación
                </h2>

                <div className="bg-panel border border-white/8 rounded-2xl overflow-hidden">
                  <div className="tri-stripe" />
                  <div className="px-4 md:px-6 py-3.5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.18em]">
                    <div className="flex items-center gap-4">
                      <span className="w-8 text-center">Pos</span>
                      <span>Competidor</span>
                    </div>
                    <div className="flex gap-8 md:gap-12 items-center">
                      <span className="w-16 text-right hidden sm:inline-block">Preds</span>
                      <span className="w-20 text-right">Puntos</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((entry, idx) => {
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

                              {/* Competitor Username & Compare */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-white text-sm truncate max-w-[100px] sm:max-w-[180px]">
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
                            <div className="flex gap-8 md:gap-12 items-center flex-shrink-0">
                              <span className="text-gray-500 text-xs font-semibold w-16 text-right hidden sm:inline-block">
                                {entry.total_predictions} pred.
                              </span>

                              <span className={`w-20 text-right font-display text-lg ${isTop3 ? rankColor : 'text-white'}`}>
                                {entry.total_points}
                                <span className="block text-[8px] font-condensed font-extrabold text-gray-600 uppercase tracking-[0.18em] leading-tight">pts</span>
                              </span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-10 text-center">
                        <Icon name="users" size={36} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-500 text-sm">
                          Aún no hay participantes en este grupo. ¡Invita a tus amigos!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Private Chat Wall Column */}
              <div className="bg-panel border border-white/8 rounded-2xl flex flex-col h-[550px] overflow-hidden fade-up-2">
                <div className="tri-stripe flex-shrink-0" />
                <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between gap-2 flex-shrink-0">
                  <h2 className="text-sm font-condensed font-extrabold uppercase tracking-[0.18em] text-white flex items-center gap-2">
                    <span className="no-invert text-base">💬</span>
                    Chat del Grupo
                  </h2>
                  <span className="chip text-mx border-mx/25 bg-mx/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-mx live-dot" />
                    En vivo
                  </span>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
                  {messages.length > 0 ? (
                    messages.map(msg => {
                      const isMe = msg.username === user?.username
                      return (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-2xl max-w-[85%] border transition-all ${
                            isMe
                              ? 'bg-gold/[0.07] border-gold/20 ml-auto rounded-tr-sm'
                              : 'bg-panel-2 border-white/8 mr-auto rounded-tl-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1 select-none">
                            <span className={`text-[10px] font-condensed font-extrabold uppercase tracking-wider ${isMe ? 'text-gold' : 'text-gray-300'}`}>
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
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <span className="text-4xl block mb-3 no-invert">💬</span>
                      <p className="text-white font-condensed font-extrabold uppercase tracking-wide text-sm">¡Aún no hay mensajes!</p>
                      <p className="text-xs text-gray-500 mt-1">Envía el primer mensaje para empezar el banter con el grupo.</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-white/5 bg-white/[0.02] flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    disabled={submitting}
                    className="flex-1 min-w-0 bg-ink-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold/40 text-white placeholder-gray-600 disabled:opacity-50"
                    id="chat-message-input"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newMessage.trim()}
                    aria-label="Enviar mensaje"
                    className="bg-gold text-ink-950 rounded-xl px-3.5 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-150 hover:brightness-110 shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                    id="chat-send-btn"
                  >
                    {submitting ? (
                      <span className="font-display text-xs">···</span>
                    ) : (
                      <Icon name="send" size={16} strokeWidth={2.2} />
                    )}
                  </button>
                </form>
              </div>

            </div>
          </>
        )
      )}
    </div>
  )
}
