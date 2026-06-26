// Construcción de los Dieciseisavos (R32) del lado servidor, para sembrar los
// partidos eliminatorios en `matches`. Reusa el cálculo de tabla por grupo con
// desempate oficial FIFA (computeGroupStandings) y añade la asignación de los 8
// mejores terceros + el cableado oficial de cruces (M73..M88).
//
// Paridad con frontend/src/utils/standings.ts (buildRoundOf32). El ranking de
// terceros entre grupos no tiene head-to-head (son de grupos distintos): se usa
// pts → gd → gf → Elo → alfabético, consistente con el desempate general del
// backend (groupStandings.breakOverall).

import { computeGroupStandings, type StandingRow, type MatchRow } from './groupStandings.js'
import { getElo } from '../oracle/ratings.js'

export type GroupMatch = MatchRow & { group_name: string }

/** Calcula la tabla de cada grupo a partir de todos los partidos de grupos. */
export function computeAllStandings(matches: GroupMatch[]): Record<string, StandingRow[]> {
  const byGroup: Record<string, GroupMatch[]> = {}
  for (const m of matches) (byGroup[m.group_name] ??= []).push(m)
  const out: Record<string, StandingRow[]> = {}
  for (const [g, ms] of Object.entries(byGroup)) out[g] = computeGroupStandings(ms)
  return out
}

type ThirdRow = StandingRow & { group: string }

/** Los terceros de cada grupo, ordenados por el desempate general (best thirds). */
export function rankThirds(standings: Record<string, StandingRow[]>): ThirdRow[] {
  const thirds: ThirdRow[] = []
  for (const [group, rows] of Object.entries(standings)) {
    if (rows[2]) thirds.push({ ...rows[2], group })
  }
  return thirds.sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      getElo(b.team) - getElo(a.team) ||
      a.team.localeCompare(b.team),
  )
}

/**
 * Asigna los 8 mejores terceros a los ganadores de grupo según las pools
 * oficiales (backtracking). Devuelve { ganadorGrupo: grupoDelTercero } o null.
 */
export function allocateThirds(qualifiedGroups: string[]): Record<string, string> | null {
  const pools: Record<string, string[]> = {
    E: ['A', 'B', 'C', 'D', 'F'],
    I: ['C', 'D', 'F', 'G', 'H'],
    A: ['C', 'E', 'F', 'H', 'I'],
    L: ['E', 'H', 'I', 'J', 'K'],
    G: ['A', 'E', 'H', 'I', 'J'],
    D: ['B', 'E', 'F', 'I', 'J'],
    B: ['E', 'F', 'G', 'I', 'J'],
    K: ['D', 'E', 'I', 'J', 'L'],
  }
  const winners = Object.keys(pools)
  const assignment: Record<string, string> = {}
  const used = new Set<string>()

  function backtrack(index: number): boolean {
    if (index === winners.length) return true
    const w = winners[index]
    for (const g of pools[w]) {
      if (qualifiedGroups.includes(g) && !used.has(g)) {
        assignment[w] = g
        used.add(g)
        if (backtrack(index + 1)) return true
        used.delete(g)
        delete assignment[w]
      }
    }
    return false
  }

  return backtrack(0) ? assignment : null
}

export type R32Matchup = {
  /** Código oficial del partido: 'M73'..'M88'. */
  code: string
  home: string
  away: string
  label: string
  /** true si ambos equipos están resueltos (no placeholders). */
  resolved: boolean
}

/**
 * Construye los 16 cruces oficiales de Dieciseisavos (M73..M88) en orden.
 * Si un grupo/tercero aún no está decidido, usa un placeholder legible
 * ("Ganador Grupo A", "1E vs 3 mejor") y marca resolved=false.
 */
export function buildRoundOf32(standings: Record<string, StandingRow[]>): R32Matchup[] {
  const thirds = rankThirds(standings)
  const bestThirdGroups = thirds.slice(0, 8).map((t) => t.group)
  const thirdAlloc = allocateThirds(bestThirdGroups) || {}

  const winner = (g: string) => standings[g]?.[0]?.team ?? null
  const runnerUp = (g: string) => standings[g]?.[1]?.team ?? null
  const third = (g: string) => standings[g]?.[2]?.team ?? null
  const thirdFor = (winnerGroup: string) => {
    const target = thirdAlloc[winnerGroup]
    return target ? third(target) : null
  }

  const W = (g: string) => winner(g) ?? `Ganador Grupo ${g}`
  const R = (g: string) => runnerUp(g) ?? `Segundo Grupo ${g}`
  const T = (g: string) => thirdFor(g) ?? `3ro (de ${g})`

  const m = (code: string, home: string | null, away: string | null, hFb: string, aFb: string, desc: string): R32Matchup => ({
    code,
    home: home ?? hFb,
    away: away ?? aFb,
    label: `${code}: ${desc}`,
    resolved: home !== null && away !== null,
  })

  return [
    m('M73', runnerUp('A'), runnerUp('B'), R('A'), R('B'), '2A vs 2B'),
    m('M74', winner('E'), thirdFor('E'), W('E'), T('E'), '1E vs 3A/B/C/D/F'),
    m('M75', winner('F'), runnerUp('C'), W('F'), R('C'), '1F vs 2C'),
    m('M76', winner('C'), runnerUp('F'), W('C'), R('F'), '1C vs 2F'),
    m('M77', winner('I'), thirdFor('I'), W('I'), T('I'), '1I vs 3C/D/F/G/H'),
    m('M78', runnerUp('E'), runnerUp('I'), R('E'), R('I'), '2E vs 2I'),
    m('M79', winner('A'), thirdFor('A'), W('A'), T('A'), '1A vs 3C/E/F/H/I'),
    m('M80', winner('L'), thirdFor('L'), W('L'), T('L'), '1L vs 3E/H/I/J/K'),
    m('M81', winner('G'), thirdFor('G'), W('G'), T('G'), '1G vs 3A/E/H/I/J'),
    m('M82', winner('D'), thirdFor('D'), W('D'), T('D'), '1D vs 3B/E/F/I/J'),
    m('M83', winner('H'), runnerUp('J'), W('H'), R('J'), '1H vs 2J'),
    m('M84', runnerUp('K'), runnerUp('L'), R('K'), R('L'), '2K vs 2L'),
    m('M85', winner('B'), thirdFor('B'), W('B'), T('B'), '1B vs 3E/F/G/I/J'),
    m('M86', runnerUp('D'), runnerUp('G'), R('D'), R('G'), '2D vs 2G'),
    m('M87', winner('J'), runnerUp('H'), W('J'), R('H'), '1J vs 2H'),
    m('M88', winner('K'), thirdFor('K'), W('K'), T('K'), '1K vs 3D/E/I/J/L'),
  ]
}
