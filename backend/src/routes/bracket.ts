import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'
import { SHOOTOUT_BONUS } from '../utils/shootoutBonus.js'

export const bracketRouter = new Hono<{ Variables: AppVariables }>()

// GROUP_STAGE_VALUES — valores exactos del campo `stage` para la fase de grupos.
// Se usa para excluirlos al buscar el primer partido de eliminatorias.
const GROUP_STAGE_VALUES = ['Group Stage', 'Fase de grupos', 'grupo', 'group']

async function getBracketDeadline(): Promise<Date | null> {
  const { rows } = await db.query(
    `SELECT MIN(match_date) AS deadline
     FROM matches
     WHERE NOT (${GROUP_STAGE_VALUES.map((_, i) => `LOWER(stage) LIKE $${i + 1}`).join(' OR ')})`,
    GROUP_STAGE_VALUES.map(v => `%${v.toLowerCase()}%`)
  )
  const val = rows[0]?.deadline
  return val ? new Date(val) : null
}

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

bracketRouter.get('/deadline', async (c) => {
  const deadline = await getBracketDeadline()
  const locked = deadline ? new Date() >= deadline : false
  return c.json({ deadline: deadline?.toISOString() ?? null, locked })
})

bracketRouter.post('/predict', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { round, teams, scores } = await c.req.json()

  if (!ROUND_SLOTS[round]) return c.json({ error: 'Ronda inválida' }, 400)
  if (!Array.isArray(teams) || teams.length > ROUND_SLOTS[round]) {
    return c.json({ error: `Máximo ${ROUND_SLOTS[round]} equipos para esta ronda` }, 400)
  }

  const deadline = await getBracketDeadline()
  if (deadline && new Date() >= deadline) {
    return c.json({ error: 'Las predicciones de bracket están cerradas' }, 403)
  }

  await db.query('DELETE FROM bracket_predictions WHERE user_id = $1 AND round = $2', [userId, round])
  // Bono de penales: recalculamos las tandas predichas de esta ronda desde cero.
  await db.query('DELETE FROM bracket_shootout_picks WHERE user_id = $1 AND round = $2', [userId, round])

  if (teams.length > 0) {
    // Parse scores into a map: matchIndex -> score
    const scoreMap: Record<number, { home: number; away: number; homePen: number | null; awayPen: number | null }> = {}
    if (scores && Array.isArray(scores)) {
      for (const s of scores) {
        scoreMap[s.matchIndex] = { home: s.home, away: s.away, homePen: s.homePen ?? null, awayPen: s.awayPen ?? null }
      }
    }

    // Una llave (teams[2i] vs teams[2i+1]) es "tanda predicha" si el usuario puso
    // empate en los 90' + penales. Se guarda el par en orden canónico.
    const pickRows: string[] = []
    const pickParams: unknown[] = [userId, round]
    for (let i = 0; i < Math.ceil(teams.length / 2); i++) {
      const a = teams[2 * i], b = teams[2 * i + 1]
      const s = scoreMap[i]
      if (a && b && s && s.home === s.away && s.homePen !== null && s.awayPen !== null) {
        const [x, y] = [a, b].sort()
        const base = pickParams.length + 1
        pickParams.push(x, y)
        pickRows.push(`($1, $2, $${base}, $${base + 1})`)
      }
    }
    if (pickRows.length > 0) {
      await db.query(
        `INSERT INTO bracket_shootout_picks (user_id, round, team_a, team_b) VALUES ${pickRows.join(', ')} ON CONFLICT DO NOTHING`,
        pickParams
      )
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

  // Bono de penales acumulado: tandas predichas que casan con tandas reales.
  const bonusRes = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM bracket_shootout_picks p
     JOIN ko_shootouts k ON p.round = k.round AND p.team_a = k.team_a AND p.team_b = k.team_b
     WHERE p.user_id = $1`,
    [userId]
  )
  const shootoutBonus = (bonusRes.rows[0]?.n ?? 0) * SHOOTOUT_BONUS

  return c.json({ predictions, scores, shootoutBonus })
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

// Llaves reales que fueron a penales (para el bono y para mostrar).
bracketRouter.get('/shootouts', async (c) => {
  const result = await db.query('SELECT round, team_a, team_b FROM ko_shootouts ORDER BY round')
  return c.json({ shootouts: result.rows })
})

// Admin: registra qué llaves eliminatorias reales se definieron por penales.
bracketRouter.post('/admin/shootouts', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const userResult = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId])
  if (!userResult.rows[0]?.is_admin) return c.json({ error: 'Unauthorized' }, 403)

  const { round, ties } = await c.req.json() // ties: [[teamA, teamB], ...]
  if (!ROUND_SLOTS[round]) return c.json({ error: 'Ronda inválida' }, 400)

  await db.query('DELETE FROM ko_shootouts WHERE round = $1', [round])
  if (Array.isArray(ties) && ties.length > 0) {
    const rows: string[] = []
    const params: unknown[] = [round]
    for (const pair of ties) {
      if (!Array.isArray(pair) || pair.length < 2) continue
      const [a, b] = [pair[0], pair[1]].sort()
      const base = params.length + 1
      params.push(a, b)
      rows.push(`($1, $${base}, $${base + 1})`)
    }
    if (rows.length > 0) {
      await db.query(
        `INSERT INTO ko_shootouts (round, team_a, team_b) VALUES ${rows.join(', ')} ON CONFLICT DO NOTHING`,
        params
      )
    }
  }
  return c.json({ round, count: Array.isArray(ties) ? ties.length : 0 })
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
