import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Link
          to="/groups"
          className="text-yellow-400 text-sm hover:underline mb-6 inline-block font-semibold font-sans"
          id="back-to-groups-btn"
        >
          ← Volver a Grupos
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          group && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">
                    {group.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-1 font-sans">
                    <p className="text-gray-500 text-sm">
                      Código de invitación: <span className="text-yellow-400 font-mono font-bold">{group.invite_code}</span>
                    </p>
                    {myRank > 0 && (
                      <p className="text-gray-500 text-sm">
                        Tu posición: <span className="text-white font-bold">#{myRank}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bento Grid layout: Leaderboard & Message Wall */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start font-sans">
                
                {/* Leaderboard Column */}
                <div className="lg:col-span-2">
                  <h2 className="text-lg font-barlow font-black uppercase tracking-wider text-yellow-400/90 mb-4 flex items-center gap-2">
                    🏆 Ranking del Grupo
                  </h2>
                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((entry, i) => (
                        <div
                          key={entry.username}
                          className={`flex items-center gap-4 px-6 py-4 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors duration-150 ${
                            entry.username === user?.username ? 'bg-yellow-400/5 border-l-4 border-l-yellow-400' : ''
                          }`}
                        >
                          <span className="text-2xl font-black w-8 text-center">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500 text-sm">{i + 1}</span>}
                          </span>
                          <span className="flex-1 font-bold text-white flex items-center gap-2">
                            {entry.username}
                            {entry.username === user?.username && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/25">
                                tú
                              </span>
                            )}
                          </span>
                          
                          {/* Add a H2H Compare link next to other members */}
                          {entry.username !== user?.username && (
                            <Link
                              to={`/compare/${encodeURIComponent(entry.username)}`}
                              className="text-xs text-gray-400 hover:text-yellow-400 border border-gray-800 hover:border-yellow-400/30 px-2.5 py-1 rounded-xl bg-gray-950/40 hover:bg-yellow-400/5 transition-all"
                            >
                              Comparar 🤜🤛
                            </Link>
                          )}

                          <span className="text-gray-400 text-sm hidden sm:inline-block w-24 text-right">
                            {entry.total_predictions} pred.
                          </span>
                          <span className="text-yellow-400 font-bold text-lg w-20 text-right">
                            {entry.total_points} pts
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        No hay participantes en este grupo.
                      </div>
                    )}
                  </div>
                </div>

                {/* Private Chat Wall Column */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 flex flex-col h-[550px] shadow-xl">
                  <h2 className="text-lg font-barlow font-black uppercase tracking-wider text-yellow-400/90 mb-4 flex items-center gap-2">
                    💬 Muro del Grupo
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
                                ? 'bg-yellow-400/5 border-yellow-400/15 ml-auto'
                                : 'bg-gray-800/40 border-gray-700/40 mr-auto'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span className={`text-xs font-black ${isMe ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {msg.username}
                              </span>
                              <span className="text-[9px] text-gray-500">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed break-words">{msg.message}</p>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
                        <span className="text-3xl block mb-2 no-invert">💬</span>
                        <p className="text-xs">¡Aún no hay mensajes!</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Escribe algo abajo para iniciar la conversación.</p>
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
                      className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold px-4 py-2.5 rounded-2xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
