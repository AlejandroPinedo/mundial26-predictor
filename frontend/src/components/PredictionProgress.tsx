interface Props {
  predicted: number
  total: number
}

export default function PredictionProgress({ predicted, total }: Props) {
  if (total === 0) return null
  const pct = Math.round((predicted / total) * 100)
  const remaining = total - predicted

  return (
    <div className="bg-panel border border-white/8 rounded-2xl p-4 relative overflow-hidden">
      <div className="flex justify-between items-baseline mb-2.5 relative z-10">
        <span className="text-[11px] font-condensed font-extrabold uppercase tracking-[0.18em] text-gray-400">Tus predicciones</span>
        <span className="font-display text-gold text-lg leading-none">{predicted}<span className="text-gray-600 text-sm">/{total}</span></span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden relative z-10">
        <div
          className="h-full bg-gradient-to-r from-ca via-gold to-mx rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-2 relative z-10">
        {remaining > 0
          ? `${remaining} partido${remaining > 1 ? 's' : ''} sin predecir`
          : '🎉 ¡Todos los partidos predichos!'
        }
      </p>
    </div>
  )
}
