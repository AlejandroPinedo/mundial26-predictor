import { useState } from 'react'
import Icon from './Icon'
import type { MatchPrediction as Prediction } from '../predict/predictMatch'

type Props = {
  prediction: Prediction
  userPred?: { home: number; away: number } | null
  className?: string
}

const pct = (p: number) => Math.round(p * 100)
type Outcome = 'home' | 'draw' | 'away'
const outcomeOf = (h: number, a: number): Outcome => (h > a ? 'home' : h === a ? 'draw' : 'away')

function favorite(p: Prediction): { outcome: Outcome; prob: number } {
  if (p.probHome >= p.probDraw && p.probHome >= p.probAway) return { outcome: 'home', prob: p.probHome }
  if (p.probAway >= p.probDraw) return { outcome: 'away', prob: p.probAway }
  return { outcome: 'draw', prob: p.probDraw }
}

const FAV_LABEL: Record<Outcome, string> = { home: 'Local', draw: 'Empate', away: 'Visita' }
const FAV_COLOR: Record<Outcome, string> = { home: 'text-mx', draw: 'text-gray-400', away: 'text-us' }

function comparison(prediction: Prediction, userPred: { home: number; away: number }) {
  const { mostLikely } = prediction
  if (userPred.home === mostLikely.home && userPred.away === mostLikely.away) {
    return { text: 'Coincides con el Pez Oráculo', cls: 'text-gold' }
  }
  if (outcomeOf(userPred.home, userPred.away) === favorite(prediction).outcome) {
    return { text: 'Vas con el Pez Oráculo', cls: 'text-mx' }
  }
  return { text: 'Vas contra el Pez Oráculo', cls: 'text-ca' }
}

export default function MatchPrediction({ prediction, userPred, className }: Props) {
  const [open, setOpen] = useState(false)
  const { probHome, probDraw, probAway, topScores, mostLikely, lambdaHome, lambdaAway } = prediction
  const fav = favorite(prediction)
  const cmp = userPred ? comparison(prediction, userPred) : null

  return (
    <div className={`pt-2.5 border-t border-white/8 ${className ?? 'mt-2.5'}`}>
      {/* Resumen en una línea (toggle) */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'Ocultar análisis del Pez Oráculo' : 'Ver análisis del Pez Oráculo'}
        className="w-full flex items-center justify-between gap-2 py-0.5 cursor-pointer group"
      >
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <Icon name="fish" size={13} className="text-gray-500 group-hover:text-gold transition flex-shrink-0" />
          <span className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.14em]">Oráculo</span>
        </span>
        {!open && (
          <span className="text-white font-display text-xs whitespace-nowrap">{mostLikely.home}–{mostLikely.away}</span>
        )}
        <span className="flex items-center gap-2 flex-shrink-0">
          {!open && (
            <span className={`${FAV_COLOR[fav.outcome]} text-[10px] font-condensed font-extrabold uppercase tracking-wide whitespace-nowrap`}>
              {FAV_LABEL[fav.outcome]} {pct(fav.prob)}%
            </span>
          )}
          <Icon name="chevronRight" size={12}
            className={`text-gray-500 group-hover:text-gray-300 transition-transform ${open ? 'rotate-90' : ''}`} />
        </span>
      </button>

      {/* Detalle (divulgación progresiva) */}
      {open && (
        <div className="mt-2.5">
          <div className="flex h-2 rounded-full overflow-hidden mb-1.5 bg-white/5">
            <div className="bg-mx" style={{ width: `${probHome * 100}%` }} />
            <div className="bg-gray-500" style={{ width: `${probDraw * 100}%` }} />
            <div className="bg-us" style={{ width: `${probAway * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-condensed font-extrabold uppercase tracking-wide mb-2.5">
            <span className="text-mx">{pct(probHome)}% Local</span>
            <span className="text-gray-400">{pct(probDraw)}% Empate</span>
            <span className="text-us">{pct(probAway)}% Visita</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500 text-[10px] font-condensed font-bold uppercase tracking-wider">Marcadores probables</span>
            <span className="text-gray-400 text-[10px] font-condensed font-bold uppercase tracking-wider ml-auto">
              xG {lambdaHome.toFixed(1)} – {lambdaAway.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topScores.map((s, i) => (
              <span key={`${s.home}-${s.away}-${i}`}
                className={`chip ${i === 0 ? 'border-gold/30 bg-gold/10 text-gold' : 'text-gray-400'}`}>
                {s.home}-{s.away} · {pct(s.p)}%
              </span>
            ))}
          </div>

          {cmp && (
            <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-condensed font-extrabold uppercase tracking-wider ${cmp.cls}`}>
              <Icon name="target" size={11} />
              {cmp.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
