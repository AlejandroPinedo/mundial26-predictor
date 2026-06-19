import { Hono } from 'hono'
import { db } from '../db.js'
import { syncResults } from '../results/syncFromFootballData.js'
import { lockOraclePredictions } from '../oracle/lock.js'
import { updateLiveScores } from '../results/varzesh3.js'

export const cronRouter = new Hono()

/**
 * "Tick" periódico disparado por un scheduler externo (cron-job.org) cada ~1 min,
 * porque el cron de GitHub Actions se estrangula a ~cada 3-4 h. Hace tres cosas
 * idempotentes y AISLADAS (un fallo de una no rompe las demás):
 *   1. congela los picks vencidos del Pez Oráculo (DB-only),
 *   2. seguimiento EN VIVO vía Varzesh3 → columnas live_* (display-only, NO scoring),
 *   3. ingesta resultados FINALIZADOS desde football-data (score → puntos → lock).
 *
 * Protegido por un secreto compartido (CRON_SECRET) en la cabecera Authorization.
 * Header esperado:  Authorization: Bearer <CRON_SECRET>
 */
cronRouter.post('/sync-results', async (c) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return c.json({ ok: false, error: 'CRON_SECRET no configurado' }, 503)

  if (c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  // 1) Lock de picks vencidos del Oráculo (DB-only, no necesita token).
  let oracleLocked = 0
  try {
    oracleLocked = await lockOraclePredictions(db)
  } catch (err) {
    console.error('[cron] lockOraclePredictions falló:', err)
  }

  // 2) Marcador en vivo (Varzesh3). Aislado: si la fuente cae, solo se pierde el
  //    badge en vivo; resultados y puntos no se ven afectados.
  let liveUpdated = 0
  try {
    const live = await updateLiveScores(db, { apply: true })
    liveUpdated = live.updated.length
    if (live.unmapped.length) console.warn('[cron] varzesh3 sin mapear:', live.unmapped.join(', '))
  } catch (err) {
    console.error('[cron] varzesh3 live falló:', err)
  }

  // 3) Resultados finales oficiales (football-data) → scoring.
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) return c.json({ ok: false, oracleLocked, liveUpdated, error: 'FOOTBALL_DATA_TOKEN no configurado' }, 503)

  try {
    const summary = await syncResults(db, token, { apply: true })
    if (summary.conflicts.length) {
      console.warn('[cron] football-data corrigió provisional(es) de Varzesh3:', JSON.stringify(summary.conflicts))
    }
    return c.json({ ok: true, oracleLocked, liveUpdated, ...summary })
  } catch (err) {
    console.error('[cron/sync-results]', err)
    return c.json({ ok: false, oracleLocked, liveUpdated, error: 'sync falló' }, 502)
  }
})
