import { Hono } from 'hono'
import { db } from '../db.js'
import { syncResults } from '../results/syncFromFootballData.js'

export const cronRouter = new Hono()

/**
 * Endpoint para automatizar la ingesta de resultados desde un scheduler externo
 * (cron-job.org), porque el cron de GitHub Actions es de baja prioridad y se
 * estrangula a ~cada 3-4 h. Aquí la cadencia la decide el pinger externo.
 *
 * Protegido por un secreto compartido (CRON_SECRET) en la cabecera Authorization,
 * no por JWT de usuario (el pinger no tiene sesión). El cuerpo de la petición no
 * influye: los marcadores vienen de football-data.org, no del request.
 *
 * Header esperado:  Authorization: Bearer <CRON_SECRET>
 */
cronRouter.post('/sync-results', async (c) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return c.json({ ok: false, error: 'CRON_SECRET no configurado' }, 503)

  if (c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) return c.json({ ok: false, error: 'FOOTBALL_DATA_TOKEN no configurado' }, 503)

  try {
    const summary = await syncResults(db, token, { apply: true })
    return c.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[cron/sync-results]', err)
    return c.json({ ok: false, error: 'sync falló' }, 502)
  }
})
