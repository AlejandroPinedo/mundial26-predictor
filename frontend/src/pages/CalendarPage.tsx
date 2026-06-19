import { useEffect, useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import Flag from '../components/Flag'
import MatchPrediction from '../components/MatchPrediction'
import { LIMA_TZ } from '../utils/dates'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { HOST_NATIONS } from '../utils/ratings'
import { currentElo } from '../predict/elo'
import { predictMatch } from '../predict/predictMatch'
import { computeForm } from '../utils/recentForm'
import LiveScore, { isLive } from '../components/LiveScore'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  group_name: string
  home_score: number | null
  away_score: number | null
  stadium_name?: string
  live_status?: string | null
  live_home?: number | null
  live_away?: number | null
  live_minute?: string | null
}

type Prediction = {
  match_id: string
  predicted_home: number
  predicted_away: number
  points: number | null
}

export default function CalendarPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState('all') // 'all' or specific YYYY-MM-DD

  useEffect(() => {
    Promise.all([
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my')
    ])
      .then(([matchData, predData]) => {
        setMatches(matchData.matches)
        const map: Record<string, Prediction> = {}
        for (const p of predData.predictions) {
          map[p.match_id] = p
        }
        setPredictions(map)

        // Seed inputs
        const initInputs: Record<string, { home: string; away: string }> = {}
        for (const p of predData.predictions) {
          initInputs[p.match_id] = { home: String(p.predicted_home), away: String(p.predicted_away) }
        }
        setInputs(initInputs)
      })
      .catch((err) => {
        toast.error('Error al cargar datos del calendario: ' + err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePredict = async (matchId: string) => {
    const input = inputs[matchId]
    if (!input || input.home === '' || input.away === '') {
      toast.error('Ingresa ambos marcadores')
      return
    }
    setSavingId(matchId)
    try {
      await apiFetch('/predictions', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          predictedHome: Number(input.home),
          predictedAway: Number(input.away),
        }),
      })
      toast.success('Predicción guardada')
      // Refresh my predictions
      const d = await apiFetch('/predictions/my')
      const map: Record<string, Prediction> = {}
      for (const p of d.predictions) {
        map[p.match_id] = p
      }
      setPredictions(map)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar predicción')
    } finally {
      setSavingId(null)
    }
  }

  const handleInputChange = (matchId: string, side: 'home' | 'away', val: string) => {
    setInputs((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: val,
      },
    }))
  }

  const now = new Date()

  // Elo en vivo (snapshot + resultados jugados) para el pronóstico del modelo.
  const liveElo = useMemo(() => currentElo(matches), [matches])
  const formMap = useMemo(() => computeForm(matches), [matches])

  // Día del partido en hora de Perú (YYYY-MM-DD) — 'en-CA' produce formato ISO
  const limaDay = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TZ }).format(new Date(iso))

  // Día de HOY (hora de Perú) + auto-scroll a su sección al cargar
  const todayKey = limaDay(now.toISOString())
  const todayRef = useRef<HTMLDivElement | null>(null)
  const didScroll = useRef(false)
  useEffect(() => {
    if (loading || didScroll.current || !todayRef.current) return
    didScroll.current = true
    todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading])

  // dateStr es una clave de día (YYYY-MM-DD): se formatea en UTC para no desplazar el día
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
  }

  const getFullDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  }

  const formatTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIMA_TZ })
  }

  // Get distinct dates represented in matches (YYYY-MM-DD, día de Perú)
  const distinctDates = [...new Set(matches.map((m) => limaDay(m.match_date)))].sort()

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    const mDate = limaDay(m.match_date)

    // Search filter
    const matchesSearch =
      m.home_team.toLowerCase().includes(search.toLowerCase()) ||
      m.away_team.toLowerCase().includes(search.toLowerCase()) ||
      m.stage.toLowerCase().includes(search.toLowerCase()) ||
      (m.group_name && `grupo ${m.group_name.toLowerCase()}`.includes(search.toLowerCase()))

    // Stage filter
    let matchesStage = true
    if (selectedStage !== 'all') {
      if (selectedStage === 'group') {
        matchesStage = !!m.group_name
      } else {
        matchesStage = m.stage.toLowerCase().includes(selectedStage.toLowerCase())
      }
    }

    // Status filter
    let matchesStatus = true
    const hasPred = predictions[m.id] !== undefined
    if (selectedStatus === 'predicted') {
      matchesStatus = hasPred
    } else if (selectedStatus === 'unpredicted') {
      matchesStatus = !hasPred && m.home_score === null && now < new Date(m.match_date)
    } else if (selectedStatus === 'played') {
      matchesStatus = m.home_score !== null
    }

    // Date filter
    let matchesDate = true
    if (selectedDate !== 'all') {
      matchesDate = mDate === selectedDate
    }

    return matchesSearch && matchesStage && matchesStatus && matchesDate
  })

  // Group filtered matches by Date
  const matchesByDate: Record<string, Match[]> = {}
  for (const m of filteredMatches) {
    const mDate = limaDay(m.match_date)
    if (!matchesByDate[mDate]) matchesByDate[mDate] = []
    matchesByDate[mDate].push(m)
  }

  const sortedFilteredDates = Object.keys(matchesByDate).sort()

  // Total predicted stats
  const totalMatchesCount = matches.length
  const predictedCount = Object.keys(predictions).length
  const completionPercent = totalMatchesCount > 0 ? Math.round((predictedCount / totalMatchesCount) * 100) : 0

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 py-6 pb-24 font-sans">

      <PageHeader title="CALENDARIO" subtitle="Fixture completo · Copa Mundial FIFA 2026 · Horarios en hora de Perú (GMT-5)" icon="📅" />

      {/* Progress Tracker Card */}
      <div className="flex md:justify-end mb-6 fade-up-1">
        <div className="glass rounded-2xl p-4 flex items-center gap-4 min-w-[240px]">
          <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-gold transition-all duration-500"
                strokeWidth="3"
                strokeDasharray={`${completionPercent}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="text-[11px] font-display text-gold">{completionPercent}%</span>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.18em] leading-none">Tu Progreso</p>
            <p className="text-lg font-display text-white leading-none mt-1.5">
              {predictedCount} <span className="text-xs text-gray-500 font-sans font-normal">/ {totalMatchesCount} predecidos</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-col gap-4 fade-up-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Icon name="search" size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar equipo, sede o fase..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-ink-950 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-gold/50 transition text-white placeholder-gray-600"
            />
          </div>

          {/* Stage Selector */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-ink-950 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-gold/50 transition text-white cursor-pointer"
            >
              <option value="all">Fase: Todas</option>
              <option value="group">Fase de Grupos</option>
              <option value="round of 32">Dieciseisavos (R32)</option>
              <option value="round of 16">Octavos (R16)</option>
              <option value="quarterfinals">Cuartos de Final</option>
              <option value="semifinals">Semifinales</option>
              <option value="final">Final</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-ink-950 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-gold/50 transition text-white cursor-pointer"
            >
              <option value="all">Estado: Todos</option>
              <option value="predicted">Predecidos por mí</option>
              <option value="unpredicted">Pendientes por predecir</option>
              <option value="played">Finalizados</option>
            </select>
          </div>

        </div>

        {/* Quick Date Selector Slider */}
        <div className="border-t border-white/8 pt-3">
          <p className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-[0.18em] mb-2">Filtrar por fecha</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDate('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-condensed font-extrabold uppercase tracking-wide whitespace-nowrap transition cursor-pointer ${
                selectedDate === 'all'
                  ? 'bg-gold text-ink-950 shadow-md shadow-gold/20'
                  : 'bg-ink-950 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              Todos los días
            </button>
            {distinctDates.map((dateStr) => {
              const isActive = selectedDate === dateStr
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-condensed font-extrabold uppercase tracking-wide whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-gold text-ink-950 shadow-md shadow-gold/20'
                      : 'bg-ink-950 border border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {formatDateLabel(dateStr)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Matches Feed */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Spinner />
        </div>
      ) : sortedFilteredDates.length === 0 ? (
        <div className="bg-panel border border-white/8 rounded-2xl p-12 text-center max-w-md mx-auto mt-8">
          <Icon name="search" size={40} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-white font-condensed font-extrabold uppercase tracking-wide text-lg mb-1">No se encontraron partidos</h3>
          <p className="text-gray-500 text-sm">
            Intenta cambiar los filtros de búsqueda, fase o fecha para encontrar lo que buscas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 fade-up-3">
          {sortedFilteredDates.map((dateStr) => {
            const dateMatches = matchesByDate[dateStr]
            return (
              <div key={dateStr} ref={dateStr === todayKey ? todayRef : null}
                className="flex flex-col gap-3 scroll-mt-4">
                {/* Sticky Date Title */}
                <div className="sticky top-0 z-10 py-2 bg-ink-950/85 backdrop-blur-md flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-condensed font-black text-sm text-white uppercase tracking-[0.16em] truncate">
                        {getFullDateLabel(dateStr)}
                      </h2>
                      {dateStr === todayKey && (
                        <span className="chip border-gold/40 bg-gold/15 text-gold flex-shrink-0">HOY</span>
                      )}
                    </div>
                    <div className="tri-stripe w-12 rounded-full mt-1.5" aria-hidden="true" />
                  </div>
                  <span className="chip text-gray-400 flex-shrink-0">
                    {dateMatches.length} {dateMatches.length === 1 ? 'partido' : 'partidos'}
                  </span>
                </div>

                {/* Grid of Match Tickets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {dateMatches.map((m) => {
                    const pred = predictions[m.id]
                    const input = inputs[m.id] || { home: '', away: '' }
                    const kickoff = new Date(m.match_date)
                    const isLocked = now > kickoff || m.home_score !== null
                    const isSaved = pred !== undefined && String(pred.predicted_home) === input.home && String(pred.predicted_away) === input.away

                    // Points display
                    const pts = pred?.points ?? 0

                    // Pronóstico del modelo (solo partidos no jugados)
                    const prediction = m.home_score === null
                      ? predictMatch(m.home_team, m.away_team, { neutralVenue: !HOST_NATIONS.has(m.home_team), elo: liveElo })
                      : null

                    return (
                      <div
                        key={m.id}
                        className="ticket-card rounded-2xl p-4 flex flex-col justify-between hover-lift"
                      >
                        {/* Card Top Information */}
                        <div className="flex flex-col gap-1 mb-3 select-none relative z-10">
                          <div className="flex justify-between items-center gap-2 text-[10px] font-condensed font-extrabold text-gray-500 uppercase tracking-[0.12em]">
                            <span className="truncate">
                              Partido #{m.id.split('-')[1] || m.id} · {m.group_name ? `Grupo ${m.group_name}` : m.stage}
                            </span>
                            <span className="text-gold bg-gold/5 px-2 py-0.5 rounded border border-gold/15 flex-shrink-0">
                              {formatTimeLabel(m.match_date)}
                            </span>
                          </div>
                          {m.stadium_name && (
                            <span className="text-[9px] text-gray-600 font-condensed font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="no-invert">🏟️</span> {m.stadium_name}
                            </span>
                          )}
                        </div>

                        {/* Teams Score / Prediction Row */}
                        <div className="flex items-center justify-between gap-3 py-2 relative z-10">
                          {/* Home Team */}
                          <div className="flex-1 flex flex-col items-center gap-1 text-center min-w-0">
                            <Flag team={m.home_team} className="h-5.5 mb-1" />
                            <span className="text-xs font-condensed font-bold text-white truncate w-full">{m.home_team}</span>
                          </div>

                          {/* Center Score / Inputs */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isLocked ? (
                              /* Locked view (official result & predicted score side by side) */
                              <div className="flex flex-col items-center gap-1 select-none">
                                {m.home_score !== null ? (
                                  /* Actual Match Result */
                                  <div className="scoreboard px-2.5 py-1 rounded-lg text-sm">
                                    {m.home_score} - {m.away_score}
                                  </div>
                                ) : isLive(m) ? (
                                  /* Marcador en vivo (Varzesh3) */
                                  <LiveScore m={m} />
                                ) : (
                                  <span className="chip border-mx/30 bg-mx/10 text-mx">
                                    <span className="w-1.5 h-1.5 rounded-full bg-mx animate-pulse" />
                                    Jugando
                                  </span>
                                )}
                                {pred ? (
                                  /* Prediction result */
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1 bg-ink-950 border border-white/8 px-2 py-0.5 rounded-full mt-1">
                                    <span>Pred:</span>
                                    <span className="font-bold text-gray-300">
                                      {pred.predicted_home} - {pred.predicted_away}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-gray-600 italic mt-1">Sin pred.</span>
                                )}
                              </div>
                            ) : (
                              /* Future match / Editable fields */
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={input.home}
                                  placeholder="-"
                                  onChange={(e) => handleInputChange(m.id, 'home', e.target.value)}
                                  className="w-10 h-10 bg-ink-950 border border-white/10 focus:border-gold/60 focus:shadow-[0_0_12px_-2px_rgba(255,195,0,0.4)] rounded-xl text-center font-display text-sm text-gold focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-gray-600 text-[10px] font-condensed font-extrabold select-none">VS</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={input.away}
                                  placeholder="-"
                                  onChange={(e) => handleInputChange(m.id, 'away', e.target.value)}
                                  className="w-10 h-10 bg-ink-950 border border-white/10 focus:border-gold/60 focus:shadow-[0_0_12px_-2px_rgba(255,195,0,0.4)] rounded-xl text-center font-display text-sm text-gold focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 flex flex-col items-center gap-1 text-center min-w-0">
                            <Flag team={m.away_team} className="h-5.5 mb-1" />
                            <span className="text-xs font-condensed font-bold text-white truncate w-full">{m.away_team}</span>
                          </div>
                        </div>

                        {/* Footer action bar */}
                        <div className="border-t border-white/8 mt-3 pt-3 flex justify-between items-center h-8 relative z-10">
                          {/* Left area: Points earned or locking warning */}
                          <div>
                            {m.home_score !== null && pred ? (
                              <span className={`chip ${
                                pts === 3 ? 'border-gold/30 bg-gold/10 text-gold' :
                                pts > 0 ? 'border-mx/30 bg-mx/10 text-mx' :
                                'border-ca/25 bg-ca/10 text-ca'
                              }`}>
                                {pts > 0 ? `+${pts} PTS` : '0 PTS'}
                              </span>
                            ) : !isLocked ? (
                              /* Deadline warning if under 24 hours */
                              (() => {
                                const warn = (kickoff.getTime() - now.getTime()) / (1000 * 60 * 60) < 24
                                return warn ? (
                                  <span className="chip border-ca/30 bg-ca/10 text-ca animate-pulse">
                                    Cierra pronto
                                  </span>
                                ) : null
                              })()
                            ) : null}
                          </div>

                          {/* Right area: Save button */}
                          {!isLocked && (
                            <button
                              onClick={() => handlePredict(m.id)}
                              disabled={savingId === m.id || isSaved}
                              className={`text-[10px] font-condensed font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:active:scale-100 cursor-pointer ${
                                isSaved
                                  ? 'bg-mx/10 text-mx border border-mx/25 cursor-default'
                                  : 'bg-gold text-ink-950 hover:brightness-110 shadow-md shadow-gold/20 disabled:opacity-50'
                              }`}
                            >
                              {savingId === m.id ? '...' : isSaved ? 'Guardado ✓' : 'Guardar'}
                            </button>
                          )}
                        </div>

                        {prediction && (
                          <div className="relative z-10">
                            <MatchPrediction
                              prediction={prediction}
                              userPred={pred ? { home: pred.predicted_home, away: pred.predicted_away } : null}
                              homeTeam={m.home_team}
                              awayTeam={m.away_team}
                              form={{ home: formMap[m.home_team], away: formMap[m.away_team] }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
