import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'
import { calculatePoints } from '../utils/scoring.js'
import { computeOracleEntry, lockOraclePredictions, ORACLE_NAME } from '../oracle/lock.js'

export const predictionsRouter = new Hono<{ Variables: AppVariables }>()

predictionsRouter.get('/matches', async (c) => {
  const result = await db.query('SELECT * FROM matches ORDER BY match_date ASC')
  return c.json({ matches: result.rows })
})


predictionsRouter.get('/standings/:group', async (c) => {
  const group = c.req.param('group').toUpperCase()

  const result = await db.query(
    `SELECT
      team,
      COUNT(*) as played,
      SUM(CASE WHEN (home_team = team AND home_score > away_score)
                 OR (away_team = team AND away_score > home_score) THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN home_score = away_score THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN (home_team = team AND home_score < away_score)
                 OR (away_team = team AND away_score < home_score) THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN home_team = team THEN home_score ELSE away_score END) as gf,
      SUM(CASE WHEN home_team = team THEN away_score ELSE home_score END) as ga,
      SUM(CASE WHEN home_team = team THEN home_score - away_score
               ELSE away_score - home_score END) as gd,
      SUM(CASE
        WHEN (home_team = team AND home_score > away_score)
          OR (away_team = team AND away_score > home_score) THEN 3
        WHEN home_score = away_score THEN 1
        ELSE 0 END) as points
     FROM (
       SELECT home_team as team, away_team, home_score, away_score, group_name FROM matches
       WHERE home_score IS NOT NULL AND group_name = $1
       UNION ALL
       SELECT away_team as team, home_team, home_score, away_score, group_name FROM matches
       WHERE home_score IS NOT NULL AND group_name = $1
     ) t
     GROUP BY team
     ORDER BY points DESC, gd DESC, gf DESC`,
    [group]
  )

  return c.json({ standings: result.rows, group })
})

predictionsRouter.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { matchId, predictedHome, predictedAway } = await c.req.json()

  if (!matchId || predictedHome === undefined || predictedAway === undefined) {
    return c.json({ error: 'matchId, predictedHome and predictedAway are required' }, 400)
  }

  const match = await db.query('SELECT * FROM matches WHERE id = $1', [matchId])
  if (!match.rows[0]) return c.json({ error: 'Match not found' }, 404)

    const matchRow = match.rows[0]
    const kickoff = new Date(matchRow.match_date)
    if (new Date() > kickoff) {
        return c.json({ error: 'Este partido ya comenzó — no puedes modificar tu predicción' }, 400)
    }

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
            m.home_score, m.away_score, m.stadium_name
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
      `SELECT 
         u.username,
         COUNT(p.id) as total_predictions,
         COALESCE(SUM(p.points), 0) + COALESCE(bp.points, 0) as total_points
       FROM users u
       LEFT JOIN predictions p ON u.id = p.user_id
       LEFT JOIN (
         SELECT bp.user_id, SUM(
           CASE bp.round
             WHEN 'round16' THEN 1
             WHEN 'quarter' THEN 2
             WHEN 'semi' THEN 4
             WHEN 'finalist' THEN 6
             WHEN 'champion' THEN 10
             ELSE 0
           END
         ) as points
         FROM bracket_predictions bp
         JOIN bracket_results br ON bp.round = br.round AND (bp.team = br.team OR split_part(bp.team, ':', 2) = br.team)
         GROUP BY bp.user_id
       ) bp ON u.id = bp.user_id
       GROUP BY u.id, u.username, bp.points
       ORDER BY total_points DESC`
    )

    // El Pez Oráculo compite como fila virtual (no es un usuario). Se inserta
    // y reordenamos por puntos para que ocupe su posición real en la tabla.
    // Un fallo aquí nunca debe tumbar el ranking de los usuarios.
    const rows = result.rows
    try {
      const oracle = await computeOracleEntry(db)
      if (oracle) {
        rows.push(oracle)
        rows.sort((a, b) => Number(b.total_points) - Number(a.total_points))
      }
    } catch (err) {
      console.error('Error al calcular la fila del Oráculo:', err)
    }

    return c.json({ leaderboard: rows })
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

    // Congela los picks del Oráculo que ya estén vencidos (los del partido recién
    // cerrado y cualquier otro cuyo saque pasó). Nunca usa su propio resultado.
    // Si falla, no debe romper la carga del resultado del admin.
    try {
      await lockOraclePredictions(db)
    } catch (err) {
      console.error('Error al congelar predicciones del Oráculo:', err)
    }

    return c.json({ updated: preds.rows.length })
  })
  
predictionsRouter.get('/stats', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const statsResult = await db.query(
    `SELECT
      COUNT(*) as total_predictions,
      COALESCE(SUM(p.points), 0) + COALESCE((
        SELECT SUM(
          CASE bp.round
            WHEN 'round16' THEN 1
            WHEN 'quarter' THEN 2
            WHEN 'semi' THEN 4
            WHEN 'finalist' THEN 6
            WHEN 'champion' THEN 10
            ELSE 0
          END
        )
        FROM bracket_predictions bp
        JOIN bracket_results br ON bp.round = br.round AND (bp.team = br.team OR split_part(bp.team, ':', 2) = br.team)
        WHERE bp.user_id = $1
      ), 0) as total_points,
      SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) as exact_scores,
      SUM(CASE WHEN p.points >= 1 THEN 1 ELSE 0 END) as correct_results,
      SUM(CASE WHEN p.points IS NOT NULL THEN 1 ELSE 0 END) as played
     FROM predictions p WHERE p.user_id = $1`,
    [userId]
  )

  const rankResult = await db.query(
    `WITH user_points AS (
       SELECT 
         u.id as user_id,
         COALESCE(SUM(p.points), 0) + COALESCE(bp.points, 0) as pts
       FROM users u
       LEFT JOIN predictions p ON u.id = p.user_id
       LEFT JOIN (
         SELECT bp.user_id, SUM(
           CASE bp.round
             WHEN 'round16' THEN 1
             WHEN 'quarter' THEN 2
             WHEN 'semi' THEN 4
             WHEN 'finalist' THEN 6
             WHEN 'champion' THEN 10
             ELSE 0
           END
         ) as points
         FROM bracket_predictions bp
         JOIN bracket_results br ON bp.round = br.round AND (bp.team = br.team OR split_part(bp.team, ':', 2) = br.team)
         GROUP BY bp.user_id
       ) bp ON u.id = bp.user_id
       GROUP BY u.id, bp.points
     )
     SELECT COUNT(*) + 1 as rank
     FROM user_points
     WHERE pts > (SELECT pts FROM user_points WHERE user_id = $1)`,
    [userId]
  )

  const totalPlayersResult = await db.query('SELECT COUNT(*) as total FROM users')

  return c.json({
    stats: statsResult.rows[0],
    rank: rankResult.rows[0].rank,
    totalPlayers: totalPlayersResult.rows[0].total
  })
})

predictionsRouter.get('/user/:username', authMiddleware, async (c) => {
  const username = c.req.param('username')

  // El Pez Oráculo no es un usuario: servimos sus picks congelados en el mismo
  // formato que los de un jugador, calculando los puntos al vuelo (calculatePoints).
  if (username === ORACLE_NAME) {
    const oracleRes = await db.query(
      `SELECT op.match_id, op.predicted_home, op.predicted_away,
              m.home_team, m.away_team, m.match_date, m.stage,
              m.home_score, m.away_score, m.stadium_name
       FROM oracle_predictions op
       JOIN matches m ON op.match_id = m.id
       ORDER BY m.match_date ASC`
    )
    const predictions = oracleRes.rows.map((r) => ({
      id: `oracle-${r.match_id}`,
      match_id: r.match_id,
      predicted_home: r.predicted_home,
      predicted_away: r.predicted_away,
      home_team: r.home_team,
      away_team: r.away_team,
      match_date: r.match_date,
      stage: r.stage,
      home_score: r.home_score,
      away_score: r.away_score,
      stadium_name: r.stadium_name,
      points:
        r.home_score === null || r.away_score === null
          ? null
          : calculatePoints(
              { home: r.predicted_home, away: r.predicted_away },
              { home: r.home_score, away: r.away_score }
            ),
    }))
    return c.json({ username: ORACLE_NAME, predictions })
  }

  const userRes = await db.query('SELECT id, username FROM users WHERE username = $1', [username])
  if (!userRes.rows[0]) {
    return c.json({ error: 'Usuario no encontrado' }, 404)
  }
  const targetUserId = userRes.rows[0].id

  const result = await db.query(
    `SELECT p.*, m.home_team, m.away_team, m.match_date, m.stage,
            m.home_score, m.away_score, m.stadium_name
     FROM predictions p
     JOIN matches m ON p.match_id = m.id
     WHERE p.user_id = $1
     ORDER BY m.match_date ASC`,
    [targetUserId]
  )

  return c.json({ username: userRes.rows[0].username, predictions: result.rows })
})

predictionsRouter.get('/global-insights', async (c) => {
  const champRes = await db.query(
    `SELECT team, COUNT(*)::int as count 
     FROM bracket_predictions 
     WHERE round = 'champion' 
     GROUP BY team 
     ORDER BY count DESC 
     LIMIT 5`
  )

  const avgScoresRes = await db.query(
    `SELECT 
       ROUND(AVG(predicted_home), 2)::float as avg_home,
       ROUND(AVG(predicted_away), 2)::float as avg_away
     FROM predictions`
  )

  const popularScoresRes = await db.query(
    `SELECT 
       predicted_home, 
       predicted_away, 
       COUNT(*)::int as count
     FROM predictions
     GROUP BY predicted_home, predicted_away
     ORDER BY count DESC
     LIMIT 5`
  )

  const hotMatchesRes = await db.query(
    `SELECT 
       p.match_id,
       m.home_team,
       m.away_team,
       m.match_date,
       m.stage,
       COUNT(p.id)::int as prediction_count
     FROM predictions p
     JOIN matches m ON p.match_id = m.id
     GROUP BY p.match_id, m.home_team, m.away_team, m.match_date, m.stage
     ORDER BY prediction_count DESC
     LIMIT 5`
  )

  const totalPredsRes = await db.query('SELECT COUNT(*)::int as count FROM predictions')

  const avgPointsRes = await db.query(
    `SELECT ROUND(AVG(points), 2)::float as avg_points 
     FROM predictions 
     WHERE points IS NOT NULL`
  )

  return c.json({
    mostPredictedChampions: champRes.rows,
    averageScores: avgScoresRes.rows[0] || { avg_home: 0, avg_away: 0 },
    popularScores: popularScoresRes.rows,
    hotMatches: hotMatchesRes.rows,
    totalPredictions: totalPredsRes.rows[0]?.count || 0,
    averagePoints: avgPointsRes.rows[0]?.avg_points || 0
  })
})