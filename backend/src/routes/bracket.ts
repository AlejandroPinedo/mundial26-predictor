import { Hono } from 'hono'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../types.js'
import { SHOOTOUT_BONUS } from '../utils/shootoutBonus.js'
import { ORACLE_NAME } from '../oracle/lock.js'

export const bracketRouter = new Hono<{ Variables: AppVariables }>()

// Cierre oficial de Octavos (Canadá vs Marruecos, 4 jul 2026 13:00 ET = 17:00 UTC).
// Fallback usado mientras Octavos aún no está sembrado en `matches`.
const OCTAVOS_KICKOFF_FALLBACK = '2026-07-04T17:00:00Z'

// Ventana de predicción del bracket. Se REABRIÓ en jul 2026 (hubo pocas predicciones
// por incidencias del despliegue): antes cerraba al primer partido de eliminatorias
// (Dieciseisavos); ahora cierra al inicio de OCTAVOS. Cuando Octavos ya esté sembrado
// en `matches`, el cierre es su primer partido; mientras tanto usa el fallback oficial.
async function getBracketDeadline(): Promise<Date | null> {
  const { rows } = await db.query(
    `SELECT MIN(match_date) AS deadline FROM matches WHERE LOWER(stage) LIKE '%octavos%'`
  )
  const firstOctavos = rows[0]?.deadline
  return firstOctavos ? new Date(firstOctavos) : new Date(OCTAVOS_KICKOFF_FALLBACK)
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

// Los picks de bracket se guardan con prefijo de slot ("5:México") para poder
// restaurar cada equipo en su llave al recargar la página. Este helper devuelve el
// nombre PLANO (sin prefijo), usado para casar contra bracket_results/ko_shootouts
// (que guardan nombres planos). Tolera picks viejos ya sin prefijo.
const plainTeam = (t: string): string => {
  const i = t.indexOf(':')
  return i > 0 && /^\d+$/.test(t.slice(0, i)) ? t.slice(i + 1) : t
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

  // Candado de justicia (reapertura jul 2026): al reabrir el bracket, los 16avos
  // YA JUGADOS no se pueden (re)predecir para ganar puntos "gratis". Bloqueamos en
  // round16 los equipos que ya avanzaron (bracket_results.round16), SALVO los que el
  // usuario ya tuviera guardados de antes (no castigar a quien predijo a tiempo).
  // Se calcula ANTES del DELETE porque necesitamos sus picks previos. Solo afecta
  // qué se INSERTA en bracket_predictions; el arreglo `teams` completo se conserva
  // para no descuadrar el cálculo de tandas de penales (pares 2i/2i+1 = octavos).
  let blockedRound16 = new Set<string>()
  if (round === 'round16') {
    const [decidedRes, existingRes] = await Promise.all([
      db.query(`SELECT team FROM bracket_results WHERE round = 'round16'`),
      db.query('SELECT team FROM bracket_predictions WHERE user_id = $1 AND round = $2', [userId, round]),
    ])
    const existing = new Set(existingRes.rows.map((r: { team: string }) => plainTeam(r.team)))
    blockedRound16 = new Set(
      decidedRes.rows.map((r: { team: string }) => r.team).filter((t: string) => !existing.has(t)),
    )
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
        // Nombres PLANOS para casar con ko_shootouts (que no lleva prefijo de slot).
        const [x, y] = [plainTeam(a), plainTeam(b)].sort()
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
      if (blockedRound16.has(plainTeam(team))) return // 16avo ya jugado: no se guarda como pick
      const matchIndex = Math.floor(idx / 2)
      const score = scoreMap[matchIndex]
      const base = params.length + 1
      params.push(team, score?.home ?? null, score?.away ?? null, score?.homePen ?? null, score?.awayPen ?? null)
      rowPlaceholders.push(`($1, $2, $${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4})`)
    })

    if (rowPlaceholders.length > 0) {
      await db.query(
        `INSERT INTO bracket_predictions (user_id, round, team, home_score, away_score, home_pen, away_pen) VALUES ${rowPlaceholders.join(', ')}`,
        params
      )
    }
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
      // Slot real desde el prefijo ("5:México" → 5) para casar el marcador con su
      // llave al recargar. Picks viejos sin prefijo → posición de inserción (legacy).
      const colon = row.team.indexOf(':')
      const slot =
        colon > 0 && /^\d+$/.test(row.team.slice(0, colon))
          ? Number(row.team.slice(0, colon))
          : predictions[row.round].length - 1
      const matchIndex = Math.floor(slot / 2)
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

  // Marcadores exactos predichos de partidos KO (para restaurarlos al recargar).
  const koScoresRes = await db.query(
    'SELECT code, home_score, away_score, home_pen, away_pen FROM bracket_ko_scores WHERE user_id = $1',
    [userId],
  )

  return c.json({ predictions, scores, shootoutBonus, koScores: koScoresRes.rows })
})

// Guarda los marcadores EXACTOS predichos de partidos KO (para el bonus +2). SOLO
// acepta partidos que AÚN NO empezaron (los ya jugados quedan bloqueados). Upsert por
// código de partido. La eliminatoria a penales guarda también la tanda (home/away_pen).
bracketRouter.post('/scores', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { scores } = await c.req.json() // [{ code, home, away, homePen, awayPen }]
  if (!Array.isArray(scores)) return c.json({ error: 'scores debe ser un arreglo' }, 400)

  const codes = [...new Set(scores.map((s) => Number(s.code)).filter((n) => Number.isInteger(n)))]
  if (codes.length === 0) return c.json({ saved: 0 })

  // Kickoffs de los partidos referenciados → bloquear los ya empezados.
  const { rows: koMatches } = await db.query(
    'SELECT group_name, match_date FROM matches WHERE group_name = ANY($1)',
    [codes.map((n) => `M${n}`)],
  )
  const kickoffByCode = new Map<number, Date>()
  for (const m of koMatches) kickoffByCode.set(Number(m.group_name.slice(1)), new Date(m.match_date))

  const now = new Date()
  let saved = 0
  for (const s of scores) {
    const code = Number(s.code)
    const kickoff = kickoffByCode.get(code)
    if (!kickoff || now >= kickoff) continue // no sembrado o ya empezó → bloqueado
    if (s.home == null || s.away == null) continue
    const draw = Number(s.home) === Number(s.away)
    await db.query(
      `INSERT INTO bracket_ko_scores (user_id, code, home_score, away_score, home_pen, away_pen)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, code)
       DO UPDATE SET home_score = $3, away_score = $4, home_pen = $5, away_pen = $6`,
      [userId, code, Number(s.home), Number(s.away), draw ? s.homePen ?? null : null, draw ? s.awayPen ?? null : null],
    )
    saved++
  }
  return c.json({ saved })
})

// Bracket de OTRO usuario (o del Oráculo) para el comparador del ranking. Devuelve
// los equipos PLANOS por ronda (regexp_replace tolera el prefijo de slot "5:México").
bracketRouter.get('/user/:username', authMiddleware, async (c) => {
  const username = c.req.param('username')
  const emptyPreds = (): Record<string, string[]> => ({
    round16: [], quarter: [], semi: [], finalist: [], champion: [],
  })

  // El Pez Oráculo no es un usuario: su bracket congelado vive en oracle_bracket.
  if (username === ORACLE_NAME) {
    const r = await db.query(
      `SELECT round, regexp_replace(team, '^[0-9]+:', '') AS team FROM oracle_bracket ORDER BY round, team`,
    )
    const preds = emptyPreds()
    for (const row of r.rows) if (preds[row.round]) preds[row.round].push(row.team)
    // El Oráculo no tiene marcadores exactos predichos (su bracket es solo avance).
    return c.json({ username, predictions: preds, koScores: [] })
  }

  const userRes = await db.query('SELECT id FROM users WHERE username = $1', [username])
  if (!userRes.rows[0]) return c.json({ error: 'Usuario no encontrado' }, 404)
  const targetId = userRes.rows[0].id

  const r = await db.query(
    `SELECT round, regexp_replace(team, '^[0-9]+:', '') AS team
     FROM bracket_predictions WHERE user_id = $1 ORDER BY round, team`,
    [targetId],
  )
  const preds = emptyPreds()
  for (const row of r.rows) if (preds[row.round]) preds[row.round].push(row.team)

  // Marcadores exactos predichos (para validar el bonus +2 en el comparador).
  const koScoresRes = await db.query(
    'SELECT code, home_score, away_score, home_pen, away_pen FROM bracket_ko_scores WHERE user_id = $1',
    [targetId],
  )
  return c.json({ username, predictions: preds, koScores: koScoresRes.rows })
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
    if (correctTeams.has(plainTeam(pred.team))) {
      pointsMap[pred.user_id] = (pointsMap[pred.user_id] || 0) + pts
    }
  }

  return c.json({ round, correct: teams, pointsAwarded: Object.keys(pointsMap).length })
})
