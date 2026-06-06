import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import { calculateRoundOf32 } from '../utils/standings'

type Predictions = {
  round16: (string | null)[]
  quarter: (string | null)[]
  semi: (string | null)[]
  finalist: (string | null)[]
  champion: (string | null)[]
}

const R32_TO_R16_SLOT = [
  2,  // Match 73 -> R16 Match 90 home (slot 2)
  0,  // Match 74 -> R16 Match 89 home (slot 0)
  3,  // Match 75 -> R16 Match 90 away (slot 3)
  4,  // Match 76 -> R16 Match 91 home (slot 4)
  1,  // Match 77 -> R16 Match 89 away (slot 1)
  5,  // Match 78 -> R16 Match 91 away (slot 5)
  6,  // Match 79 -> R16 Match 92 home (slot 6)
  7,  // Match 80 -> R16 Match 92 away (slot 7)
  8,  // Match 81 -> R16 Match 93 home (slot 8)
  9,  // Match 82 -> R16 Match 93 away (slot 9)
  10, // Match 83 -> R16 Match 94 home (slot 10)
  11, // Match 84 -> R16 Match 94 away (slot 11)
  14, // Match 85 -> R16 Match 96 home (slot 14)
  12, // Match 86 -> R16 Match 95 home (slot 12)
  15, // Match 87 -> R16 Match 96 away (slot 15)
  13  // Match 88 -> R16 Match 95 away (slot 13)
]

function parseTeamName(prefixedName: string | null): string | null {
  if (!prefixedName) return null
  const parts = prefixedName.split(':')
  if (parts.length > 1 && !isNaN(Number(parts[0]))) {
    return parts.slice(1).join(':')
  }
  return prefixedName
}

function getPlaceholder(round: string, idx: number): string {
  if (round === 'round16') {
    const labels = [
      'Ganador M74', 'Ganador M77', // Match 89
      'Ganador M73', 'Ganador M75', // Match 90
      'Ganador M76', 'Ganador M78', // Match 91
      'Ganador M79', 'Ganador M80', // Match 92
      'Ganador M81', 'Ganador M82', // Match 93
      'Ganador M83', 'Ganador M84', // Match 94
      'Ganador M86', 'Ganador M88', // Match 95
      'Ganador M85', 'Ganador M87'  // Match 96
    ]
    return labels[idx] || '?'
  }
  if (round === 'quarter') {
    const labels = [
      'Ganador M89', 'Ganador M90', // Match 97
      'Ganador M91', 'Ganador M92', // Match 98
      'Ganador M93', 'Ganador M94', // Match 99
      'Ganador M95', 'Ganador M96'  // Match 100
    ]
    return labels[idx] || '?'
  }
  if (round === 'semi') {
    const labels = [
      'Ganador M97', 'Ganador M98', // Match 101
      'Ganador M99', 'Ganador M100' // Match 102
    ]
    return labels[idx] || '?'
  }
  if (round === 'finalist') {
    return idx === 0 ? 'Ganador M101' : 'Ganador M102'
  }
  return '?'
}

// ── Slot component ─────────────────────────────────────────────────────────────
function Slot({
  team, placeholder = '?', onClick, highlight = false, correct = false, wrong = false, size = 'sm'
}: {
  team: string | null
  placeholder?: string
  onClick?: () => void
  highlight?: boolean
  correct?: boolean
  wrong?: boolean
  size?: 'sm' | 'lg'
}) {
  const h = size === 'lg' ? 'h-10' : 'h-8'
  const w = size === 'lg' ? 'w-36' : 'w-32'
  const cls = correct
    ? 'bg-green-800/60 border-green-600 text-green-300'
    : wrong
    ? 'bg-gray-900/40 border-gray-700 text-gray-600 line-through'
    : highlight
    ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-300 font-bold shadow-[0_0_8px_rgba(250,204,21,0.15)]'
    : team
    ? 'bg-gray-800 border-gray-600 text-white hover:border-gray-400 cursor-pointer'
    : 'bg-gray-900 border-dashed border-gray-800 text-gray-500'

  return (
    <button
      onClick={onClick}
      disabled={!team}
      className={`${w} ${h} flex items-center gap-1.5 px-2 rounded border text-xs font-medium transition truncate ${cls}`}
    >
      {team ? (
        <><span className="text-base leading-none flex-shrink-0">{getFlag(team)}</span><span className="truncate">{team}</span></>
      ) : (
        <span className="text-gray-500 mx-auto text-[10px] uppercase font-bold tracking-wider">{placeholder}</span>
      )}
    </button>
  )
}

// ── Match component (2 slots + connector line) ─────────────────────────────────
function Match({
  top, bottom, topPlaceholder = '?', bottomPlaceholder = '?',
  isTopHighlighted = false, isBottomHighlighted = false,
  isTopCorrect = false, isBottomCorrect = false,
  isTopWrong = false, isBottomWrong = false,
  onTopClick, onBottomClick, linePos, connectRight = true, connectLeft = false
}: {
  top: string | null; bottom: string | null
  topPlaceholder?: string; bottomPlaceholder?: string
  isTopHighlighted?: boolean; isBottomHighlighted?: boolean
  isTopCorrect?: boolean; isBottomCorrect?: boolean
  isTopWrong?: boolean; isBottomWrong?: boolean
  onTopClick?: () => void; onBottomClick?: () => void
  linePos: 'top' | 'bottom' | 'center'; connectRight?: boolean; connectLeft?: boolean
}) {
  return (
    <div className="flex items-center">
      {connectLeft && (
        <div className="relative w-5 h-[66px]">
          {linePos === 'center' ? (
            <>
              <div className="absolute top-[33px] left-0 w-full border-b border-gray-700" />
              <div className="absolute top-[16px] bottom-[16px] left-0 border-l border-gray-700" />
            </>
          ) : linePos === 'top' ? (
            <>
              <div className="absolute top-[16px] left-0 w-full border-b border-gray-700" />
              <div className="absolute top-[16px] bottom-0 left-0 border-l border-gray-700" />
            </>
          ) : (
            <>
              <div className="absolute bottom-[16px] left-0 w-full border-b border-gray-700" />
              <div className="absolute top-0 bottom-[16px] left-0 border-l border-gray-700" />
            </>
          )}
        </div>
      )}
      <div className="flex flex-col">
        <Slot team={top} placeholder={topPlaceholder} highlight={isTopHighlighted} correct={isTopCorrect} wrong={isTopWrong} onClick={onTopClick} />
        <div className="h-px w-full bg-gray-800 my-0.5" />
        <Slot team={bottom} placeholder={bottomPlaceholder} highlight={isBottomHighlighted} correct={isBottomCorrect} wrong={isBottomWrong} onClick={onBottomClick} />
      </div>
      {connectRight && (
        <div className="relative w-5 h-[66px]">
          {linePos === 'center' ? (
            <>
              <div className="absolute top-[33px] right-0 w-full border-b border-gray-700" />
              <div className="absolute top-[16px] bottom-[16px] right-0 border-r border-gray-700" />
            </>
          ) : linePos === 'top' ? (
            <>
              <div className="absolute top-[16px] right-0 w-full border-b border-gray-700" />
              <div className="absolute top-[16px] bottom-0 right-0 border-r border-gray-700" />
            </>
          ) : (
            <>
              <div className="absolute bottom-[16px] right-0 w-full border-b border-gray-700" />
              <div className="absolute top-0 bottom-[16px] right-0 border-r border-gray-700" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Winner slot with left/right connector ─────────────────────────────────────────
function WinnerSlot({
  team, placeholder = '?', onClick, connectLeft = true, connectRight = false,
  highlight = false, correct = false, wrong = false
}: {
  team: string | null; placeholder?: string; onClick?: () => void
  connectLeft?: boolean; connectRight?: boolean
  highlight?: boolean; correct?: boolean; wrong?: boolean
}) {
  return (
    <div className="flex items-center">
      {connectLeft && <div className="w-5 border-b border-gray-700" />}
      <Slot team={team} placeholder={placeholder} onClick={onClick} highlight={highlight} correct={correct} wrong={wrong} />
      {connectRight && <div className="w-5 border-b border-gray-700" />}
    </div>
  )
}

// ── Main BracketPage ─────────────────────────────────────────────────────────────
export default function BracketPage() {
  const [predictions, setPredictions] = useState<Predictions>({
    round16: Array(16).fill(null),
    quarter: Array(8).fill(null),
    semi: Array(4).fill(null),
    finalist: Array(2).fill(null),
    champion: Array(1).fill(null),
  })
  const [results, setResults] = useState<Predictions>({
    round16: Array(16).fill(null),
    quarter: Array(8).fill(null),
    semi: Array(4).fill(null),
    finalist: Array(2).fill(null),
    champion: Array(1).fill(null),
  })
  const [r32Matchups, setR32Matchups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/bracket/my'),
      apiFetch('/bracket/results'),
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my')
    ])
      .then(([m, r, matchesData, groupPredsData]) => {
        // Load predictions
        const parsedPreds = {
          round16: Array(16).fill(null),
          quarter: Array(8).fill(null),
          semi: Array(4).fill(null),
          finalist: Array(2).fill(null),
          champion: Array(1).fill(null),
        }

        if (m?.predictions) {
          for (const round of ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const) {
            const list = m.predictions[round] || []
            for (const item of list) {
              const parts = item.split(':')
              if (parts.length > 1 && !isNaN(Number(parts[0]))) {
                const idx = Number(parts[0])
                const team = parts.slice(1).join(':')
                if (idx >= 0 && idx < parsedPreds[round].length) {
                  parsedPreds[round][idx] = team
                }
              } else {
                const idx = parsedPreds[round].indexOf(null)
                if (idx !== -1) {
                  parsedPreds[round][idx] = item
                }
              }
            }
          }
        }
        setPredictions(parsedPreds)

        // Load results
        const parsedResults = {
          round16: Array(16).fill(null),
          quarter: Array(8).fill(null),
          semi: Array(4).fill(null),
          finalist: Array(2).fill(null),
          champion: Array(1).fill(null),
        }

        if (r?.results) {
          for (const round of ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const) {
            const list = r.results[round] || []
            for (const item of list) {
              const parts = item.split(':')
              if (parts.length > 1 && !isNaN(Number(parts[0]))) {
                const idx = Number(parts[0])
                const team = parts.slice(1).join(':')
                if (idx >= 0 && idx < parsedResults[round].length) {
                  parsedResults[round][idx] = team
                }
              } else {
                const idx = parsedResults[round].indexOf(null)
                if (idx !== -1) {
                  parsedResults[round][idx] = item
                }
              }
            }
          }
        }
        setResults(parsedResults)

        // Compute R32 Matchups dynamically
        if (matchesData?.matches && groupPredsData?.predictions) {
          const groupStagePredsMap: Record<string, any> = {}
          for (const p of groupPredsData.predictions) {
            groupStagePredsMap[p.match_id] = p
          }
          const computedR32 = calculateRoundOf32(matchesData.matches, groupStagePredsMap)
          setR32Matchups(computedR32)
        }
      })
      .catch((err) => {
        toast.error('Error al cargar datos: ' + err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  function advanceTeam(fromRound: string, slotIdx: number, team: string | null) {
    if (!team) return

    setPredictions(prev => {
      const next = { ...prev }

      if (fromRound === 'round32') {
        const targetSlot = R32_TO_R16_SLOT[slotIdx]
        const oldTeam = next.round16[targetSlot]
        next.round16 = [...next.round16]
        next.round16[targetSlot] = team
        
        if (oldTeam && oldTeam !== team) {
          const roundKeys = ['quarter', 'semi', 'finalist', 'champion'] as const
          for (const round of roundKeys) {
            next[round] = next[round].map(t => (t === oldTeam ? null : t))
          }
        }
      } else if (fromRound === 'round16') {
        const targetSlot = Math.floor(slotIdx / 2)
        const oldTeam = next.quarter[targetSlot]
        next.quarter = [...next.quarter]
        next.quarter[targetSlot] = team
        
        if (oldTeam && oldTeam !== team) {
          const roundKeys = ['semi', 'finalist', 'champion'] as const
          for (const round of roundKeys) {
            next[round] = next[round].map(t => (t === oldTeam ? null : t))
          }
        }
      } else if (fromRound === 'quarter') {
        const targetSlot = Math.floor(slotIdx / 2)
        const oldTeam = next.semi[targetSlot]
        next.semi = [...next.semi]
        next.semi[targetSlot] = team
        
        if (oldTeam && oldTeam !== team) {
          const roundKeys = ['finalist', 'champion'] as const
          for (const round of roundKeys) {
            next[round] = next[round].map(t => (t === oldTeam ? null : t))
          }
        }
      } else if (fromRound === 'semi') {
        const targetSlot = Math.floor(slotIdx / 2)
        const oldTeam = next.finalist[targetSlot]
        next.finalist = [...next.finalist]
        next.finalist[targetSlot] = team
        
        if (oldTeam && oldTeam !== team) {
          const roundKeys = ['champion'] as const
          for (const round of roundKeys) {
            next[round] = next[round].map(t => (t === oldTeam ? null : t))
          }
        }
      } else if (fromRound === 'finalist') {
        next.champion = [team]
      }

      return next
    })
  }

  async function saveAll() {
    setSaving(true)
    try {
      const rounds = ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const
      await Promise.all(
        rounds.map(round => {
          const listToSave: string[] = []
          predictions[round].forEach((team, idx) => {
            if (team) {
              listToSave.push(`${idx}:${team}`)
            }
          })
          return apiFetch('/bracket/predict', {
            method: 'POST',
            body: JSON.stringify({ round, teams: listToSave }),
          })
        })
      )
      toast.success('Bracket guardado con éxito')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isCorrect = (round: string, idx: number, team: string | null) => {
    if (!team) return false
    const res = results[round as keyof Predictions]?.[idx]
    return res ? parseTeamName(res) === parseTeamName(team) : false
  }

  const isWrong = (round: string, idx: number, team: string | null) => {
    if (!team) return false
    const res = results[round as keyof Predictions]?.[idx]
    return res ? parseTeamName(res) !== parseTeamName(team) : false
  }

  // Column Matchup indices
  const r32L_Indices = [1, 4, 0, 2, 3, 5, 6, 7]
  const r16L_Indices = [0, 1, 2, 3]
  const qfL_Indices = [0, 1]

  const r32R_Indices = [8, 9, 10, 11, 13, 15, 12, 14]
  const r16R_Indices = [4, 5, 6, 7]
  const qfR_Indices = [2, 3]

  const sfL_top = predictions.semi[0]
  const sfL_bottom = predictions.semi[1]
  const isSfL_topSelected = !!sfL_top && predictions.finalist[0] === sfL_top
  const isSfL_bottomSelected = !!sfL_bottom && predictions.finalist[0] === sfL_bottom

  const finalistL = predictions.finalist[0]
  const isFinalistLSelected = !!finalistL && predictions.champion[0] === finalistL

  const champion = predictions.champion[0]

  const finalistR = predictions.finalist[1]
  const isFinalistRSelected = !!finalistR && predictions.champion[0] === finalistR

  const sfR_top = predictions.semi[2]
  const sfR_bottom = predictions.semi[3]
  const isSfR_topSelected = !!sfR_top && predictions.finalist[1] === sfR_top
  const isSfR_bottomSelected = !!sfR_bottom && predictions.finalist[1] === sfR_bottom

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
              Bracket de Eliminación
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Completa las eliminatorias desde los Dieciseisavos (Round of 32) hasta coronar al Campeón del Mundo.
            </p>
          </div>
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-yellow-400 text-gray-950 font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 active:scale-95 disabled:opacity-50 transition shadow-lg shadow-yellow-500/10 text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>

        {/* Legend */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 mb-6 text-xs text-gray-400 flex flex-wrap gap-4 justify-between items-center backdrop-blur-md">
          <div className="flex flex-wrap gap-4">
            <span>Puntos por acierto:</span>
            <span><span className="text-blue-400 font-bold">1 pt</span> · Octavos</span>
            <span><span className="text-purple-400 font-bold">2 pts</span> · Cuartos</span>
            <span><span className="text-orange-400 font-bold">4 pts</span> · Semifinales</span>
            <span><span className="text-yellow-400 font-bold">6 pts</span> · Finalista</span>
            <span><span className="text-yellow-400 font-bold">10 pts</span> · Campeón</span>
          </div>
          <div className="text-yellow-400/80 font-medium">
            * Haz click en un equipo para avanzarlo a la siguiente ronda
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto pb-6 border border-gray-900 rounded-2xl bg-gray-950/50 backdrop-blur-sm shadow-inner scrollbar-thin scrollbar-thumb-gray-800">
            <div className="inline-flex items-center gap-0 py-6 min-w-max px-6">
              
              {/* 1. R32 LEFT */}
              <div className="flex flex-col gap-4 py-0">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-2">Dieciseisavos (L)</p>
                {r32L_Indices.map((idx, index) => {
                  const match = r32Matchups[idx] || { home: null, away: null, label: `M${73 + idx}` }
                  const targetSlot = R32_TO_R16_SLOT[idx]
                  const isTopSelected = !!match.home && predictions.round16[targetSlot] === match.home
                  const isBottomSelected = !!match.away && predictions.round16[targetSlot] === match.away
                  return (
                    <div key={`r32l-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-1">{match.label || `M${73 + idx}`}</span>
                      <Match
                        top={match.home} bottom={match.away}
                        topPlaceholder="?" bottomPlaceholder="?"
                        isTopHighlighted={isTopSelected} isBottomHighlighted={isBottomSelected}
                        onTopClick={() => advanceTeam('round32', idx, match.home)}
                        onBottomClick={() => advanceTeam('round32', idx, match.away)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectRight={true} connectLeft={false}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 2. R16 LEFT */}
              <div className="flex flex-col gap-[98px] py-[41px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[47px]">Octavos (L)</p>
                {r16L_Indices.map((idx, index) => {
                  const top = predictions.round16[2 * idx]
                  const bottom = predictions.round16[2 * idx + 1]
                  const targetSlot = idx
                  const isTopSelected = !!top && predictions.quarter[targetSlot] === top
                  const isBottomSelected = !!bottom && predictions.quarter[targetSlot] === bottom
                  return (
                    <div key={`r16l-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M{89 + idx}</span>
                      <Match
                        top={top}
                        bottom={bottom}
                        topPlaceholder={getPlaceholder('round16', 2 * idx)}
                        bottomPlaceholder={getPlaceholder('round16', 2 * idx + 1)}
                        isTopHighlighted={isTopSelected}
                        isBottomHighlighted={isBottomSelected}
                        isTopCorrect={isCorrect('round16', 2 * idx, top)}
                        isBottomCorrect={isCorrect('round16', 2 * idx + 1, bottom)}
                        isTopWrong={isWrong('round16', 2 * idx, top)}
                        isBottomWrong={isWrong('round16', 2 * idx + 1, bottom)}
                        onTopClick={() => advanceTeam('round16', 2 * idx, top)}
                        onBottomClick={() => advanceTeam('round16', 2 * idx + 1, bottom)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectLeft={true} connectRight={true}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 3. QF LEFT */}
              <div className="flex flex-col gap-[262px] py-[123px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[129px]">Cuartos (L)</p>
                {qfL_Indices.map((idx, index) => {
                  const top = predictions.quarter[2 * idx]
                  const bottom = predictions.quarter[2 * idx + 1]
                  const targetSlot = idx
                  const isTopSelected = !!top && predictions.semi[targetSlot] === top
                  const isBottomSelected = !!bottom && predictions.semi[targetSlot] === bottom
                  return (
                    <div key={`qfl-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M{97 + idx}</span>
                      <Match
                        top={top}
                        bottom={bottom}
                        topPlaceholder={getPlaceholder('quarter', 2 * idx)}
                        bottomPlaceholder={getPlaceholder('quarter', 2 * idx + 1)}
                        isTopHighlighted={isTopSelected}
                        isBottomHighlighted={isBottomSelected}
                        isTopCorrect={isCorrect('quarter', 2 * idx, top)}
                        isBottomCorrect={isCorrect('quarter', 2 * idx + 1, bottom)}
                        isTopWrong={isWrong('quarter', 2 * idx, top)}
                        isBottomWrong={isWrong('quarter', 2 * idx + 1, bottom)}
                        onTopClick={() => advanceTeam('quarter', 2 * idx, top)}
                        onBottomClick={() => advanceTeam('quarter', 2 * idx + 1, bottom)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectLeft={true} connectRight={true}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 4. SEMIFINAL LEFT */}
              <div className="flex flex-col py-[287px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[293px]">Semifinal (L)</p>
                <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M101</span>
                <Match
                  top={sfL_top}
                  bottom={sfL_bottom}
                  topPlaceholder={getPlaceholder('semi', 0)}
                  bottomPlaceholder={getPlaceholder('semi', 1)}
                  isTopHighlighted={isSfL_topSelected}
                  isBottomHighlighted={isSfL_bottomSelected}
                  isTopCorrect={isCorrect('semi', 0, sfL_top)}
                  isBottomCorrect={isCorrect('semi', 1, sfL_bottom)}
                  isTopWrong={isWrong('semi', 0, sfL_top)}
                  isBottomWrong={isWrong('semi', 1, sfL_bottom)}
                  onTopClick={() => advanceTeam('semi', 0, sfL_top)}
                  onBottomClick={() => advanceTeam('semi', 1, sfL_bottom)}
                  linePos="center"
                  connectLeft={true} connectRight={true}
                />
              </div>

              {/* 5. FINALIST LEFT */}
              <div className="flex flex-col py-[304px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[310px]">Finalista (L)</p>
                <WinnerSlot
                  team={finalistL}
                  placeholder={getPlaceholder('finalist', 0)}
                  highlight={isFinalistLSelected}
                  correct={isCorrect('finalist', 0, finalistL)}
                  wrong={isWrong('finalist', 0, finalistL)}
                  connectLeft={true} connectRight={true}
                  onClick={() => advanceTeam('finalist', 0, finalistL)}
                />
              </div>

              {/* 6. CHAMPION CENTER */}
              <div className="flex flex-col items-center justify-center px-6 py-[280px]">
                <div className="flex flex-col items-center p-6 bg-gray-900/30 border border-gray-800/80 rounded-3xl backdrop-blur-md shadow-2xl">
                  <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-3">Campeón del Mundo</p>
                  <Slot
                    team={champion}
                    placeholder="CAMPEÓN"
                    size="lg"
                    correct={isCorrect('champion', 0, champion)}
                    wrong={isWrong('champion', 0, champion)}
                  />
                  {champion ? (
                    <div className="flex flex-col items-center mt-4 animate-bounce">
                      <p className="text-4xl">🏆</p>
                    </div>
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center mt-4 text-gray-700">
                      🏆
                    </div>
                  )}
                </div>
              </div>

              {/* 7. FINALIST RIGHT */}
              <div className="flex flex-col py-[304px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[310px]">Finalista (R)</p>
                <WinnerSlot
                  team={finalistR}
                  placeholder={getPlaceholder('finalist', 1)}
                  highlight={isFinalistRSelected}
                  correct={isCorrect('finalist', 1, finalistR)}
                  wrong={isWrong('finalist', 1, finalistR)}
                  connectLeft={true} connectRight={true}
                  onClick={() => advanceTeam('finalist', 1, finalistR)}
                />
              </div>

              {/* 8. SEMIFINAL RIGHT */}
              <div className="flex flex-col py-[287px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[293px]">Semifinal (R)</p>
                <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M102</span>
                <Match
                  top={sfR_top}
                  bottom={sfR_bottom}
                  topPlaceholder={getPlaceholder('semi', 2)}
                  bottomPlaceholder={getPlaceholder('semi', 3)}
                  isTopHighlighted={isSfR_topSelected}
                  isBottomHighlighted={isSfR_bottomSelected}
                  isTopCorrect={isCorrect('semi', 2, sfR_top)}
                  isBottomCorrect={isCorrect('semi', 3, sfR_bottom)}
                  isTopWrong={isWrong('semi', 2, sfR_top)}
                  isBottomWrong={isWrong('semi', 3, sfR_bottom)}
                  onTopClick={() => advanceTeam('semi', 2, sfR_top)}
                  onBottomClick={() => advanceTeam('semi', 3, sfR_bottom)}
                  linePos="center"
                  connectLeft={true} connectRight={true}
                />
              </div>

              {/* 9. QF RIGHT */}
              <div className="flex flex-col gap-[262px] py-[123px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[129px]">Cuartos (R)</p>
                {qfR_Indices.map((idx, index) => {
                  const top = predictions.quarter[2 * idx]
                  const bottom = predictions.quarter[2 * idx + 1]
                  const targetSlot = idx
                  const isTopSelected = !!top && predictions.semi[targetSlot] === top
                  const isBottomSelected = !!bottom && predictions.semi[targetSlot] === bottom
                  return (
                    <div key={`qfr-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M{97 + idx}</span>
                      <Match
                        top={top}
                        bottom={bottom}
                        topPlaceholder={getPlaceholder('quarter', 2 * idx)}
                        bottomPlaceholder={getPlaceholder('quarter', 2 * idx + 1)}
                        isTopHighlighted={isTopSelected}
                        isBottomHighlighted={isBottomSelected}
                        isTopCorrect={isCorrect('quarter', 2 * idx, top)}
                        isBottomCorrect={isCorrect('quarter', 2 * idx + 1, bottom)}
                        isTopWrong={isWrong('quarter', 2 * idx, top)}
                        isBottomWrong={isWrong('quarter', 2 * idx + 1, bottom)}
                        onTopClick={() => advanceTeam('quarter', 2 * idx, top)}
                        onBottomClick={() => advanceTeam('quarter', 2 * idx + 1, bottom)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectLeft={true} connectRight={true}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 10. R16 RIGHT */}
              <div className="flex flex-col gap-[98px] py-[41px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-[47px]">Octavos (R)</p>
                {r16R_Indices.map((idx, index) => {
                  const top = predictions.round16[2 * idx]
                  const bottom = predictions.round16[2 * idx + 1]
                  const targetSlot = idx
                  const isTopSelected = !!top && predictions.quarter[targetSlot] === top
                  const isBottomSelected = !!bottom && predictions.quarter[targetSlot] === bottom
                  return (
                    <div key={`r16r-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-6">M{89 + idx}</span>
                      <Match
                        top={top}
                        bottom={bottom}
                        topPlaceholder={getPlaceholder('round16', 2 * idx)}
                        bottomPlaceholder={getPlaceholder('round16', 2 * idx + 1)}
                        isTopHighlighted={isTopSelected}
                        isBottomHighlighted={isBottomSelected}
                        isTopCorrect={isCorrect('round16', 2 * idx, top)}
                        isBottomCorrect={isCorrect('round16', 2 * idx + 1, bottom)}
                        isTopWrong={isWrong('round16', 2 * idx, top)}
                        isBottomWrong={isWrong('round16', 2 * idx + 1, bottom)}
                        onTopClick={() => advanceTeam('round16', 2 * idx, top)}
                        onBottomClick={() => advanceTeam('round16', 2 * idx + 1, bottom)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectLeft={true} connectRight={true}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 11. R32 RIGHT */}
              <div className="flex flex-col gap-4 py-0">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider text-center mb-2">Dieciseisavos (R)</p>
                {r32R_Indices.map((idx, index) => {
                  const match = r32Matchups[idx] || { home: null, away: null, label: `M${73 + idx}` }
                  const targetSlot = R32_TO_R16_SLOT[idx]
                  const isTopSelected = !!match.home && predictions.round16[targetSlot] === match.home
                  const isBottomSelected = !!match.away && predictions.round16[targetSlot] === match.away
                  return (
                    <div key={`r32r-${idx}`} className="flex flex-col">
                      <span className="text-[9px] text-gray-600 font-bold mb-1 ml-1">{match.label || `M${73 + idx}`}</span>
                      <Match
                        top={match.home} bottom={match.away}
                        topPlaceholder="?" bottomPlaceholder="?"
                        isTopHighlighted={isTopSelected} isBottomHighlighted={isBottomSelected}
                        onTopClick={() => advanceTeam('round32', idx, match.home)}
                        onBottomClick={() => advanceTeam('round32', idx, match.away)}
                        linePos={index % 2 === 0 ? 'bottom' : 'top'}
                        connectLeft={true} connectRight={false}
                      />
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
