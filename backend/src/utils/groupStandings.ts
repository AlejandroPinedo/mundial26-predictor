import { getElo } from '../oracle/ratings.js'

// Tabla de posiciones de un grupo con el desempate oficial FIFA Mundial 2026.
// Espejo del cálculo del frontend (frontend/src/utils/standings.ts): mantener
// ambos sincronizados. Orden de criterios:
//  1. Puntos (todos los partidos del grupo)
//  2-4. Enfrentamientos directos entre empatados: pts, diferencia de goles, goles a favor
//  5. Diferencia de goles general
//  6. Goles a favor general
//  7. Conducta (fair play) — sin datos de tarjetas → se omite
//  8. Ranking FIFA — aproximado con Elo
//  (final) Orden alfabético (determinista).
// El head-to-head es recursivo: si un subgrupo sigue empatado se recalcula entre
// los que quedan; si no separa a nadie, se pasa a los criterios generales.

export type MatchRow = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
}

export type StandingRow = {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  gd: number
  points: number
}

type Resolved = { home: string; away: string; hs: number; as: number }
type Mini = { pts: number; gd: number; gf: number }

function h2hTable(names: Set<string>, played: Resolved[]): Record<string, Mini> {
  const t: Record<string, Mini> = {}
  for (const n of names) t[n] = { pts: 0, gd: 0, gf: 0 }
  for (const m of played) {
    if (!names.has(m.home) || !names.has(m.away)) continue
    t[m.home].gf += m.hs; t[m.home].gd += m.hs - m.as
    t[m.away].gf += m.as; t[m.away].gd += m.as - m.hs
    if (m.hs > m.as) t[m.home].pts += 3
    else if (m.hs < m.as) t[m.away].pts += 3
    else { t[m.home].pts += 1; t[m.away].pts += 1 }
  }
  return t
}

function breakOverall(block: StandingRow[]): StandingRow[] {
  return [...block].sort(
    (a, b) => b.gd - a.gd || b.gf - a.gf || getElo(b.team) - getElo(a.team) || a.team.localeCompare(b.team),
  )
}

function breakHeadToHead(block: StandingRow[], played: Resolved[]): StandingRow[] {
  const names = new Set(block.map((t) => t.team))
  const h2h = h2hTable(names, played)
  const sorted = [...block].sort((a, b) => {
    const x = h2h[a.team], y = h2h[b.team]
    return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf
  })
  const eq = (a: StandingRow, b: StandingRow) => {
    const x = h2h[a.team], y = h2h[b.team]
    return x.pts === y.pts && x.gd === y.gd && x.gf === y.gf
  }
  const out: StandingRow[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length && eq(sorted[j], sorted[i])) j++
    const sub = sorted.slice(i, j)
    if (sub.length === 1) out.push(sub[0])
    else if (sub.length === block.length) out.push(...breakOverall(sub))
    else out.push(...breakHeadToHead(sub, played))
    i = j
  }
  return out
}

function rankGroup(rows: StandingRow[], played: Resolved[]): StandingRow[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points)
  const out: StandingRow[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length && sorted[j].points === sorted[i].points) j++
    const block = sorted.slice(i, j)
    out.push(...(block.length > 1 ? breakHeadToHead(block, played) : block))
    i = j
  }
  return out
}

/**
 * Calcula la tabla de un grupo a partir de TODOS sus partidos (jugados o no).
 * Solo cuentan los que tienen marcador. Devuelve [] si aún no se jugó ninguno
 * (para conservar el estado "sin partidos jugados aún" del frontend).
 */
export function computeGroupStandings(matches: MatchRow[]): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  const ensure = (team: string): StandingRow => {
    let r = rows.get(team)
    if (!r) { r = { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }; rows.set(team, r) }
    return r
  }
  const played: Resolved[] = []
  for (const m of matches) { ensure(m.home_team); ensure(m.away_team) }
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    const hs = Number(m.home_score), as = Number(m.away_score)
    played.push({ home: m.home_team, away: m.away_team, hs, as })
    const h = ensure(m.home_team), a = ensure(m.away_team)
    h.played++; a.played++
    h.gf += hs; h.ga += as; a.gf += as; a.ga += hs
    h.gd = h.gf - h.ga; a.gd = a.gf - a.ga
    if (hs > as) { h.wins++; h.points += 3; a.losses++ }
    else if (hs < as) { a.wins++; a.points += 3; h.losses++ }
    else { h.draws++; a.draws++; h.points += 1; a.points += 1 }
  }
  if (played.length === 0) return []
  return rankGroup([...rows.values()], played)
}
