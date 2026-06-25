import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'

export const bracketRouter = new Hono<{ Variables: AppVariables }>()

const ROUND_POINTS: Record<string, number> = {
  round16: 1,
  quarter: 2,
  semi: 4,
  finalist: 6,
  champion: 10,
}

const ROUND_SLOTS: Record<string, number> = {
  round16: 16,
  quarter: 8,
  semi: 4,
  finalist: 2,
  champion: 1,
}

bracketRouter.post('/predict', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { round, teams, scores } = await c.req.json()

  if (!ROUND_SLOTS[round]) return c.json({ error: 'Ronda inválida' }, 400)
  if (!Array.isArray(teams) || teams.length > ROUND_SLOTS[round]) {
    return c.json({ error: `Máximo ${ROUND_SLOTS[round]} equipos para esta ronda` }, 400)
  }

  await db.query('DELETE FROM bracket_predictions WHERE user_id = $1 AND round = $2', [userId, round])

  if (teams.length > 0) {
    // Parse scores into a map: matchIndex -> score
    const scoreMap: Record<number, { home: number; away: number; homePen: number | null; awayPen: number | null }> = {}
    if (scores && Array.isArray(scores)) {
      for (const s of scores) {
        scoreMap[s.matchIndex] = { home: s.home, away: s.away, homePen: s.homePen ?? null, awayPen: s.awayPen ?? null }
      }
    }

    // Build batch INSERT with scores
    const params: unknown[] = [userId, round]
    const rowPlaceholders: string[] = []
    teams.forEach((team: string, idx: number) => {
      const matchIndex = Math.floor(idx / 2)
      const score = scoreMap[matchIndex]
      const base = params.length + 1
      params.push(team, score?.home ?? null, score?.away ?? null, score?.homePen ?? null, score?.awayPen ?? null)
      rowPlaceholders.push(`($1, $2, $${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4})`)
    })

    await db.query(
      `INSERT INTO bracket_predictions (user_id, round, team, home_score, away_score, home_pen, away_pen) VALUES ${rowPlaceholders.join(', ')}`,
      params
    )
  }

  return c.json({ updated: teams.length })
})

bracketRouter.get('/my', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const result = await db.query(
    'SELECT round, team, home_score, away_score, home_pen, away_pen FROM bracket_predictions WHERE user_id = $1 ORDER BY round, team',
    [userId]
  )
  const predictions: Record<string, string[]> = {
    round16: [], quarter: [], semi: [], finalist: [], champion: []
  }
  const scores: Record<string, { home: number | null; away: number | null; homePen: number | null; awayPen: number | null }> = {}

  for (const row of result.rows) {
    if (predictions[row.round] !== undefined) {
      predictions[row.round].push(row.team)
      const matchIndex = Math.floor((predictions[row.round].length - 1) / 2)
      const key = `${row.round}_${matchIndex}`
      if (row.home_score !== null && !scores[key]) {
        scores[key] = {
          home: row.home_score,
          away: row.away_score,
          homePen: row.home_pen,
          awayPen: row.away_pen,
        }
      }
    }
  }
  return c.json({ predictions, scores })
})

bracketRouter.get('/results', async (c) => {
  const result = await db.query('SELECT round, team FROM bracket_results ORDER BY round, team')
  const results: Record<string, string[]> = {
    round16: [],
    quarter: [],
    semi: [],
    finalist: [],
    champion: []
  }
  for (const row of result.rows) {
    if (results[row.round]) results[row.round].push(row.team)
  }
  return c.json({ results })
})

// Bracket congelado del Pez Oráculo (para comparar contra el del usuario).
bracketRouter.get('/oracle', async (c) => {
  const result = await db.query('SELECT round, team FROM oracle_bracket ORDER BY round, team')
  const oracle: Record<string, string[]> = {
    round16: [], quarter: [], semi: [], finalist: [], champion: []
  }
  for (const row of result.rows) {
    if (oracle[row.round]) oracle[row.round].push(row.team)
  }
  return c.json({ oracle })
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
