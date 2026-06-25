import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import Flag from '../components/Flag'
import { calculateRoundOf32 } from '../utils/standings'
import { R32_TO_R16_SLOT, parseTeamName } from '../utils/bracketStructure'
import { currentElo } from '../predict/elo'
import { autoFillFavorites, tieOdds } from '../utils/bracketAuto'
import { useSimulationWorker } from '../hooks/useSimulationWorker'
import type { ApiMatch, SimConfig } from '../sim/tournament'
import type { TeamProbabilities } from '../sim/aggregate'
import { toPng } from 'html-to-image'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import type { BracketScores, MatchScore } from '../types/bracket'
import MatchScoreInput from '../components/MatchScoreInput'

type Predictions = {
  round16: (string | null)[]
  quarter: (string | null)[]
  semi: (string | null)[]
  finalist: (string | null)[]
  champion: (string | null)[]
}

// Número de partido oficial de cada octavo por su índice de render (0–7).
// No es 89+idx: el cableado oficial pone M93/M94 en la mitad izq (idx 2,3) y
// M91/M92 en la der (idx 4,5). Ver R32_TO_R16_SLOT.
const R16_MATCH_LABELS = ['M89', 'M90', 'M93', 'M94', 'M91', 'M92', 'M95', 'M96']

function getPlaceholder(round: string, idx: number): string {
  if (round === 'round16') {
    // Por slot de octavos (0–15). Slots 4–7 = M93/M94 (mitad izq) y 8–11 = M91/M92
    // (mitad der), según el cableado oficial. Ver R32_TO_R16_SLOT.
    const labels = [
      'Ganador M74', 'Ganador M77', // M89 (slots 0,1)
      'Ganador M73', 'Ganador M75', // M90 (slots 2,3)
      'Ganador M81', 'Ganador M82', // M93 (slots 4,5)
      'Ganador M83', 'Ganador M84', // M94 (slots 6,7)
      'Ganador M76', 'Ganador M78', // M91 (slots 8,9)
      'Ganador M79', 'Ganador M80', // M92 (slots 10,11)
      'Ganador M86', 'Ganador M88', // M95 (slots 12,13)
      'Ganador M85', 'Ganador M87'  // M96 (slots 14,15)
    ]
    return labels[idx] || '?'
  }
  if (round === 'quarter') {
    // Por slot de cuartos (0–7). QF M98 lo alimentan M93/M94; QF M99, M91/M92.
    const labels = [
      'Ganador M89', 'Ganador M90', // QF M97
      'Ganador M93', 'Ganador M94', // QF M98
      'Ganador M91', 'Ganador M92', // QF M99
      'Ganador M95', 'Ganador M96'  // QF M100
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
  team, placeholder = '?', onClick, highlight = false, correct = false, wrong = false, size = 'sm', prob
}: {
  team: string | null
  placeholder?: string
  onClick?: () => void
  highlight?: boolean
  correct?: boolean
  wrong?: boolean
  size?: 'sm' | 'lg'
  /** Probabilidad (0–1) de que ESTE equipo avance la llave, según el modelo. */
  prob?: number
}) {
  const h = size === 'lg' ? 'h-10' : 'h-8'
  const w = size === 'lg' ? 'w-36' : 'w-full'
  
  const cursorClass = onClick && team ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'

  const cls = correct
    ? 'bg-mx/10 text-mx font-bold border border-mx/30'
    : wrong
    ? 'bg-ca/5 text-gray-500 line-through border border-ca/15 opacity-60'
    : highlight
    ? 'bg-gold/10 text-gold font-bold border border-gold/40 border-l-2 border-l-gold shadow-[0_0_14px_-4px_rgba(255,195,0,0.35)]'
    : team
    ? 'bg-white/4 hover:bg-white/8 text-gray-300 font-medium border border-white/5 hover:border-gold/25'
    : 'bg-transparent border border-dashed border-white/10 text-gray-600 font-bold'

  return (
    <button
      onClick={onClick}
      disabled={!team || !onClick}
      className={`${w} ${h} flex items-center gap-1.5 px-2.5 rounded-xl text-[11px] transition-all duration-200 truncate ${cursorClass} ${cls}`}
    >
      {team ? (
        <>
          <Flag team={team} className="h-3 flex-shrink-0" />
          <span className="truncate flex-1 text-left uppercase font-condensed font-semibold tracking-wide">{team}</span>
          {prob != null && (
            <span
              className={`text-[9px] tabular-nums select-none ml-auto ${prob >= 0.5 ? 'text-gold font-bold' : 'text-gray-500'}`}
              title="Probabilidad de que este equipo avance la llave (modelo Elo)"
            >
              {Math.round(prob * 100)}%
            </span>
          )}
          {highlight && <span className={`text-[10px] text-gold select-none ${prob != null ? 'ml-1' : 'ml-auto'}`}>✓</span>}
        </>
      ) : (
        <span className="text-gray-600 mx-auto text-[8px] uppercase font-condensed font-extrabold tracking-widest">{placeholder}</span>
      )}
    </button>
  )
}

function Match({
  top, bottom, topPlaceholder = '?', bottomPlaceholder = '?',
  isTopHighlighted = false, isBottomHighlighted = false,
  isTopCorrect = false, isBottomCorrect = false,
  isTopWrong = false, isBottomWrong = false,
  onTopClick, onBottomClick, linePos, connectRight = true, connectLeft = false,
  round, label, side = 'left', elo
}: {
  top: string | null; bottom: string | null
  topPlaceholder?: string; bottomPlaceholder?: string
  isTopHighlighted?: boolean; isBottomHighlighted?: boolean
  isTopCorrect?: boolean; isBottomCorrect?: boolean
  isTopWrong?: boolean; isBottomWrong?: boolean
  onTopClick?: () => void; onBottomClick?: () => void
  linePos: 'top' | 'bottom' | 'center'; connectRight?: boolean; connectLeft?: boolean
  round: 'round32' | 'round16' | 'quarter' | 'semi'
  label: string
  side?: 'left' | 'right'
  elo?: Record<string, number>
}) {
  // Probabilidad de avanzar de CADA equipo según el modelo (Elo+Poisson). Se muestran
  // ambas (suman 100%) y se resalta al favorito → fácil de leer: el número grande gana.
  const odds = elo && top && bottom ? tieOdds(top, bottom, elo) : null
  const topProb = odds ? (odds.favorite === top ? odds.favPct : 1 - odds.favPct) : undefined
  const bottomProb = odds ? (odds.favorite === bottom ? odds.favPct : 1 - odds.favPct) : undefined
  let ext = 0
  if (round === 'round32') ext = 32.5
  else if (round === 'round16') ext = 85.5
  else if (round === 'quarter') ext = 191.5

  const isAnyHighlighted = isTopHighlighted || isBottomHighlighted
  const isAnyCorrect = isTopCorrect || isBottomCorrect
  const isAnyWrong = isTopWrong || isBottomWrong

  const lineColor = isAnyCorrect
    ? 'border-mx/40'
    : isAnyHighlighted
    ? 'border-gold/40'
    : isAnyWrong
    ? 'border-white/10'
    : 'border-white/10'

  const renderStub = (borderSide: 'left' | 'right') => {
    const borderClass = borderSide === 'left' ? 'left-0 border-l' : 'right-0 border-r'
    return (
      <div className="relative w-4 h-[90px] flex-shrink-0">
        {/* Center line */}
        <div className={`absolute top-[45px] left-0 w-full border-b ${lineColor}`} />
        {/* Top slot line */}
        <div className={`absolute top-[24.5px] left-0 w-full border-b ${lineColor}`} />
        {/* Bottom slot line */}
        <div className={`absolute bottom-[24.5px] left-0 w-full border-b ${lineColor}`} />
        {/* Vertical connector */}
        <div className={`absolute top-[24.5px] bottom-[24.5px] ${lineColor} ${borderClass}`} />
      </div>
    )
  }

  const renderStep = (borderSide: 'left' | 'right') => {
    const borderClass = borderSide === 'left' ? 'left-0 border-l' : 'right-0 border-r'
    if (linePos === 'center') {
      return (
        <div className="relative w-4 h-[90px] flex-shrink-0">
          <div className={`absolute top-[45px] left-0 w-full border-b ${lineColor}`} />
        </div>
      )
    }

    const isTop = linePos === 'top'
    const topVal = isTop ? 45 - ext : 45
    const heightVal = ext

    return (
      <div className="relative w-4 h-[90px] flex-shrink-0">
        {/* Horizontal line from card center */}
        <div className={`absolute top-[45px] left-0 w-full border-b ${lineColor}`} />
        {/* Vertical step line */}
        <div
          className={`absolute ${lineColor} ${borderClass}`}
          style={{ top: `${topVal}px`, height: `${heightVal}px` }}
        />
      </div>
    )
  }

  const matchBoxBorder = isAnyCorrect
    ? 'border-mx/30 shadow-mx/5'
    : isAnyHighlighted
    ? 'border-gold/30 shadow-gold/10'
    : isAnyWrong
    ? 'border-ca/10'
    : 'border-white/8'

  return (
    <div className="flex items-center">
      {side === 'left' ? (
        <>
          {connectLeft && renderStub('left')}
          
          <div className={`relative w-36 h-[90px] bg-panel border rounded-2xl p-1 shadow-lg hover:border-gold/30 hover:bg-panel-2 transition-all duration-200 flex flex-col justify-center gap-1 ${matchBoxBorder}`}>
            <div className="absolute -top-2.5 left-2.5 px-1.5 py-0.5 bg-ink-950 border border-white/10 text-[8px] text-gray-500 font-condensed font-extrabold rounded uppercase tracking-wider leading-none select-none">
              {label}
            </div>
            <Slot team={top} placeholder={topPlaceholder} highlight={isTopHighlighted} correct={isTopCorrect} wrong={isTopWrong} onClick={onTopClick} prob={topProb} />
            <div className="h-px bg-white/5 mx-1.5" />
            <Slot team={bottom} placeholder={bottomPlaceholder} highlight={isBottomHighlighted} correct={isBottomCorrect} wrong={isBottomWrong} onClick={onBottomClick} prob={bottomProb} />
          </div>
          
          {connectRight && renderStep('right')}
        </>
      ) : (
        <>
          {connectLeft && renderStep('left')}
          
          <div className={`relative w-36 h-[90px] bg-panel border rounded-2xl p-1 shadow-lg hover:border-gold/30 hover:bg-panel-2 transition-all duration-200 flex flex-col justify-center gap-1 ${matchBoxBorder}`}>
            <div className="absolute -top-2.5 left-2.5 px-1.5 py-0.5 bg-ink-950 border border-white/10 text-[8px] text-gray-500 font-condensed font-extrabold rounded uppercase tracking-wider leading-none select-none">
              {label}
            </div>
            <Slot team={top} placeholder={topPlaceholder} highlight={isTopHighlighted} correct={isTopCorrect} wrong={isTopWrong} onClick={onTopClick} prob={topProb} />
            <div className="h-px bg-white/5 mx-1.5" />
            <Slot team={bottom} placeholder={bottomPlaceholder} highlight={isBottomHighlighted} correct={isBottomCorrect} wrong={isBottomWrong} onClick={onBottomClick} prob={bottomProb} />
          </div>
          
          {connectRight && renderStub('right')}
        </>
      )}
    </div>
  )
}

function WinnerSlot({
  team, placeholder = '?', onClick, connectLeft = true, connectRight = false,
  highlight = false, correct = false, wrong = false
}: {
  team: string | null; placeholder?: string; onClick?: () => void
  connectLeft?: boolean; connectRight?: boolean
  highlight?: boolean; correct?: boolean; wrong?: boolean
}) {
  const lineColor = correct
    ? 'border-mx/40'
    : highlight
    ? 'border-gold/40'
    : wrong
    ? 'border-white/10'
    : 'border-white/10'

  const cardBorder = correct
    ? 'border-mx/30 shadow-mx/5'
    : highlight
    ? 'border-gold/30 shadow-gold/10'
    : wrong
    ? 'border-ca/10'
    : 'border-white/8 hover:border-gold/25'

  return (
    <div className="flex items-center">
      {connectLeft && <div className={`w-4 border-b ${lineColor}`} />}
      <div className={`w-32 bg-panel border rounded-xl p-1 shadow-lg hover:bg-panel-2 transition-all duration-200 ${cardBorder}`}>
        <Slot team={team} placeholder={placeholder} onClick={onClick} highlight={highlight} correct={correct} wrong={wrong} />
      </div>
      {connectRight && <div className={`w-4 border-b ${lineColor}`} />}
    </div>
  )
}

// ── Comparación con el bracket del Pez Oráculo ─────────────────────────────────
const ORACLE_ROUNDS: [keyof Predictions, string, number][] = [
  ['round16', 'Octavos', 16],
  ['quarter', 'Cuartos', 8],
  ['semi', 'Semis', 4],
  ['finalist', 'Final', 2],
]
function OracleCompare({ predictions, oracle }: { predictions: Predictions; oracle: Record<string, string[]> }) {
  const overlap = (round: keyof Predictions) => {
    const oset = new Set((oracle[round] ?? []).map(t => parseTeamName(t)))
    return predictions[round].filter(Boolean).map(t => parseTeamName(t)).filter(t => oset.has(t)).length
  }
  const myChamp = parseTeamName(predictions.champion[0])
  const orChamp = parseTeamName(oracle.champion?.[0] ?? null)
  const champMatch = !!myChamp && myChamp === orChamp
  return (
    <div className="glass rounded-2xl p-4 md:p-5 mb-8 fade-up-1">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="fish" size={18} className="text-mx" />
        <h3 className="font-display text-sm uppercase tracking-wide text-white">Tú vs el Pez Oráculo</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {ORACLE_ROUNDS.map(([key, label, slots]) => (
          <span key={key} className="chip text-gray-300">
            {label} <b className="text-mx ml-1">{overlap(key)}</b><span className="text-gray-500">/{slots}</span>
          </span>
        ))}
        <span className="chip text-gray-300 border-gold/30 bg-gold/5">
          Campeón:
          {orChamp ? (
            <span className={`ml-1 inline-flex items-center gap-1 ${champMatch ? 'text-mx' : 'text-gray-300'}`}>
              <Flag team={orChamp} className="h-3" />{orChamp}{champMatch && ' ✓'}
            </span>
          ) : <span className="text-gray-500 ml-1">—</span>}
          {!champMatch && myChamp && <span className="text-gray-500 ml-1">· tú: {myChamp}</span>}
        </span>
      </div>
      <p className="text-[10px] text-gray-500 mt-3">
        Equipos en común por ronda entre tu bracket y el pronóstico congelado del Oráculo (modelo Elo).
      </p>
    </div>
  )
}

// ── Favoritos al título (probabilidades Monte Carlo) ───────────────────────────
function TitleOdds({ teams }: { teams: TeamProbabilities[] }) {
  const top = teams.slice(0, 10)
  const pct = (p: number) => `${(p * 100).toFixed(1)}%`
  const maxChamp = Math.max(...top.map(t => t.champion), 0.01)
  return (
    <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden mb-8 fade-up-1">
      <div className="tri-stripe" />
      <div className="p-5">
        <h3 className="font-display text-sm uppercase tracking-wide text-white flex items-center gap-2 mb-4">
          <Icon name="trophy" size={18} className="text-gold" /> Favoritos al título
          <span className="chip text-gray-400 ml-auto">Monte Carlo · 20k sims</span>
        </h3>
        <div className="space-y-2.5">
          {top.map((t, i) => (
            <div key={t.team} className="flex items-center gap-3 text-sm">
              <span className={`font-display text-xs w-5 text-center flex-shrink-0 ${i === 0 ? 'text-gold' : 'text-gray-600'}`}>{i + 1}</span>
              <Flag team={t.team} className="h-4 flex-shrink-0" />
              <span className="font-condensed font-bold uppercase tracking-wide text-white truncate w-24 sm:w-28 flex-shrink-0">{t.team}</span>
              <div className="flex-1 bg-ink-950 h-2.5 rounded-full overflow-hidden border border-white/5 min-w-0">
                <div className="h-full rounded-full bg-gradient-to-r from-mx to-gold transition-all duration-500" style={{ width: `${(t.champion / maxChamp) * 100}%` }} />
              </div>
              <span className="font-display text-sm text-gold w-14 text-right flex-shrink-0">{pct(t.champion)}</span>
              <span className="font-sans text-[10px] text-gray-500 w-20 text-right hidden sm:block">final {pct(t.final)}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 border-t border-white/8 pt-3 mt-4">
          Probabilidad de ser campeón según simulación Monte Carlo (Elo base, sede neutral). La barra es relativa al favorito.
        </p>
      </div>
    </div>
  )
}

// ── Main BracketPage ─────────────────────────────────────────────────────────────
export default function BracketPage() {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape proviene de calculateRoundOf32 (pre-existente)
  const [r32Matchups, setR32Matchups] = useState<any[]>([])
  const [elo, setElo] = useState<Record<string, number>>({})
  const [oracleBracket, setOracleBracket] = useState<Record<string, string[]> | null>(null)
  const [showOracle, setShowOracle] = useState(false)
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  // Simulación Monte Carlo (favoritos al título). Corre bajo demanda en un worker.
  const { run: runSim, running: simRunning, progress: simProgress, results: simResults } = useSimulationWorker()

  // Mismos controles que el Simulador (SimulatorPage): iteraciones, sorpresa, peso de
  // plantilla, ventaja de anfitrión y momentum.
  const [simIterations, setSimIterations] = useState(5000)
  const [simSurprise, setSimSurprise] = useState(25)
  const [simSquadWeight, setSimSquadWeight] = useState(30)
  const [simHostBoost, setSimHostBoost] = useState(true)
  const [simMomentum, setSimMomentum] = useState(true)
  const simConfig: SimConfig = {
    iterations: simIterations, surprise: simSurprise, squadWeight: simSquadWeight,
    hostBoost: simHostBoost, momentum: simMomentum, seed: 20260611,
  }
  const ITER_OPTS = [2000, 5000, 20000]
  const [saving, setSaving] = useState(false)
  const [bracketLocked, setBracketLocked] = useState(false)
  const [bracketDeadline, setBracketDeadline] = useState<Date | null>(null)
  const [scores, setScores] = useState<BracketScores>({})
  const [activeMatchKey, setActiveMatchKey] = useState<string | null>(null)
  const [shootoutBonus, setShootoutBonus] = useState(0)

  function getScore(round: string, matchIndex: number): MatchScore {
    return scores[`${round}_${matchIndex}`] ?? { home: null, away: null, homePen: null, awayPen: null }
  }

  function handleScoreChange(
    round: string,
    matchIndex: number,
    slotIdx: number,
    homeTeam: string | null,
    awayTeam: string | null,
    update: Partial<MatchScore>
  ) {
    const key = `${round}_${matchIndex}`
    const current = scores[key] ?? { home: 0, away: 0, homePen: null, awayPen: null }
    const s = { ...current, ...update }
    setScores(prev => ({ ...prev, [key]: s }))

    if (!homeTeam || !awayTeam) return

    const h = s.home ?? 0
    const a = s.away ?? 0

    if (h > a) {
      advanceTeam(round, slotIdx, homeTeam)
    } else if (a > h) {
      advanceTeam(round, slotIdx, awayTeam)
    } else {
      // Draw — check penalties
      if (s.homePen !== null && s.awayPen !== null && s.homePen !== s.awayPen) {
        advanceTeam(round, slotIdx, s.homePen > s.awayPen ? homeTeam : awayTeam)
      }
      // Equal penalties: don't advance yet
    }
  }

  const exportBracket = async () => {
    const el = document.getElementById('bracket-grid')
    if (!el) {
      toast.error('No se encontró el contenedor del bracket')
      return
    }
    setExporting(true)
    const loadToast = toast.loading('Generando imagen del bracket...')
    try {
      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: '#07060E', // bg-ink-950
        style: {
          transform: 'scale(1)',
          borderRadius: '0px',
        }
      })
      
      const link = document.createElement('a')
      link.download = `bracket-${user?.username || 'mundial26'}.png`
      link.href = dataUrl
      link.click()
      
      toast.dismiss(loadToast)
      toast.success('¡Bracket descargado con éxito! 📸')
    } catch (err) {
      console.error('Error generating image:', err)
      toast.dismiss(loadToast)
      toast.error('Error al generar la imagen del bracket')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    Promise.all([
      apiFetch('/bracket/my'),
      apiFetch('/bracket/results'),
      apiFetch('/predictions/matches'),
      apiFetch('/predictions/my'),
      apiFetch('/bracket/oracle').catch(() => ({ oracle: null })),
      apiFetch('/bracket/deadline').catch(() => ({ locked: false, deadline: null }))
    ])
      .then(([m, r, matchesData, groupPredsData, oracleData, deadlineData]) => {
        if (oracleData?.oracle) setOracleBracket(oracleData.oracle)
        setBracketLocked(!!deadlineData?.locked)
        if (deadlineData?.deadline) setBracketDeadline(new Date(deadlineData.deadline))
        if (typeof m?.shootoutBonus === 'number') setShootoutBonus(m.shootoutBonus)
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

        if (m.scores) setScores(m.scores as BracketScores)

        // Compute R32 Matchups dynamically
        if (matchesData?.matches && groupPredsData?.predictions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape de predicción pre-existente
          const groupStagePredsMap: Record<string, any> = {}
          for (const p of groupPredsData.predictions) {
            groupStagePredsMap[p.match_id] = p
          }
          const computedR32 = calculateRoundOf32(matchesData.matches, groupStagePredsMap)
          setR32Matchups(computedR32)
        }
        // Elo vigente (snapshot + resultados ya jugados) para favoritos/autocompletado.
        if (matchesData?.matches) {
          setElo(currentElo(matchesData.matches))
          setMatches(matchesData.matches as ApiMatch[])
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
    if (bracketLocked) return
    setSaving(true)
    try {
      // Validate penalties
      for (const [, s] of Object.entries(scores)) {
        if (s.home !== null && s.away !== null && s.home === s.away) {
          if (s.homePen !== null && s.awayPen !== null && s.homePen === s.awayPen) {
            toast.error('Los penales no pueden ser iguales en un empate')
            setSaving(false)
            return
          }
        }
      }

      const rounds = ['round16', 'quarter', 'semi', 'finalist', 'champion'] as const
      await Promise.all(
        rounds.map(round => {
          const teams = predictions[round as keyof typeof predictions].filter((team): team is string => !!team)

          // Build scores payload
          const matchCount = Math.ceil(teams.length / 2)
          const scorePayload = []
          for (let i = 0; i < matchCount; i++) {
            const s = scores[`${round}_${i}`]
            if (s && s.home !== null && s.away !== null) {
              scorePayload.push({
                matchIndex: i,
                home: s.home,
                away: s.away,
                homePen: s.home === s.away ? (s.homePen ?? null) : null,
                awayPen: s.home === s.away ? (s.awayPen ?? null) : null,
              })
            }
          }

          return apiFetch('/bracket/predict', {
            method: 'POST',
            body: JSON.stringify({ round, teams, scores: scorePayload }),
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

  function autoFill() {
    if (!r32Matchups.length) {
      toast.error('Aún no hay cruces de 16avos para autocompletar')
      return
    }
    setPredictions(autoFillFavorites(r32Matchups, elo))
    toast.success('Bracket autocompletado con el favorito de cada cruce (modelo Elo)')
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
  // Columna izquierda = mitad de la semi M101 (slots 0–7); derecha = M102 (slots 8–15).
  // El grupo de M76 (idx 3,5,6,7) va a la DERECHA y el de M81 (idx 8,9,10,11) a la
  // IZQUIERDA, según el cableado oficial (cuartos no adyacentes). Ver R32_TO_R16_SLOT.
  const r32L_Indices = [1, 4, 0, 2, 8, 9, 10, 11]
  const r16L_Indices = [0, 1, 2, 3]
  const qfL_Indices = [0, 1]

  const r32R_Indices = [3, 5, 6, 7, 13, 15, 12, 14]
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
    <div className="min-h-screen text-white">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-8 py-6 pb-20">

        <PageHeader title="BRACKET PLAYOFFS" subtitle="Ronda de 32 → Campeón · Copa Mundial 2026" icon="🏆" badge="FIFA WC26" action={
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={autoFill}
              disabled={loading || !r32Matchups.length}
              className="btn-ghost text-xs"
              title="Rellena el bracket con el favorito de cada cruce según el modelo (Elo)"
            >
              <Icon name="zap" size={15} />
              Autocompletar
            </button>
            <button
              onClick={exportBracket}
              disabled={exporting || loading}
              className="btn-ghost text-xs"
              id="export-bracket-btn"
            >
              <Icon name="download" size={15} />
              Descargar Bracket
            </button>
            {bracketLocked ? (
              <span className="chip border-red-500/30 bg-red-500/10 text-red-400 text-xs font-condensed font-extrabold uppercase tracking-wide">
                <Icon name="lock" size={12} />
                Cerrado — inició la eliminatoria
              </span>
            ) : (
              <button
                onClick={saveAll}
                disabled={saving}
                className="btn-gold text-sm"
              >
                {saving ? 'Guardando...' : 'Guardar todo'}
              </button>
            )}
          </div>
        } />

        {/* Legend */}
        <div className="glass rounded-2xl p-4 md:p-5 mb-8 text-xs text-gray-400 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center font-sans fade-up-1">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-condensed font-extrabold text-gray-500 uppercase tracking-[0.18em] text-[10px]">Puntos por acierto:</span>
            <span className="chip"><span className="text-us">1 pt</span><span className="text-gray-500">· Octavos</span></span>
            <span className="chip"><span className="text-mx">2 pts</span><span className="text-gray-500">· Cuartos</span></span>
            <span className="chip"><span className="text-ca">4 pts</span><span className="text-gray-500">· Semis</span></span>
            <span className="chip"><span className="text-gold">6 pts</span><span className="text-gray-500">· Finalista</span></span>
            <span className="chip border-gold/30 bg-gold/10"><span className="text-gold">10 pts</span><span className="text-gold/70">· Campeón</span></span>
            <span className="chip border-mx/30 bg-mx/5"><span className="text-mx">+1 pt</span><span className="text-gray-500">· Tanda de penales acertada</span></span>
            {shootoutBonus > 0 && (
              <span className="chip border-mx/40 bg-mx/10 text-mx">🥅 Tu bono de penales: +{shootoutBonus}</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <div className="text-gold/80 font-condensed font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="zap" size={13} className="text-gold flex-shrink-0" />
              Haz click en un equipo para avanzarlo de ronda
            </div>
            <div className="text-gray-500 text-[10px] flex items-center gap-1.5">
              <span className="text-gold font-bold tabular-nums">65%</span>
              <span>= probabilidad de avanzar de cada equipo (modelo Elo); el favorito en oro</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto pb-6 border border-white/8 rounded-3xl bg-ink-900/60 shadow-2xl fade-up-2">
            <div id="bracket-grid" className="inline-flex flex-col py-8 min-w-max px-6 bg-ink-950">

              {/* Column Headers Row */}
              <div className="flex items-center gap-0 border-b border-white/8 pb-4 mb-8 text-center select-none font-condensed font-black text-xs uppercase tracking-[0.18em] text-gray-500">
                <div className="w-[160px]"><p>16avos</p></div>
                <div className="w-[176px]"><p>Octavos</p></div>
                <div className="w-[176px]"><p>Cuartos</p></div>
                <div className="w-[176px]"><p>Semis</p></div>
                <div className="w-[160px]"><p>Final</p></div>
                <div className="w-[176px]"><p className="text-gold">Campeón</p></div>
                <div className="w-[160px]"><p>Final</p></div>
                <div className="w-[176px]"><p>Semis</p></div>
                <div className="w-[176px]"><p>Cuartos</p></div>
                <div className="w-[176px]"><p>Octavos</p></div>
                <div className="w-[160px]"><p>16avos</p></div>
              </div>

              {/* Bracket Grid */}
              <div className="flex items-start gap-0">
                
                {/* 1. R32 LEFT */}
                <div className="flex flex-col gap-4 py-0 w-[160px] items-start">
                  {r32L_Indices.map((idx, index) => {
                    const match = r32Matchups[idx] || { home: null, away: null, label: `M${73 + idx}` }
                    const targetSlot = R32_TO_R16_SLOT[idx]
                    const isTopSelected = !!match.home && predictions.round16[targetSlot] === match.home
                    const isBottomSelected = !!match.away && predictions.round16[targetSlot] === match.away
                    return (
                      <div key={`r32l-${idx}`} className="flex flex-col">
                        <Match
                          top={match.home} bottom={match.away}
                          topPlaceholder="?" bottomPlaceholder="?"
                          isTopHighlighted={isTopSelected} isBottomHighlighted={isBottomSelected}
                          onTopClick={() => setActiveMatchKey(prev => prev === `round32_${idx}` ? null : `round32_${idx}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `round32_${idx}` ? null : `round32_${idx}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectRight={false} connectLeft={false}
                          round="round32"
                          label={match.label || `M${73 + idx}`}
                          side="left"
                          elo={elo}
                        />
                        {activeMatchKey === `round32_${idx}` && match.home && match.away && (
                          <MatchScoreInput
                            score={getScore('round32', idx)}
                            homeTeam={match.home ?? null}
                            awayTeam={match.away ?? null}
                            onChange={update => handleScoreChange('round32', idx, idx, match.home, match.away, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 2. R16 LEFT */}
                <div className="flex flex-col gap-[120px] pt-[52px] w-[176px] items-start">
                  {r16L_Indices.map((idx, index) => {
                    const top = predictions.round16[2 * idx]
                    const bottom = predictions.round16[2 * idx + 1]
                    const targetSlot = idx
                    const isTopSelected = !!top && predictions.quarter[targetSlot] === top
                    const isBottomSelected = !!bottom && predictions.quarter[targetSlot] === bottom
                    return (
                      <div key={`r16l-${idx}`} className="flex flex-col">
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
                          onTopClick={() => setActiveMatchKey(prev => prev === `round16_${idx}` ? null : `round16_${idx}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `round16_${idx}` ? null : `round16_${idx}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectLeft={false} connectRight={false}
                          round="round16"
                          label={R16_MATCH_LABELS[idx] ?? `M${89 + idx}`}
                          side="left"
                          elo={elo}
                        />
                        {activeMatchKey === `round16_${idx}` && top && bottom && (
                          <MatchScoreInput
                            score={getScore('round16', idx)}
                            homeTeam={top ?? null}
                            awayTeam={bottom ?? null}
                            onChange={update => handleScoreChange('round16', idx, 2 * idx, top, bottom, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 3. QF LEFT */}
                <div className="flex flex-col gap-[328px] pt-[156px] w-[176px] items-start">
                  {qfL_Indices.map((idx, index) => {
                    const top = predictions.quarter[2 * idx]
                    const bottom = predictions.quarter[2 * idx + 1]
                    const targetSlot = idx
                    const isTopSelected = !!top && predictions.semi[targetSlot] === top
                    const isBottomSelected = !!bottom && predictions.semi[targetSlot] === bottom
                    return (
                      <div key={`qfl-${idx}`} className="flex flex-col">
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
                          onTopClick={() => setActiveMatchKey(prev => prev === `quarter_${idx}` ? null : `quarter_${idx}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `quarter_${idx}` ? null : `quarter_${idx}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectLeft={false} connectRight={false}
                          round="quarter"
                          label={`M${97 + idx}`}
                          side="left"
                          elo={elo}
                        />
                        {activeMatchKey === `quarter_${idx}` && top && bottom && (
                          <MatchScoreInput
                            score={getScore('quarter', idx)}
                            homeTeam={top}
                            awayTeam={bottom}
                            onChange={update => handleScoreChange('quarter', idx, 2 * idx, top, bottom, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 4. SEMIFINAL LEFT */}
                <div className="flex flex-col pt-[364px] w-[176px] items-start">
                  <div className="flex flex-col">
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
                      onTopClick={() => setActiveMatchKey(prev => prev === 'semi_0' ? null : 'semi_0')}
                      onBottomClick={() => setActiveMatchKey(prev => prev === 'semi_0' ? null : 'semi_0')}
                      linePos="center"
                      connectLeft={false} connectRight={false}
                      round="semi"
                      label="M101"
                      side="left"
                      elo={elo}
                    />
                    {activeMatchKey === 'semi_0' && sfL_top && sfL_bottom && (
                      <MatchScoreInput
                        score={getScore('semi', 0)}
                        homeTeam={sfL_top}
                        awayTeam={sfL_bottom}
                        onChange={update => handleScoreChange('semi', 0, 0, sfL_top, sfL_bottom, update)}
                      />
                    )}
                  </div>
                </div>

                {/* 5. FINALIST LEFT */}
                <div className="flex flex-col pt-[392px] w-[160px]">
                  <div className="flex flex-col">
                    <WinnerSlot
                      team={finalistL}
                      placeholder={getPlaceholder('finalist', 0)}
                      highlight={isFinalistLSelected}
                      correct={isCorrect('finalist', 0, finalistL)}
                      wrong={isWrong('finalist', 0, finalistL)}
                      connectLeft={false} connectRight={false}
                      onClick={() => setActiveMatchKey(prev => prev === 'finalist_0' ? null : 'finalist_0')}
                    />
                    {activeMatchKey === 'finalist_0' && finalistL && finalistR && (
                      <MatchScoreInput
                        score={getScore('finalist', 0)}
                        homeTeam={finalistL}
                        awayTeam={finalistR}
                        onChange={update => handleScoreChange('finalist', 0, 0, finalistL, finalistR, update)}
                      />
                    )}
                  </div>
                </div>

                {/* 6. CHAMPION CENTER */}
                <div className="flex flex-col items-center justify-center w-[176px] h-[832px] flex-shrink-0">
                  <div className="flex items-center w-full">
                    {/* Champion Card */}
                    <div className="flex-1 flex flex-col items-center p-4 pt-5 bg-gradient-to-b from-gold/10 via-panel to-panel border border-gold/30 rounded-3xl shadow-[0_0_45px_-12px_rgba(255,195,0,0.35)] relative overflow-hidden group hover:border-gold/50 transition-all duration-300">
                      <div className="tri-stripe absolute top-0 left-0 right-0" aria-hidden="true" />
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />

                      <p className="trophy-text font-display text-[10px] uppercase tracking-[0.2em] mb-3.5 select-none">Campeón del Mundo</p>
                      <Slot
                        team={champion}
                        placeholder="CAMPEÓN"
                        size="lg"
                        correct={isCorrect('champion', 0, champion)}
                        wrong={isWrong('champion', 0, champion)}
                      />
                      {champion ? (
                        <div className="flex flex-col items-center mt-4 animate-bounce duration-1000">
                          <p className="text-4xl no-invert filter drop-shadow-[0_0_12px_rgba(255,195,0,0.5)]">🏆</p>
                        </div>
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center mt-4 text-2xl no-invert select-none opacity-25 grayscale">
                          🏆
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. FINALIST RIGHT */}
                <div className="flex flex-col pt-[392px] w-[160px] items-end">
                  <WinnerSlot
                    team={finalistR}
                    placeholder={getPlaceholder('finalist', 1)}
                    highlight={isFinalistRSelected}
                    correct={isCorrect('finalist', 1, finalistR)}
                    wrong={isWrong('finalist', 1, finalistR)}
                    connectLeft={false} connectRight={false}
                    onClick={() => setActiveMatchKey(prev => prev === 'finalist_0' ? null : 'finalist_0')}
                  />
                </div>

                {/* 8. SEMIFINAL RIGHT */}
                <div className="flex flex-col pt-[364px] w-[176px] items-end">
                  <div className="flex flex-col">
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
                      onTopClick={() => setActiveMatchKey(prev => prev === 'semi_1' ? null : 'semi_1')}
                      onBottomClick={() => setActiveMatchKey(prev => prev === 'semi_1' ? null : 'semi_1')}
                      linePos="center"
                      connectLeft={false} connectRight={false}
                      round="semi"
                      label="M102"
                      side="right"
                      elo={elo}
                    />
                    {activeMatchKey === 'semi_1' && sfR_top && sfR_bottom && (
                      <MatchScoreInput
                        score={getScore('semi', 1)}
                        homeTeam={sfR_top}
                        awayTeam={sfR_bottom}
                        onChange={update => handleScoreChange('semi', 1, 2, sfR_top, sfR_bottom, update)}
                      />
                    )}
                  </div>
                </div>

                {/* 9. QF RIGHT */}
                <div className="flex flex-col gap-[328px] pt-[156px] w-[176px] items-end">
                  {qfR_Indices.map((idx, index) => {
                    const top = predictions.quarter[2 * idx]
                    const bottom = predictions.quarter[2 * idx + 1]
                    const targetSlot = idx
                    const isTopSelected = !!top && predictions.semi[targetSlot] === top
                    const isBottomSelected = !!bottom && predictions.semi[targetSlot] === bottom
                    // El marcador se indexa por el cuarto real (idx 2,3 → quarter_2, quarter_3).
                    // Antes usaba idx-2 y colisionaba con los cuartos izquierdos (quarter_0/_1).
                    const matchIndex = idx
                    return (
                      <div key={`qfr-${idx}`} className="flex flex-col">
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
                          onTopClick={() => setActiveMatchKey(prev => prev === `quarter_${matchIndex}` ? null : `quarter_${matchIndex}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `quarter_${matchIndex}` ? null : `quarter_${matchIndex}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectLeft={false} connectRight={false}
                          round="quarter"
                          label={`M${97 + idx}`}
                          side="right"
                          elo={elo}
                        />
                        {activeMatchKey === `quarter_${matchIndex}` && top && bottom && (
                          <MatchScoreInput
                            score={getScore('quarter', matchIndex)}
                            homeTeam={top}
                            awayTeam={bottom}
                            onChange={update => handleScoreChange('quarter', matchIndex, 2 * idx, top, bottom, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 10. R16 RIGHT */}
                <div className="flex flex-col gap-[120px] pt-[52px] w-[176px] items-end">
                  {r16R_Indices.map((idx, index) => {
                    const top = predictions.round16[2 * idx]
                    const bottom = predictions.round16[2 * idx + 1]
                    const targetSlot = idx
                    const isTopSelected = !!top && predictions.quarter[targetSlot] === top
                    const isBottomSelected = !!bottom && predictions.quarter[targetSlot] === bottom
                    return (
                      <div key={`r16r-${idx}`} className="flex flex-col">
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
                          onTopClick={() => setActiveMatchKey(prev => prev === `round16_${idx}` ? null : `round16_${idx}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `round16_${idx}` ? null : `round16_${idx}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectLeft={false} connectRight={false}
                          round="round16"
                          label={R16_MATCH_LABELS[idx] ?? `M${89 + idx}`}
                          side="right"
                          elo={elo}
                        />
                        {activeMatchKey === `round16_${idx}` && top && bottom && (
                          <MatchScoreInput
                            score={getScore('round16', idx)}
                            homeTeam={top ?? null}
                            awayTeam={bottom ?? null}
                            onChange={update => handleScoreChange('round16', idx, 2 * idx, top, bottom, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 11. R32 RIGHT */}
                <div className="flex flex-col gap-4 py-0 w-[160px] items-end">
                  {r32R_Indices.map((idx, index) => {
                    const match = r32Matchups[idx] || { home: null, away: null, label: `M${73 + idx}` }
                    const targetSlot = R32_TO_R16_SLOT[idx]
                    const isTopSelected = !!match.home && predictions.round16[targetSlot] === match.home
                    const isBottomSelected = !!match.away && predictions.round16[targetSlot] === match.away
                    return (
                      <div key={`r32r-${idx}`} className="flex flex-col">
                        <Match
                          top={match.home} bottom={match.away}
                          topPlaceholder="?" bottomPlaceholder="?"
                          isTopHighlighted={isTopSelected} isBottomHighlighted={isBottomSelected}
                          onTopClick={() => setActiveMatchKey(prev => prev === `round32_${idx}` ? null : `round32_${idx}`)}
                          onBottomClick={() => setActiveMatchKey(prev => prev === `round32_${idx}` ? null : `round32_${idx}`)}
                          linePos={index % 2 === 0 ? 'bottom' : 'top'}
                          connectRight={false} connectLeft={false}
                          round="round32"
                          label={match.label || `M${73 + idx}`}
                          side="right"
                          elo={elo}
                        />
                        {activeMatchKey === `round32_${idx}` && match.home && match.away && (
                          <MatchScoreInput
                            score={getScore('round32', idx)}
                            homeTeam={match.home ?? null}
                            awayTeam={match.away ?? null}
                            onChange={update => handleScoreChange('round32', idx, idx, match.home, match.away, update)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ── Análisis (debajo del bracket): Oráculo + Monte Carlo ── */}
        {!loading && (
          <div className="mt-10 space-y-6">
            {oracleBracket && (
              <div>
                <button onClick={() => setShowOracle(v => !v)} className="btn-ghost text-xs mb-3">
                  <Icon name="fish" size={15} />
                  {showOracle ? 'Ocultar comparación con el Oráculo' : 'Comparar con el Pez Oráculo'}
                </button>
                {showOracle && <OracleCompare predictions={predictions} oracle={oracleBracket} />}
              </div>
            )}

            {/* Favoritos al título (Monte Carlo) con los mismos controles que el Simulador */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display text-sm uppercase tracking-wide text-white flex items-center gap-2 mb-4">
                <Icon name="chart" size={18} className="text-gold" /> Simulación Monte Carlo
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <div>
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Simulaciones</p>
                  <div className="flex gap-2">
                    {ITER_OPTS.map(n => (
                      <button key={n} onClick={() => setSimIterations(n)} disabled={simRunning}
                        className={`chip cursor-pointer transition ${simIterations === n ? 'border-gold/40 bg-gold/10 text-gold' : 'text-gray-400 hover:border-white/25'}`}>
                        {n.toLocaleString('es')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Factor sorpresa <span className="text-gold">{simSurprise}</span></p>
                  <input type="range" min={0} max={100} value={simSurprise} disabled={simRunning} onChange={e => setSimSurprise(Number(e.target.value))} className="w-full accent-[#FFC300]" />
                  <div className="flex justify-between text-[9px] text-gray-600 font-condensed font-bold uppercase tracking-wide"><span>Ranking</span><span>Todo puede pasar</span></div>
                </div>
                <div>
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Peso plantilla <span className="text-gold">{simSquadWeight}%</span></p>
                  <input type="range" min={0} max={100} value={simSquadWeight} disabled={simRunning} onChange={e => setSimSquadWeight(Number(e.target.value))} className="w-full accent-[#FFC300]" />
                  <div className="flex justify-between text-[9px] text-gray-600 font-condensed font-bold uppercase tracking-wide"><span>Historial</span><span>Plantel</span></div>
                </div>
                <div>
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Ventaja anfitrión</p>
                  <button onClick={() => setSimHostBoost(v => !v)} disabled={simRunning} className={`chip cursor-pointer transition ${simHostBoost ? 'border-mx/40 bg-mx/10 text-mx' : 'text-gray-500'}`}>
                    <span className="no-invert">🇲🇽🇺🇸🇨🇦</span> {simHostBoost ? '+100 Elo' : 'Off'}
                  </button>
                </div>
                <div>
                  <p className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400 mb-2">Momentum</p>
                  <button onClick={() => setSimMomentum(v => !v)} disabled={simRunning} className={`chip cursor-pointer transition ${simMomentum ? 'border-ca/40 bg-ca/10 text-ca' : 'text-gray-500'}`}>
                    <Icon name="flame" size={11} /> {simMomentum ? 'Rachas' : 'Off'}
                  </button>
                </div>
              </div>

              <div className="divider-gold my-4" />

              {simRunning ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-ink-950 h-3 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-ca via-gold to-mx transition-all duration-200" style={{ width: `${Math.round(simProgress * 100)}%` }} />
                  </div>
                  <span className="font-display text-gold text-lg tabular-nums">{Math.round(simProgress * 100)}%</span>
                </div>
              ) : (
                <button onClick={() => matches.length && runSim(matches, simConfig)} disabled={!matches.length} className="btn-gold text-sm">
                  <Icon name="zap" size={15} /> Simular {simIterations.toLocaleString('es')} mundiales
                </button>
              )}
            </div>

            {simResults && !simRunning && <TitleOdds teams={simResults.teams} />}
          </div>
        )}

      </div>
    </div>
  )
}
