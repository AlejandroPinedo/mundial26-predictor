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

  const inputClass = "w-11 h-9 bg-ink-950 text-gold text-center rounded-lg text-base font-display outline-none border border-white/10 focus:border-gold/60 focus:shadow-[0_0_12px_-2px_rgba(255,195,0,0.4)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40 transition-all"

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 justify-center">
        <input
          type="number" min={0} max={20}
          value={score.home ?? 0}
          onChange={e => onChange({ home: e.target.value === '' ? 0 : Number(e.target.value) })}
          disabled={disabled}
          className={inputClass}
        />
        <span className="text-gray-600 text-[10px] font-condensed font-extrabold select-none">VS</span>
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
          <p className="text-ca text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em] text-center flex items-center justify-center gap-1">
            <span className="no-invert">🥅</span> Penales
          </p>
          <div className="flex items-center gap-2 justify-center">
            <input
              type="number" min={0} max={30}
              value={score.homePen ?? ''}
              onChange={e => onChange({ homePen: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={disabled}
              placeholder="0"
              className="w-11 h-8 bg-ca/10 border border-ca/40 text-ca text-center rounded-lg text-xs font-bold outline-none focus:border-ca [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-ca/60 text-[10px] font-bold">—</span>
            <input
              type="number" min={0} max={30}
              value={score.awayPen ?? ''}
              onChange={e => onChange({ awayPen: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={disabled}
              placeholder="0"
              className="w-11 h-8 bg-ca/10 border border-ca/40 text-ca text-center rounded-lg text-xs font-bold outline-none focus:border-ca [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          {penaltiesInvalid && (
            <p className="text-ca text-[9px] text-center font-bold">Los penales no pueden ser iguales</p>
          )}
        </div>
      )}
    </div>
  )
}
