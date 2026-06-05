import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'
import { calculatePoints } from '../utils/scoring.js'

export const predictionsRouter = new Hono<{ Variables: AppVariables }>()

predictionsRouter.get('/matches', async (c) => {
  const result = await db.query(
    'SELECT * FROM matches ORDER BY match_date ASC'
  )
  return c.json({ matches: result.rows })
})

predictionsRouter.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { matchId, predictedHome, predictedAway } = await c.req.json()

  if (!matchId || predictedHome === undefined || predictedAway === undefined) {
    return c.json({ error: 'matchId, predictedHome and predictedAway are required' }, 400)
  }

  const match = await db.query('SELECT * FROM matches WHERE id = $1', [matchId])
  if (!match.rows[0]) return c.json({ error: 'Match not found' }, 404)

  const result = await db.query(
    `INSERT INTO predictions (user_id, match_id, predicted_home, predicted_away)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, match_id)
     DO UPDATE SET predicted_home = $3, predicted_away = $4
     RETURNING *`,
    [userId, matchId, predictedHome, predictedAway]
  )

  return c.json({ prediction: result.rows[0] }, 201)
})

predictionsRouter.get('/my', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const result = await db.query(
    `SELECT p.*, m.home_team, m.away_team, m.match_date, m.stage,
            m.home_score, m.away_score
     FROM predictions p
     JOIN matches m ON p.match_id = m.id
     WHERE p.user_id = $1
     ORDER BY m.match_date ASC`,
    [userId]
  )

  return c.json({ predictions: result.rows })
})

predictionsRouter.get('/leaderboard', async (c) => {
    const result = await db.query(
      `SELECT u.username,
              COUNT(p.id) as total_predictions,
              COALESCE(SUM(p.points), 0) as total_points
       FROM users u
       LEFT JOIN predictions p ON u.id = p.user_id
       GROUP BY u.id, u.username
       ORDER BY total_points DESC`
    )
    return c.json({ leaderboard: result.rows })
  })

  predictionsRouter.post('/admin/result', authMiddleware, async (c) => {
    const userId = c.get('userId')
  
    const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId])
    if (!userResult.rows[0]?.is_admin) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const { matchId, homeScore, awayScore } = await c.req.json()

    await db.query(
      'UPDATE matches SET home_score = $1, away_score = $2 WHERE id = $3',                                             
      [homeScore, awayScore, matchId]
    )

    const preds = await db.query('SELECT * FROM predictions WHERE match_id = $1', [matchId])
  
    for (const pred of preds.rows) {
      const points = calculatePoints(
        { home: pred.predicted_home, away: pred.predicted_away },
        { home: homeScore, away: awayScore }
      )
      await db.query('UPDATE predictions SET points = $1 WHERE id = $2', [points, pred.id])
    }

    return c.json({ updated: preds.rows.length })
  })