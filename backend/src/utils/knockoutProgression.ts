// Propagación automática del cuadro eliminatorio WC2026: resuelve los equipos de
// cada ronda (Octavos→Final + 3er puesto) a partir de los GANADORES/PERDEDORES de
// los partidos previos, para no subir los cruces a mano en cada llave.
//
// Cableado OFICIAL — paridad estricta con frontend/src/utils/bracketStructure.ts
// (R32_TO_R16_SLOT + sus comentarios). Números de partido oficiales FIFA (M73..M104):
//   Octavos:  M89=W74/77 M90=W73/75 M91=W76/78 M92=W79/80
//             M93=W83/84 M94=W81/82 M95=W86/88 M96=W85/87
//   Cuartos:  M97=W89/90 M98=W93/94 M99=W91/92 M100=W95/96
//   Semis:    M101=W97/98 M102=W99/100
//   3er:      M103=L101/L102     Final: M104=W101/W102
//
// Los 16avos (M73..M88) los siembra scripts/seed-knockout-matches.ts. Esta capa SOLO
// resuelve equipos de rondas YA SEMBRADAS; nunca inserta partidos ni toca marcadores.

import type { Queryable } from '../oracle/lock.js'
import { winnerOf, type KoMatchRow } from './deriveBracketResults.js'

type Feed = { from: number; take: 'W' | 'L' }
export type KoNode = { code: number; stage: string; a: Feed; b: Feed }

const W = (from: number): Feed => ({ from, take: 'W' })
const L = (from: number): Feed => ({ from, take: 'L' })

export const KO_TREE: KoNode[] = [
  { code: 89, stage: 'Octavos', a: W(74), b: W(77) },
  { code: 90, stage: 'Octavos', a: W(73), b: W(75) },
  { code: 91, stage: 'Octavos', a: W(76), b: W(78) },
  { code: 92, stage: 'Octavos', a: W(79), b: W(80) },
  { code: 93, stage: 'Octavos', a: W(83), b: W(84) },
  { code: 94, stage: 'Octavos', a: W(81), b: W(82) },
  { code: 95, stage: 'Octavos', a: W(86), b: W(88) },
  { code: 96, stage: 'Octavos', a: W(85), b: W(87) },
  { code: 97, stage: 'Cuartos', a: W(89), b: W(90) },
  { code: 98, stage: 'Cuartos', a: W(93), b: W(94) },
  { code: 99, stage: 'Cuartos', a: W(91), b: W(92) },
  { code: 100, stage: 'Cuartos', a: W(95), b: W(96) },
  { code: 101, stage: 'Semifinales', a: W(97), b: W(98) },
  { code: 102, stage: 'Semifinales', a: W(99), b: W(100) },
  { code: 103, stage: 'Tercer Puesto', a: L(101), b: L(102) },
  { code: 104, stage: 'Final', a: W(101), b: W(102) },
]

/** Perdedor de un partido ya definido (el que no ganó). null si aún indeciso. */
export function loserOf(m: KoMatchRow): string | null {
  const w = winnerOf(m)
  if (!w) return null
  return w === m.home_team ? m.away_team : m.home_team
}

const resolveFeed = (f: Feed, byCode: Map<number, KoMatchRow>): string | null => {
  const m = byCode.get(f.from)
  if (!m) return null
  return f.take === 'W' ? winnerOf(m) : loserOf(m)
}

export type ResolvedMatchup = { code: number; stage: string; home: string | null; away: string | null }

/**
 * Cálculo PURO: dado el mapa código→partido de los KO ya jugados/sembrados,
 * devuelve por cada nodo del árbol los equipos resueltos (o null si su feeder aún
 * no tiene ganador). No decide nada sobre marcadores.
 */
export function resolveKnockout(byCode: Map<number, KoMatchRow>): ResolvedMatchup[] {
  return KO_TREE.map((n) => ({
    code: n.code,
    stage: n.stage,
    home: resolveFeed(n.a, byCode),
    away: resolveFeed(n.b, byCode),
  }))
}

export type ProgressionSummary = { resolved: { code: number; home: string; away: string }[] }

/**
 * Lee los KO de `matches`, resuelve los equipos de las rondas siguientes desde los
 * ganadores y ACTUALIZA (nunca inserta ni toca marcadores) los partidos YA sembrados
 * cuyos equipos eran placeholders o cambiaron. Idempotente y aislada.
 */
export async function applyKnockoutProgression(db: Queryable): Promise<ProgressionSummary> {
  const { rows } = await db.query(
    `SELECT group_name, stage, home_team, away_team, home_score, away_score, home_pen, away_pen
     FROM matches WHERE group_name ~ '^M[0-9]+$'`,
  )
  const byCode = new Map<number, KoMatchRow & { group_name: string }>()
  for (const r of rows as (KoMatchRow & { group_name: string })[]) {
    const code = Number(r.group_name.slice(1))
    if (!Number.isNaN(code)) byCode.set(code, r)
  }

  const resolved: { code: number; home: string; away: string }[] = []
  for (const m of resolveKnockout(byCode)) {
    if (m.home == null || m.away == null) continue // feeder aún indeciso
    const current = byCode.get(m.code)
    if (!current) continue // ronda aún no sembrada: aquí no inventamos partidos
    if (current.home_team === m.home && current.away_team === m.away) continue // ya resuelto
    await db.query('UPDATE matches SET home_team = $1, away_team = $2 WHERE group_name = $3', [
      m.home,
      m.away,
      `M${m.code}`,
    ])
    resolved.push({ code: m.code, home: m.home, away: m.away })
  }
  return { resolved }
}
