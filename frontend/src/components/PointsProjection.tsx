import { projectedPoints } from '../utils/points'
import type { LiveFields } from './LiveScore'

/**
 * Proyección de puntos en vivo: cuántos puntos daría la predicción del usuario
 * SI el partido terminara con el marcador en vivo actual. Display-only: no
 * compromete puntos reales (esos se asignan con el resultado oficial).
 * Solo se muestra si el partido está LIVE y el usuario tiene predicción.
 */
export default function PointsProjection({
  predHome,
  predAway,
  m,
}: {
  predHome?: number | null
  predAway?: number | null
  m: LiveFields
}) {
  if (
    m.live_status !== 'LIVE' ||
    predHome == null ||
    predAway == null ||
    m.live_home == null ||
    m.live_away == null
  ) {
    return null
  }

  const pts = projectedPoints(predHome, predAway, m.live_home, m.live_away)
  const style =
    pts === 3
      ? 'text-gold border-gold/30 bg-gold/10'
      : pts === 1
        ? 'text-us border-us/30 bg-us/10'
        : 'text-gray-400 border-white/10 bg-white/5'

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-condensed font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border whitespace-nowrap ${style}`}
      title="Puntos que ganarías si el partido terminara con el marcador actual"
    >
      Si acaba así · +{pts}
    </span>
  )
}
