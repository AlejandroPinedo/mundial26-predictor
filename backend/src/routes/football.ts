import { Hono } from 'hono'
import { getScorers, getStandings } from '../results/footballData.js'

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
