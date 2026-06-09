interface Props {
  predicted: number
  total: number
}

export default function PredictionProgress({ predicted, total }: Props) {
  if (total === 0) return null
  const pct = Math.round((predicted / total) * 100)
  const remaining = total - predicted

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold">Tus predicciones</span>
        <span className="text-yellow-400 font-black text-sm">{predicted}/{total}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-gray-600 text-xs mt-2">
        {remaining > 0
          ? `${remaining} partido${remaining > 1 ? 's' : ''} sin predecir`
          : '🎉 ¡Todos los partidos predichos!'
        }
      </p>
    </div>
  )
}
