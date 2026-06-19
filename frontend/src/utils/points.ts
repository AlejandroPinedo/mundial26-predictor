export function getPointsBadge(points: number): string {
    if (points === 3) return 'Marcador exacto'
    if (points === 1) return 'Resultado correcto'
    return 'Sin puntos'
  }

/**
 * Puntos que daría una predicción contra un marcador dado (mismas reglas que el
 * backend: 3 = exacto, 1 = resultado/signo correcto, 0 = fallo). Se usa para la
 * proyección en vivo ("si acaba así, ganas +X"); no compromete puntos reales.
 */
export function projectedPoints(
  predHome: number,
  predAway: number,
  scoreHome: number,
  scoreAway: number,
): number {
  if (predHome === scoreHome && predAway === scoreAway) return 3
  if (Math.sign(predHome - predAway) === Math.sign(scoreHome - scoreAway)) return 1
  return 0
}