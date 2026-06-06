import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'

import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'

const ALL_TEAMS = [
  'Alemania', 'Arabia Saudí', 'Argelia', 'Argentina', 'Australia',
  'Austria', 'Bélgica', 'Bolivia', 'Brasil', 'Canadá', 'Chile',
  'Colombia', 'Corea del Sur', 'Costa Rica', 'Costa de Marfil',
  'Croacia', 'Ecuador', 'Egipto', 'Escocia', 'España',
  'Estados Unidos', 'Francia', 'Ghana', 'Honduras', 'Inglaterra',
  'Irak', 'Irán', 'Jamaica', 'Japón', 'Jordania', 'Kenia',
  'Marruecos', 'México', 'Nigeria', 'Nueva Zelanda', 'Países Bajos',
  'Panamá', 'Paraguay', 'Perú', 'Portugal', 'República Checa',
  'Senegal', 'Sudáfrica', 'Suiza', 'Turquía', 'Túnez',
  'Uruguay', 'Venezuela'
].sort()

type Predictions = { quarter: string[]; semi: string[]; finalist: string[]; champion: string[] }

// ── Slot component ─────────────────────────────────────────────────────────────
function Slot({
  team, onClick, highlight = false, correct = false, wrong = false, size = 'sm'
}: {
  team: string | null
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
    ? 'bg-yellow-400/15 border-yellow-400/60 text-yellow-300'
    : team
    ? 'bg-gray-800 border-gray-600 text-white hover:border-gray-400'
    : 'bg-gray-900 border-dashed border-gray-700 text-gray-600 hover:border-gray-500'

  return (
    <button
      onClick={onClick}
      className={`${w} ${h} flex items-center gap-1.5 px-2 rounded border text-xs font-medium transition truncate ${cls}`}
    >
      {team ? (
        <><span className="text-base leading-none flex-shrink-0">{getFlag(team)}</span><span className="truncate">{team}</span></>
      ) : (
        <span className="text-gray-600 mx-auto">?</span>
      )}
    </button>
  )
}

// ── Match component (2 slots + connector line) ─────────────────────────────────
function Match({
  top, bottom, onTopClick, onBottomClick, linePos, connectRight = true
}: {
  top: string | null; bottom: string | null
  onTopClick?: () => void; onBottomClick?: () => void
  linePos: 'top' | 'bottom'; connectRight?: boolean
}) {
  return (
    <div className="flex items-center">
      <div className="flex flex-col">
        <Slot team={top} onClick={onTopClick} />
        <div className="h-px w-full bg-gray-700 my-0.5" />
        <Slot team={bottom} onClick={onBottomClick} />
      </div>
      {connectRight && (
        <div className="relative w-5 h-[66px]">
          {linePos === 'top' ? (
            <>
              <div className="absolute top-[16px] right-0 w-full border-b border-gray-600" />
              <div className="absolute top-[16px] bottom-0 right-0 border-r border-gray-600" />
            </>
          ) : (
            <>
              <div className="absolute bottom-[16px] right-0 w-full border-b border-gray-600" />
              <div className="absolute top-0 bottom-[16px] right-0 border-r border-gray-600" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Winner slot with left connector ─────────────────────────────────────────────
function WinnerSlot({
  team, onClick, connectLeft = true, connectRight = false, correct = false, wrong = false
}: {
  team: string | null; onClick?: () => void
  connectLeft?: boolean; connectRight?: boolean
  correct?: boolean; wrong?: boolean
}) {
  return (
    <div className="flex items-center">
      {connectLeft && <div className="w-5 border-b border-gray-600" />}
      <Slot team={team} onClick={onClick} highlight={!!team && !correct && !wrong} correct={correct} wrong={wrong} />
      {connectRight && <div className="w-5 border-b border-gray-600" />}
    </div>
  )
}

// ── Team selector modal ─────────────────────────────────────────────────────────
function TeamPicker({
  pool, selected, onSelect, onClose, maxSlots
}: {
  pool: string[]; selected: string[]; onSelect: (t: string) => void
  onClose: () => void; maxSlots: number
}) {
  const [search, setSearch] = useState('')
  const filtered = search ? pool.filter(t => t.toLowerCase().includes(search.toLowerCase())) : pool

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">{selected.length}/{maxSlots} seleccionados</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <input autoFocus
          placeholder="Buscar equipo..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-xl text-sm mb-3 outline-none focus:ring-1 focus:ring-yellow-400"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {filtered.map(team => (
            <button key={team}
              onClick={() => onSelect(team)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${
                selected.includes(team)
                  ? 'bg-yellow-400/20 border border-yellow-400/40 text-yellow-400'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}>
              <span className="text-base">{getFlag(team)}</span>
              <span>{team}</span>
              {selected.includes(team) && <span className="ml-auto text-yellow-400">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main BracketPage ─────────────────────────────────────────────────────────────
export default function BracketPage() {
  const [predictions, setPredictions] = useState<Predictions>({ quarter: [], semi: [], finalist: [], champion: [] })
  const [results, setResults] = useState<Predictions>({ quarter: [], semi: [], finalist: [], champion: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<{ round: string; slotIdx: number } | null>(null)

  useEffect(() => {
    Promise.all([apiFetch('/bracket/my'), apiFetch('/bracket/results')])
      .then(([m, r]) => { setPredictions(m.predictions); setResults(r.results) })
      .finally(() => setLoading(false))
  }, [])

  function getPool(round: string) {
    const order = ['quarter', 'semi', 'finalist', 'champion']
    const idx = order.indexOf(round)
    if (idx === 0) return ALL_TEAMS
    const prev = order[idx - 1]
    return predictions[prev as keyof Predictions]?.length > 0
      ? predictions[prev as keyof Predictions]
      : ALL_TEAMS
  }

  function openPicker(round: string, slotIdx: number) {
    const pool = getPool(round)
    if (pool.length === 0) { toast.error('Completa la ronda anterior primero'); return }
    setPicker({ round, slotIdx })
  }

  function selectTeam(team: string) {
    if (!picker) return
    const { round, slotIdx } = picker
    const current = predictions[round as keyof Predictions] || []
    const slots = round === 'quarter' ? 8 : round === 'semi' ? 4 : round === 'finalist' ? 2 : 1

    let updated: string[]
    if (current.includes(team)) {
      updated = current.filter(t => t !== team)
    } else {
      if (current.length >= slots) {
        updated = [...current.slice(0, slotIdx), team, ...current.slice(slotIdx + 1)]
      } else {
        updated = [...current, team]
      }
    }

    setPredictions(prev => {
      const next = { ...prev, [round]: updated }
      if (round === 'quarter') {
        next.semi = next.semi.filter(t => updated.includes(t))
        next.finalist = next.finalist.filter(t => next.semi.includes(t))
        next.champion = next.champion.filter(t => next.finalist.includes(t))
      } else if (round === 'semi') {
        next.finalist = next.finalist.filter(t => updated.includes(t))
        next.champion = next.champion.filter(t => next.finalist.includes(t))
      } else if (round === 'finalist') {
        next.champion = next.champion.filter(t => updated.includes(t))
      }
      return next
    })

    if (updated.length >= slots) setPicker(null)
  }

  async function saveAll() {
    setSaving(true)
    try {
      await Promise.all(
        (['quarter', 'semi', 'finalist', 'champion'] as const).map(round =>
          apiFetch('/bracket/predict', {
            method: 'POST',
            body: JSON.stringify({ round, teams: predictions[round] }),
          })
        )
      )
      toast.success('Bracket guardado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const q = (i: number) => predictions.quarter[i] || null
  const s = (i: number) => predictions.semi[i] || null
  const f = (i: number) => predictions.finalist[i] || null
  const ch = predictions.champion[0] || null

  const hasR = (round: string) => results[round as keyof Predictions]?.length > 0
  const isCorrect = (round: string, team: string | null) =>
    team ? results[round as keyof Predictions]?.includes(team) : false
  const isWrong = (round: string, team: string | null) =>
    team && hasR(round) && !isCorrect(round, team)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="max-w-4xl mx-auto p-4 md:p-6">

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">Bracket Playoff</h1>
            <p className="text-gray-500 text-sm mt-1">Predice tu campeón. Cada slot muestra equipos de la ronda anterior.</p>
          </div>
          <button onClick={saveAll} disabled={saving}
            className="bg-yellow-400 text-gray-950 font-black px-5 py-2 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition text-sm">
            {saving ? '...' : 'Guardar todo'}
          </button>
        </div>

        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-3 mb-4 text-xs text-gray-500 flex flex-wrap gap-4">
          <span><span className="text-blue-400 font-bold">1 pt</span> · Cuartos</span>
          <span><span className="text-purple-400 font-bold">3 pts</span> · Semifinal</span>
          <span><span className="text-orange-400 font-bold">5 pts</span> · Finalista</span>
          <span><span className="text-yellow-400 font-bold">10 pts</span> · Campeón</span>
        </div>

        {loading ? <Spinner /> : (
          <div className="overflow-x-auto pb-4">
            <div className="inline-flex items-center gap-0 min-w-max">

              {/* QF LEFT (4 matches → 2 SF) */}
              <div className="flex flex-col gap-4">
                {[0, 1, 2, 3].map(i => (
                  <Match key={i}
                    top={q(i * 2)} bottom={q(i * 2 + 1)}
                    linePos={i % 2 === 0 ? 'bottom' : 'top'}
                    onTopClick={() => openPicker('quarter', i * 2)}
                    onBottomClick={() => openPicker('quarter', i * 2 + 1)}
                  />
                ))}
              </div>

              {/* SF LEFT (2 slots → 1 finalist) */}
              <div className="flex flex-col gap-[84px] py-[17px]">
                {[0, 1].map(i => (
                  <WinnerSlot key={i} team={s(i)}
                    correct={isCorrect('semi', s(i))}
                    wrong={!!isWrong('semi', s(i))}
                    connectLeft connectRight
                    onClick={() => openPicker('semi', i)}
                  />
                ))}
              </div>

              {/* FINALIST LEFT */}
              <div className="flex flex-col justify-center py-[68px]">
                <WinnerSlot team={f(0)}
                  correct={isCorrect('finalist', f(0))}
                  wrong={!!isWrong('finalist', f(0))}
                  connectLeft connectRight
                  onClick={() => openPicker('finalist', 0)}
                />
              </div>

              {/* CHAMPION CENTER */}
              <div className="flex flex-col items-center justify-center px-2 gap-2">
                <div className="w-5 border-b border-gray-600" />
                <div className="flex flex-col items-center">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">Campeón</p>
                  <Slot team={ch} size="lg"
                    correct={isCorrect('champion', ch)}
                    wrong={!!isWrong('champion', ch)}
                    onClick={() => openPicker('champion', 0)}
                  />
                  {ch && <p className="text-yellow-400 text-lg mt-1">🏆</p>}
                </div>
                <div className="w-5 border-b border-gray-600" />
              </div>

              {/* FINALIST RIGHT */}
              <div className="flex flex-col justify-center py-[68px]">
                <WinnerSlot team={f(1)}
                  correct={isCorrect('finalist', f(1))}
                  wrong={!!isWrong('finalist', f(1))}
                  connectLeft connectRight
                  onClick={() => openPicker('finalist', 1)}
                />
              </div>

              {/* SF RIGHT (2 slots) */}
              <div className="flex flex-col gap-[84px] py-[17px]">
                {[2, 3].map(i => (
                  <WinnerSlot key={i} team={s(i)}
                    correct={isCorrect('semi', s(i))}
                    wrong={!!isWrong('semi', s(i))}
                    connectLeft connectRight
                    onClick={() => openPicker('semi', i)}
                  />
                ))}
              </div>

              {/* QF RIGHT (4 matches) */}
              <div className="flex flex-col gap-4">
                {[4, 5, 6, 7].map(i => (
                  <Match key={i}
                    top={q(i)} bottom={i < 7 ? q(i + 1) : null}
                    linePos={i % 2 === 0 ? 'bottom' : 'top'}
                    onTopClick={() => openPicker('quarter', i)}
                    onBottomClick={() => openPicker('quarter', i < 7 ? i + 1 : i)}
                    connectRight={false}
                  />
                ))}
              </div>

            </div>
          </div>
        )}
      </div>

      {picker && (
        <TeamPicker
          pool={getPool(picker.round)}
          selected={predictions[picker.round as keyof Predictions] || []}
          onSelect={selectTeam}
          onClose={() => setPicker(null)}
          maxSlots={picker.round === 'quarter' ? 8 : picker.round === 'semi' ? 4 : picker.round === 'finalist' ? 2 : 1}
        />
      )}
    </div>
  )
}
