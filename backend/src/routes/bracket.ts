import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'

export const bracketRouter = new Hono<{ Variables: AppVariables }>()

const ROUND_POINTS: Record<string, number> = {
  quarter: 1,
  semi: 3,
  finalist: 5,
  champion: 10,
}

const ROUND_SLOTS: Record<string, number> = {
  quarter: 8,
  semi: 4,
  finalist: 2,
  champion: 1,
}

bracketRouter.post('/predict', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { round, teams } = await c.req.json()

  if (!ROUND_SLOTS[round]) return c.json({ error: 'Ronda inválida' }, 400)
  if (!Array.isArray(teams) || teams.length > ROUND_SLOTS[round]) {
    return c.json({ error: `Máximo ${ROUND_SLOTS[round]} equipos para esta ronda` }, 400)
  }

  await db.query('DELETE FROM bracket_predictions WHERE user_id = $1 AND round = $2', [userId, round])

  if (teams.length > 0) {
    const values = teams.map((_: string, i: number) => `($1, $${i + 3}, $2)`).join(', ')
    await db.query(
      `INSERT INTO bracket_predictions (user_id, round, team) VALUES ${values}`,
      [userId, round, ...teams]
    )
  }

  return c.json({ updated: teams.length })
})

bracketRouter.get('/my', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const result = await db.query(
    'SELECT round, team FROM bracket_predictions WHERE user_id = $1 ORDER BY round, team',
    [userId]
  )
  const predictions: Record<string, string[]> = { quarter: [], semi: [], finalist: [], champion: [] }
  for (const row of result.rows) {
    if (predictions[row.round]) predictions[row.round].push(row.team)
  }
  return c.json({ predictions })
})

bracketRouter.get('/results', async (c) => {
  const result = await db.query('SELECT round, team FROM bracket_results ORDER BY round, team')
  const results: Record<string, string[]> = { quarter: [], semi: [], finalist: [], champion: [] }
  for (const row of result.rows) {
    if (results[row.round]) results[row.round].push(row.team)
  }
  return c.json({ results })
})

bracketRouter.post('/admin/result', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId])
  if (!userResult.rows[0]?.is_admin) return c.json({ error: 'Unauthorized' }, 403)

  const { round, teams } = await c.req.json()
  if (!ROUND_SLOTS[round]) return c.json({ error: 'Ronda inválida' }, 400)

  await db.query('DELETE FROM bracket_results WHERE round = $1', [round])

  if (teams.length > 0) {
    const values = teams.map((_: string, i: number) => `($${i + 2}, $1)`).join(', ')
    await db.query(
      `INSERT INTO bracket_results (team, round) VALUES ${values}`,
      [round, ...teams]
    )
  }

  const preds = await db.query(
    'SELECT user_id, team FROM bracket_predictions WHERE round = $1',
    [round]
  )

  const pts = ROUND_POINTS[round]
  const correctTeams = new Set(teams)
  const pointsMap: Record<string, number> = {}

  for (const pred of preds.rows) {
    if (correctTeams.has(pred.team)) {
      pointsMap[pred.user_id] = (pointsMap[pred.user_id] || 0) + pts
    }
  }

  return c.json({ round, correct: teams, pointsAwarded: Object.keys(pointsMap).length })
})
