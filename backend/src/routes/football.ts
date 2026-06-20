import { Hono } from 'hono'
import { db } from '../db.js'
import { getScorers, getStandings } from '../results/footballData.js'
import { getShotMap } from '../results/fifaShotMap.js'

/**
 * Datos OFICIALES de football-data.org (cacheados). Lectura pública (datos del
 * torneo, sin info sensible). El token queda en el servidor.
 */
export const footballRouter = new Hono()

footballRouter.get('/scorers', async (c) => {
  try {
    return c.json(await getScorers())
  } catch (err) {
    console.error('[football/scorers]', err)
    return c.json({ error: 'no disponible', scorers: [] }, 502)
  }
})

footballRouter.get('/standings', async (c) => {
  try {
    return c.json(await getStandings())
  } catch (err) {
    console.error('[football/standings]', err)
    return c.json({ error: 'no disponible', groups: [] }, 502)
  }
})

// Shot map del WC2026 (vía API de FIFA). Lo genera el job diario y se guarda en DB;
// aquí solo se LEE (rápido). Ver src/results/fifaShotMap.ts.
footballRouter.get('/shot-map', async (c) => {
  try {
    const data = await getShotMap(db)
    if (!data) return c.json({ error: 'aún no generado', shots: [], stats: null }, 503)
    return c.json(data)
  } catch (err) {
    console.error('[football/shot-map]', err)
    return c.json({ error: 'no disponible', shots: [], stats: null }, 502)
  }
})
