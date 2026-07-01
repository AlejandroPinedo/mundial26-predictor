// Deriva bracket_results (avance) y ko_shootouts (tandas reales) desde los
// partidos eliminatorios de la tabla `matches`. Es la AUTOMATIZACIÓN que hace que
// el bracket sume al ranking sin carga manual: la SQL del leaderboard
// (routes/predictions.ts) ya une bracket_predictions ⋈ bracket_results, así que
// basta con poblar estas dos tablas.
//
// Fuente de verdad: `matches` (stage KO), cubierta por syncResults/varzesh3.
// La parte de cálculo es PURA y testeable; applyBracketResults hace la escritura.
//
// Semántica de rondas (ver ROUND_SLOTS en routes/bracket.ts): cada ronda de
// bracket_predictions = equipos que ALCANZAN esa instancia = ganadores de la
// ronda anterior. Por eso los dos mapeos están DESFASADOS entre sí:
//
//   AVANCE  (bracket_results, el GANADOR de la etapa llega a…):
//     Dieciseisavos→round16 · Octavos→quarter · Cuartos→semi ·
//     Semifinales→finalist · Final→champion
//
//   PENALES (ko_shootouts, ronda en la que el USUARIO predice esa tanda; los
//   partidos "de round16" son los de Octavos, etc. — los R32 no son predecibles):
//     Octavos→round16 · Cuartos→quarter · Semifinales→semi · Final→finalist
//
// Nombres de equipo PLANOS (sin prefijo de slot): casan con bracket_predictions
// vía split_part(...) en el join del scoring, y con bracket_shootout_picks (que
// guarda nombres planos ordenados) en el join del bono.

import type { Queryable } from '../oracle/lock.js'
import type { ShootoutTie } from './shootoutBonus.js'

export type KoMatchRow = {
  stage: string | null
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  home_pen: number | null
  away_pen: number | null
}

const norm = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

// stage normalizado → ronda de bracket_results del GANADOR.
export const STAGE_TO_ADVANCE_ROUND: Record<string, string> = {
  dieciseisavos: 'round16',
  octavos: 'quarter',
  cuartos: 'semi',
  semifinales: 'finalist',
  final: 'champion',
}

// stage normalizado → ronda de ko_shootouts (donde el usuario predice la tanda).
export const STAGE_TO_SHOOTOUT_ROUND: Record<string, string> = {
  octavos: 'round16',
  cuartos: 'quarter',
  semifinales: 'semi',
  final: 'finalist',
}

/** Ganador del partido (mayor marcador; si empate en el tiempo, mayor en penales). null si aún indeciso. */
export function winnerOf(m: KoMatchRow): string | null {
  const { home_score: hs, away_score: as } = m
  if (hs == null || as == null) return null
  if (hs > as) return m.home_team
  if (as > hs) return m.away_team
  // Empate en el tiempo reglamentario/prórroga → lo define la tanda.
  const { home_pen: hp, away_pen: ap } = m
  if (hp == null || ap == null || hp === ap) return null // sin datos de penales todavía
  return hp > ap ? m.home_team : m.away_team
}

/** true si el partido se definió por penales (empate en el tiempo + tanda con ganador). */
export function wentToShootout(m: KoMatchRow): boolean {
  return (
    m.home_score != null && m.away_score != null && m.home_score === m.away_score &&
    m.home_pen != null && m.away_pen != null && m.home_pen !== m.away_pen
  )
}

export type DerivedBracket = {
  /** ronda → equipos que la alcanzaron (ganadores). */
  resultsByRound: Record<string, string[]>
  /** tandas reales a penales, con la ronda en la que el usuario las predice. */
  shootoutTies: ShootoutTie[]
}

/**
 * Cálculo PURO: dada la lista de partidos eliminatorios, devuelve los avances por
 * ronda y las tandas reales. Ignora etapas fuera de los mapeos (p.ej. tercer
 * puesto) y partidos aún indecisos (sin marcador o empate sin penales).
 */
export function deriveBracketResults(matches: KoMatchRow[]): DerivedBracket {
  const resultsByRound: Record<string, string[]> = {}
  const shootoutTies: ShootoutTie[] = []

  for (const m of matches) {
    const key = norm(m.stage)

    const advRound = STAGE_TO_ADVANCE_ROUND[key]
    if (advRound) {
      const w = winnerOf(m)
      if (w) (resultsByRound[advRound] ??= []).push(w)
    }

    const shootRound = STAGE_TO_SHOOTOUT_ROUND[key]
    if (shootRound && wentToShootout(m)) {
      const [teamA, teamB] = [m.home_team, m.away_team].sort()
      shootoutTies.push({ round: shootRound, teamA, teamB })
    }
  }

  return { resultsByRound, shootoutTies }
}

export type ApplySummary = { bracketRoundsWritten: number; shootoutRoundsWritten: number }

/**
 * Lee los partidos KO de `matches`, deriva avances/tandas y los escribe de forma
 * IDEMPOTENTE (DELETE+INSERT por ronda, mismo patrón que POST /bracket/admin/*).
 * Solo toca las rondas para las que hay datos derivados; nunca borra rondas que
 * aún no tienen partidos sembrados. Aislada: el llamador decide el manejo de error.
 */
export async function applyBracketResults(db: Queryable): Promise<ApplySummary> {
  const { rows } = await db.query(
    `SELECT stage, home_team, away_team, home_score, away_score, home_pen, away_pen
     FROM matches
     WHERE home_score IS NOT NULL AND away_score IS NOT NULL`,
  )

  const { resultsByRound, shootoutTies } = deriveBracketResults(rows as KoMatchRow[])

  let bracketRoundsWritten = 0
  for (const [round, teams] of Object.entries(resultsByRound)) {
    await db.query('DELETE FROM bracket_results WHERE round = $1', [round])
    if (teams.length > 0) {
      const values = teams.map((_, i) => `($${i + 2}, $1)`).join(', ')
      await db.query(`INSERT INTO bracket_results (team, round) VALUES ${values}`, [round, ...teams])
    }
    bracketRoundsWritten++
  }

  // Agrupa las tandas por ronda para reescribir cada ronda de una sola vez.
  const tiesByRound = new Map<string, ShootoutTie[]>()
  for (const t of shootoutTies) {
    const list = tiesByRound.get(t.round) ?? []
    list.push(t)
    tiesByRound.set(t.round, list)
  }

  let shootoutRoundsWritten = 0
  for (const [round, ties] of tiesByRound) {
    await db.query('DELETE FROM ko_shootouts WHERE round = $1', [round])
    const rowsSql: string[] = []
    const params: unknown[] = [round]
    for (const t of ties) {
      const base = params.length + 1
      params.push(t.teamA, t.teamB)
      rowsSql.push(`($1, $${base}, $${base + 1})`)
    }
    if (rowsSql.length > 0) {
      await db.query(
        `INSERT INTO ko_shootouts (round, team_a, team_b) VALUES ${rowsSql.join(', ')} ON CONFLICT DO NOTHING`,
        params,
      )
    }
    shootoutRoundsWritten++
  }

  return { bracketRoundsWritten, shootoutRoundsWritten }
}
