import { calculatePoints } from '../utils/scoring.js'
import { lockOraclePredictions, type Queryable } from '../oracle/lock.js'

/**
 * Carga el resultado FINAL de un partido y propaga todo el scoring:
 *  1. guarda el marcador en `matches`
 *  2. recalcula los puntos de todas las predicciones de ese partido
 *  3. congela los picks vencidos del Oráculo (idempotente; un fallo aquí no
 *     debe tumbar la carga del resultado)
 *
 * Fuente ÚNICA de la lógica de resultados: la usan tanto la carga manual
 * (POST /admin/result) como el cron automático (scripts/sync-results.ts).
 * Cualquier cambio al scoring de resultados va aquí.
 */
export async function ingestResult(
  db: Queryable,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ updatedPredictions: number }> {
  await db.query('UPDATE matches SET home_score = $1, away_score = $2 WHERE id = $3', [
    homeScore,
    awayScore,
    matchId,
  ])

  const preds = await db.query('SELECT * FROM predictions WHERE match_id = $1', [matchId])

  for (const pred of preds.rows) {
    const points = calculatePoints(
      { home: pred.predicted_home, away: pred.predicted_away },
      { home: homeScore, away: awayScore },
    )
    await db.query('UPDATE predictions SET points = $1 WHERE id = $2', [points, pred.id])
  }

  try {
    await lockOraclePredictions(db)
  } catch (err) {
    console.error('Error al congelar predicciones del Oráculo:', err)
  }

  return { updatedPredictions: preds.rows.length }
}
