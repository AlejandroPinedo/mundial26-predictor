import { Hono } from 'hono'
import { db } from '../db.js'
import { syncResults } from '../results/syncFromFootballData.js'
import { lockOraclePredictions } from '../oracle/lock.js'

export const cronRouter = new Hono()

/**
 * "Tick" periódico disparado por un scheduler externo (cron-job.org) cada ~1 min,
 * porque el cron de GitHub Actions es de baja prioridad y se estrangula a ~cada
 * 3-4 h. Hace dos cosas idempotentes:
 *   1. congela los picks vencidos del Pez Oráculo (DB-only),
 *   2. ingesta los resultados FINALIZADOS desde football-data.org (score → puntos
 *      → lock del Oráculo) vía syncResults.
 *
 * Protegido por un secreto compartido (CRON_SECRET) en la cabecera Authorization,
 * no por JWT de usuario (el pinger no tiene sesión).
 *
 * Header esperado:  Authorization: Bearer <CRON_SECRET>
 */
cronRouter.post('/sync-results', async (c) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return c.json({ ok: false, error: 'CRON_SECRET no configurado' }, 503)

  if (c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  // 1) Congela los picks del Oráculo cuyo saque ya pasó. DB-only, no necesita el
  //    token de football-data. Un fallo aquí no debe romper la ingesta.
  let oracleLocked = 0
  try {
    oracleLocked = await lockOraclePredictions(db)
  } catch (err) {
    console.error('[cron] lockOraclePredictions falló:', err)
  }

  // 2) Ingesta resultados finales.
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) return c.json({ ok: false, oracleLocked, error: 'FOOTBALL_DATA_TOKEN no configurado' }, 503)

  try {
    const summary = await syncResults(db, token, { apply: true })
    return c.json({ ok: true, oracleLocked, ...summary })
  } catch (err) {
    console.error('[cron/sync-results]', err)
    return c.json({ ok: false, oracleLocked, error: 'sync falló' }, 502)
  }
})
