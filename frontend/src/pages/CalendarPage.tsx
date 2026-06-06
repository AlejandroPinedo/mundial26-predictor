import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  stage: string
  group_name: string
  home_score: number | null
  away_score: number | null
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

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const getFullDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  // Get distinct dates represented in matches (YYYY-MM-DD)
  const distinctDates = [...new Set(matches.map((m) => m.match_date.split('T')[0]))].sort()

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    const mDate = m.match_date.split('T')[0]
    
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
    const mDate = m.match_date.split('T')[0]
    if (!matchesByDate[mDate]) matchesByDate[mDate] = []
    matchesByDate[mDate].push(m)
  }

  const sortedFilteredDates = Object.keys(matchesByDate).sort()

  // Total predicted stats
  const totalMatchesCount = matches.length
  const predictedCount = Object.keys(predictions).length
  const completionPercent = totalMatchesCount > 0 ? Math.round((predictedCount / totalMatchesCount) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 pb-24">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
              Calendario de Partidos 📅
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Fixture oficial del Mundial 2026. Gestiona tus predicciones e infórmate de los resultados en tiempo real.
            </p>
          </div>
          
          {/* Progress Tracker Card */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md self-start md:self-auto min-w-[240px]">
            <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-yellow-400 transition-all duration-500"
                  strokeWidth="3"
                  strokeDasharray={`${completionPercent}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="text-xs font-black text-yellow-400">{completionPercent}%</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider leading-none">Tu Progreso</p>
              <p className="text-lg font-black text-white leading-none mt-1">
                {predictedCount} <span className="text-xs text-gray-500 font-normal">/ {totalMatchesCount} predecidos</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-2xl p-4 mb-6 backdrop-blur-md flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Buscar equipo, sede o fase..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-yellow-400/50 transition text-white placeholder-gray-600"
              />
            </div>

            {/* Stage Selector */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-yellow-400/50 transition text-white"
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
                className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-yellow-400/50 transition text-white"
              >
                <option value="all">Estado: Todos</option>
                <option value="predicted">Predecidos por mí</option>
                <option value="unpredicted">Pendientes por predecir</option>
                <option value="played">Finalizados</option>
              </select>
            </div>

          </div>

          {/* Quick Date Selector Slider */}
          <div className="border-t border-gray-800/60 pt-3">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Filtrar por fecha</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800">
              <button
                onClick={() => setSelectedDate('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedDate === 'all'
                    ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                    : 'bg-gray-950 border border-gray-800 text-gray-400 hover:text-white'
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                        : 'bg-gray-950 border border-gray-800 text-gray-400 hover:text-white'
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
          <div className="bg-gray-900/20 border border-gray-850 rounded-3xl p-12 text-center max-w-md mx-auto mt-8">
            <p className="text-4xl mb-4 no-invert">🔍</p>
            <h3 className="text-white font-bold text-lg mb-1">No se encontraron partidos</h3>
            <p className="text-gray-500 text-sm">
              Intenta cambiar los filtros de búsqueda, fase o fecha para encontrar lo que buscas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sortedFilteredDates.map((dateStr) => {
              const dateMatches = matchesByDate[dateStr]
              return (
                <div key={dateStr} className="flex flex-col gap-3">
                  {/* Sticky Date Title */}
                  <div className="sticky top-0 z-10 py-2 bg-gray-950/80 backdrop-blur-md border-b border-gray-900/60 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                      {getFullDateLabel(dateStr)}
                    </h2>
                    <span className="text-xs text-gray-500 font-bold">
                      {dateMatches.length} {dateMatches.length === 1 ? 'partido' : 'partidos'}
                    </span>
                  </div>

                  {/* Grid of Match Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateMatches.map((m) => {
                      const pred = predictions[m.id]
                      const input = inputs[m.id] || { home: '', away: '' }
                      const kickoff = new Date(m.match_date)
                      const isLocked = now > kickoff || m.home_score !== null
                      const isSaved = pred !== undefined && String(pred.predicted_home) === input.home && String(pred.predicted_away) === input.away

                      // Points display
                      const pts = pred?.points ?? 0

                      return (
                        <div
                          key={m.id}
                          className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4 shadow-lg hover:border-gray-700/60 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm relative"
                        >
                          {/* Card Top Information */}
                          <div className="flex justify-between items-center mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider select-none">
                            <span>
                              Partido #{m.id.split('-')[1] || m.id} · {m.group_name ? `Grupo ${m.group_name}` : m.stage}
                            </span>
                            <span className="text-yellow-400 font-semibold bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-400/10">
                              {formatTimeLabel(m.match_date)}
                            </span>
                          </div>

                          {/* Teams Score / Prediction Row */}
                          <div className="flex items-center justify-between gap-4 py-2">
                            {/* Home Team */}
                            <div className="flex-1 flex flex-col items-center gap-1 text-center min-w-0">
                              <span className="text-3xl no-invert leading-none mb-1">{getFlag(m.home_team)}</span>
                              <span className="text-xs font-semibold text-white truncate w-full">{m.home_team}</span>
                            </div>

                            {/* Center Score / Inputs */}
                            <div className="flex items-center gap-2">
                              {isLocked ? (
                                /* Locked view (official result & predicted score side by side) */
                                <div className="flex flex-col items-center gap-1 select-none">
                                  {m.home_score !== null ? (
                                    /* Actual Match Result */
                                    <div className="flex items-center gap-1.5 text-base font-black text-white">
                                      <span>{m.home_score}</span>
                                      <span className="text-gray-600 text-xs font-normal">-</span>
                                      <span>{m.away_score}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                                      Jugando
                                    </span>
                                  )}
                                  {pred ? (
                                    /* Prediction result */
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-950 border border-gray-850 px-2 py-0.5 rounded-full mt-1">
                                      <span>Pred:</span>
                                      <span className="font-bold text-gray-400">
                                        {pred.predicted_home} - {pred.predicted_away}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-gray-600 italic mt-1">Sin pred.</span>
                                  )}
                                </div>
                              ) : (
                                /* Future match / Editable fields */
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={input.home}
                                    placeholder="-"
                                    onChange={(e) => handleInputChange(m.id, 'home', e.target.value)}
                                    className="w-10 h-10 bg-gray-950 border border-gray-850 focus:border-yellow-400/50 rounded-xl text-center font-black text-sm focus:outline-none text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="text-gray-600 font-bold select-none">-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={input.away}
                                    placeholder="-"
                                    onChange={(e) => handleInputChange(m.id, 'away', e.target.value)}
                                    className="w-10 h-10 bg-gray-950 border border-gray-850 focus:border-yellow-400/50 rounded-xl text-center font-black text-sm focus:outline-none text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 flex flex-col items-center gap-1 text-center min-w-0">
                              <span className="text-3xl no-invert leading-none mb-1">{getFlag(m.away_team)}</span>
                              <span className="text-xs font-semibold text-white truncate w-full">{m.away_team}</span>
                            </div>
                          </div>

                          {/* Footer action bar */}
                          <div className="border-t border-gray-800/40 mt-3 pt-3 flex justify-between items-center h-8">
                            {/* Left area: Points earned or locking warning */}
                            <div>
                              {m.home_score !== null && pred ? (
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  pts > 0 ? 'bg-green-500/15 text-green-400' : 'bg-gray-800 text-gray-500'
                                }`}>
                                  {pts > 0 ? `+${pts} PTS` : '0 PTS'}
                                </span>
                              ) : !isLocked ? (
                                /* Deadline warning if under 24 hours */
                                (() => {
                                  const warn = (kickoff.getTime() - now.getTime()) / (1000 * 60 * 60) < 24
                                  return warn ? (
                                    <span className="text-[9px] text-orange-400 bg-orange-400/5 border border-orange-400/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
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
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:active:scale-100 ${
                                  isSaved
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/25 cursor-default'
                                    : 'bg-yellow-400 text-gray-950 hover:bg-yellow-300 disabled:opacity-50'
                                }`}
                              >
                                {savingId === m.id ? '...' : isSaved ? 'Guardado ✓' : 'Guardar'}
                              </button>
                            )}
                          </div>
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
    </div>
  )
}
