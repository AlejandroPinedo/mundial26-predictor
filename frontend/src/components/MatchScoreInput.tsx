import type { MatchScore } from '../types/bracket'

interface Props {
  score: MatchScore
  homeTeam: string | null
  awayTeam: string | null
  onChange: (update: Partial<MatchScore>) => void
  disabled?: boolean
}

export default function MatchScoreInput({ score, homeTeam, awayTeam, onChange, disabled }: Props) {
  if (!homeTeam || !awayTeam) return null

  // Treat null as 0 — 0-0 is a draw and always shows penalties
  const h = score.home ?? 0
  const a = score.away ?? 0
  const isDraw = h === a

  const penaltiesInvalid = isDraw &&
    score.homePen !== null && score.awayPen !== null &&
    score.homePen === score.awayPen

  const inputClass = "w-10 h-8 bg-black text-yellow-400 text-center rounded text-sm font-display outline-none border border-yellow-400/20 focus:border-yellow-400/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40 transition-colors"

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5 justify-center">
        <input
          type="number" min={0} max={20}
          value={score.home ?? 0}
          onChange={e => onChange({ home: e.target.value === '' ? 0 : Number(e.target.value) })}
          disabled={disabled}
          className={inputClass}
        />
        <span className="text-gray-600 text-[10px] font-bold select-none">—</span>
        <input
          type="number" min={0} max={20}
          value={score.away ?? 0}
          onChange={e => onChange({ away: e.target.value === '' ? 0 : Number(e.target.value) })}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      {isDraw && (
        <div className="space-y-1">
          <p className="text-orange-400 text-[9px] font-bold uppercase tracking-widest text-center flex items-center justify-center gap-1">
            <span>🥅</span> Penales
          </p>
          <div className="flex items-center gap-1.5 justify-center">
            <input
              type="number" min={0} max={30}
              value={score.homePen ?? ''}
              onChange={e => onChange({ homePen: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={disabled}
              placeholder="0"
              className="w-10 h-7 bg-orange-950/60 border border-orange-500/40 text-orange-400 text-center rounded text-xs outline-none focus:border-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-orange-600 text-[10px] font-bold">—</span>
            <input
              type="number" min={0} max={30}
              value={score.awayPen ?? ''}
              onChange={e => onChange({ awayPen: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={disabled}
              placeholder="0"
              className="w-10 h-7 bg-orange-950/60 border border-orange-500/40 text-orange-400 text-center rounded text-xs outline-none focus:border-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          {penaltiesInvalid && (
            <p className="text-red-400 text-[9px] text-center font-bold">Los penales no pueden ser iguales</p>
          )}
        </div>
      )}
    </div>
  )
}
