// Pez Oráculo como competidor del ranking.
//
// REGLA DE JUSTICIA (no negociable):
//   1. Las predicciones de la JORNADA 1 (los primeros 24 partidos por fecha, el
//      primer partido de cada selección) se CONGELAN con el Elo pre-torneo
//      (snapshot puro, sin resultados). Esto refleja la decisión de "predecir
//      desde el inicio sin conocer ningún resultado".
//   2. El resto se congela de forma ADAPTATIVA en su saque inicial, usando el
//      Elo derivado SOLO de partidos con fecha ANTERIOR a la del partido. Por
//      tanto una predicción NUNCA incorpora su propio resultado.
//   3. Un pick, una vez congelado, jamás se recalcula (INSERT ... ON CONFLICT
//      DO NOTHING). Esto impide "cambiar de opinión" tras ver el marcador.
//
// El Oráculo NO es un usuario: no existe en la tabla `users`. Se materializa
// como una fila virtual en el endpoint del leaderboard (ver computeOracleEntry).
import { currentElo, type EloMatch } from './elo.js'
import { predictMatch } from './predict.js'
import { HOST_NATIONS } from './ratings.js'
import { BRACKET_ROUND_POINTS } from './bracket.js'
import { calculatePoints } from '../utils/scoring.js'

export const ORACLE_NAME = 'Pez Oráculo'
export const GROUP_STAGE = 'Fase de Grupos'
// Jornada 1 = primer partido de las 48 selecciones = 12 grupos × 2 partidos.
export const MATCHDAY_ONE_COUNT = 24

// Interfaz mínima para poder testear con un doble de la BD.
export type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>
}

// DDL canónico de la tabla. Idempotente. Lo invocan db.ts (al arrancar) y
// lockOraclePredictions (para evitar carreras en el script semilla).
export async function ensureOracleTable(db: Queryable): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS oracle_predictions (
      match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
      predicted_home INTEGER NOT NULL,
      predicted_away INTEGER NOT NULL,
      locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

type MatchRow = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
}

// Congela las predicciones del Oráculo que ya estén "vencidas":
//   - los partidos de jornada 1 (siempre, con Elo pre-torneo), y
//   - cualquier otro partido de grupos cuyo saque inicial ya pasó.
// Idempotente: nunca re-escribe un pick existente. Devuelve cuántos congeló.
export async function lockOraclePredictions(
  db: Queryable,
  opts: { now?: Date; matchdayOneCount?: number } = {},
): Promise<number> {
  const now = opts.now ?? new Date()
  const matchdayOneCount = opts.matchdayOneCount ?? MATCHDAY_ONE_COUNT

  await ensureOracleTable(db) // evita carreras: garantiza la tabla antes de leer/escribir

  const { rows: matches } = (await db.query(
    `SELECT id, home_team, away_team, match_date, home_score, away_score
       FROM matches WHERE stage = $1 ORDER BY match_date ASC`,
    [GROUP_STAGE],
  )) as { rows: MatchRow[] }

  const { rows: lockedRows } = await db.query('SELECT match_id FROM oracle_predictions')
  const locked = new Set(lockedRows.map((r) => r.match_id))

  // Los primeros 24 por fecha = jornada 1.
  const matchdayOne = new Set(matches.slice(0, matchdayOneCount).map((m) => m.id))

  let count = 0
  for (const m of matches) {
    if (locked.has(m.id)) continue

    const kickoff = new Date(m.match_date)
    const isMatchdayOne = matchdayOne.has(m.id)
    // Solo congelamos jornada 1 (al inicio) o partidos cuyo saque ya pasó.
    if (!isMatchdayOne && kickoff > now) continue

    // Elo: jornada 1 → snapshot pre-torneo (sin resultados). Resto → solo
    // resultados de partidos ESTRICTAMENTE anteriores a este (nunca el propio).
    const basis: EloMatch[] = isMatchdayOne
      ? []
      : matches.filter(
          (x) =>
            x.home_score !== null &&
            x.away_score !== null &&
            new Date(x.match_date) < kickoff,
        )
    const elo = currentElo(basis)

    const pred = predictMatch(m.home_team, m.away_team, {
      neutralVenue: !HOST_NATIONS.has(m.home_team),
      elo,
    })
    if (!pred) continue // equipo desconocido (ej. placeholder de eliminatoria)

    await db.query(
      `INSERT INTO oracle_predictions (match_id, predicted_home, predicted_away, locked_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (match_id) DO NOTHING`,
      [m.id, pred.mostLikely.home, pred.mostLikely.away],
    )
    count++
  }

  return count
}

export type OracleEntry = {
  username: string
  total_predictions: string
  total_points: string
  is_oracle: true
}

// Construye la fila virtual del Oráculo para el leaderboard. Sus puntos se
// calculan EN VIVO con la misma función que los usuarios (calculatePoints),
// sobre los partidos ya jugados. Devuelve null si aún no tiene predicciones.
export async function computeOracleEntry(db: Queryable): Promise<OracleEntry | null> {
  const { rows } = await db.query(
    `SELECT op.predicted_home, op.predicted_away, m.home_score, m.away_score
       FROM oracle_predictions op
       JOIN matches m ON op.match_id = m.id`,
  )
  if (rows.length === 0) return null

  let points = 0
  for (const r of rows) {
    if (r.home_score === null || r.away_score === null) continue
    points += calculatePoints(
      { home: r.predicted_home, away: r.predicted_away },
      { home: r.home_score, away: r.away_score },
    )
  }

  // Puntos de bracket: equipos del Oráculo que acertaron cada ronda (mismos
  // pesos que los usuarios). Resiliente: si la tabla aún no existe, suma 0.
  let bracketPoints = 0
  try {
    const { rows: hits } = await db.query(
      `SELECT ob.round
         FROM oracle_bracket ob
         JOIN bracket_results r ON ob.round = r.round AND ob.team = r.team`,
    )
    for (const h of hits) bracketPoints += BRACKET_ROUND_POINTS[h.round] ?? 0
  } catch {
    // oracle_bracket aún no sembrada — el Oráculo compite solo con grupos.
  }

  return {
    username: ORACLE_NAME,
    total_predictions: String(rows.length),
    total_points: String(points + bracketPoints),
    is_oracle: true,
  }
}
