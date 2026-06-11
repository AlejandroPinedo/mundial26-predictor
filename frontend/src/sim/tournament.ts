import { calculateGroupStandings, getBestThirdPlacedTeams, allocateThirds, buildRoundOf32 } from '../utils/standings'
import { R32_TO_R16_SLOT } from '../utils/bracketStructure'
import { getElo, HOST_NATIONS, HOST_ELO_BOOST } from '../utils/ratings'
import { getSquadElo, blendRating } from '../utils/squads'
import { simulateScore, resolveShootout, winExpectancy } from './matchSim'
import type { RNG } from './rng'

export type ApiMatch = {
  id: string
  home_team: string
  away_team: string
  group_name: string
  home_score: number | null
  away_score: number | null
}

export type SimConfig = {
  iterations: number
  surprise: number      // 0..100 → tau = 1 + s/50
  squadWeight: number   // 0..100 → w = sw/100, mezcla Elo selección vs Elo plantilla
  hostBoost: boolean
  momentum: boolean     // rachas: el Elo se actualiza partido a partido dentro de cada mundial simulado
  seed: number
}

// Etapa máxima alcanzada por equipo en una iteración.
export const STAGE = { GROUP: 0, R32: 1, R16: 2, QF: 3, SF: 4, FINAL: 5, CHAMPION: 6 } as const
export const STAGE_COUNT = 7

// Resultado de grupo por equipo en una iteración.
export const GROUP_POS = { FIRST: 0, SECOND: 1, THIRD_QUALIFIED: 2, ELIMINATED: 3 } as const

// Factor K del momentum (mitad del K estándar de eloratings para torneos:
// las rachas pesan sin volverse caóticas).
const MOMENTUM_K = 32

export type Prepared = {
  matches: ApiMatch[]
  teams: string[]
  teamIndex: Map<string, number>
  elos: Float64Array     // rating efectivo por índice (mezcla + boost anfitrión ya aplicados)
  warnings: string[]
}

export function prepareTournament(matches: ApiMatch[], config: SimConfig): Prepared {
  const groupMatches = matches.filter(m => /^[A-L]$/.test(m.group_name))
  const groups = new Map<string, Set<string>>()
  for (const m of groupMatches) {
    if (!groups.has(m.group_name)) groups.set(m.group_name, new Set())
    groups.get(m.group_name)!.add(m.home_team)
    groups.get(m.group_name)!.add(m.away_team)
  }
  if (groups.size !== 12) {
    throw new Error(`Se esperaban 12 grupos (A–L) y hay ${groups.size}`)
  }
  for (const [g, teams] of groups) {
    if (teams.size !== 4) throw new Error(`El grupo ${g} tiene ${teams.size} equipos (deben ser 4)`)
  }
  if (groupMatches.length !== 72) {
    throw new Error(`Se esperaban 72 partidos de fase de grupos y hay ${groupMatches.length}`)
  }

  const teams = [...groups.values()].flatMap(s => [...s]).sort()
  const teamIndex = new Map(teams.map((t, i) => [t, i]))
  const warnings: string[] = []
  const w = config.squadWeight / 100
  const elos = new Float64Array(teams.length)

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const elo = getElo(team)
    const squad = getSquadElo(team)
    if (squad.fallback) warnings.push(`Sin datos de plantilla para ${team} (se usa su Elo)`)
    let rating = blendRating(elo, squad.elo, w)
    if (config.hostBoost && HOST_NATIONS.has(team)) rating += HOST_ELO_BOOST
    elos[i] = rating
  }

  return { matches: groupMatches, teams, teamIndex, elos, warnings }
}

export type IterationResult = {
  stageReached: Uint8Array
  groupPos: Uint8Array               // GROUP_POS por equipo
  finalistA: number                  // índice del campeón
  finalistB: number                  // índice del subcampeón
  championIdx: number
  simScores: Record<string, [number, number]>  // marcadores simulados de los partidos SIN resultado real
  degenerate: boolean
}

type SimPrediction = { match_id: string; predicted_home: number; predicted_away: number }

// Cruce de respaldo si allocateThirds no encuentra asignación válida (casi imposible
// por la condición de Hall de los pools, pero el bucle nunca debe romperse).
const WINNER_GROUPS_WITH_THIRD = ['E', 'I', 'A', 'L', 'G', 'D', 'B', 'K']

export function simulateOnce(prep: Prepared, tau: number, momentum: boolean, rng: RNG): IterationResult {
  const { matches, teams, teamIndex, elos } = prep
  // Con momentum, cada mundial arranca con los ratings base y los va actualizando.
  const live = momentum ? Float64Array.from(elos) : elos
  const eloOf = (team: string) => live[teamIndex.get(team) ?? -1] ?? 1500

  const applyMomentum = (home: string, away: string, h: number, a: number) => {
    if (!momentum) return
    const hi = teamIndex.get(home)
    const ai = teamIndex.get(away)
    if (hi === undefined || ai === undefined) return
    const expected = winExpectancy(live[hi] - live[ai], tau)
    const result = h > a ? 1 : h < a ? 0 : 0.5
    const delta = MOMENTUM_K * (result - expected)
    live[hi] += delta
    live[ai] -= delta
  }

  // 1) Fase de grupos: simular en orden cronológico solo los partidos sin resultado real.
  //    Los jugados también alimentan el momentum (la racha real cuenta).
  const predictions: Record<string, SimPrediction> = {}
  const simScores: Record<string, [number, number]> = {}
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) {
      const [h, a] = simulateScore(eloOf(m.home_team), eloOf(m.away_team), tau, rng)
      predictions[m.id] = { match_id: m.id, predicted_home: h, predicted_away: a }
      simScores[m.id] = [h, a]
      applyMomentum(m.home_team, m.away_team, h, a)
    } else {
      applyMomentum(m.home_team, m.away_team, m.home_score, m.away_score)
    }
  }

  const standings = calculateGroupStandings(matches, predictions)
  const stageReached = new Uint8Array(teams.length) // STAGE.GROUP por defecto
  const groupPos = new Uint8Array(teams.length).fill(GROUP_POS.ELIMINATED)

  // 2) Posiciones de grupo y Ronda de 32
  const thirds = getBestThirdPlacedTeams(standings)
  const bestThirdGroups = new Set(thirds.slice(0, 8).map(t => t.group))
  for (const [group, table] of Object.entries(standings)) {
    if (table[0]) groupPos[teamIndex.get(table[0].team)!] = GROUP_POS.FIRST
    if (table[1]) groupPos[teamIndex.get(table[1].team)!] = GROUP_POS.SECOND
    if (table[2] && bestThirdGroups.has(group)) {
      groupPos[teamIndex.get(table[2].team)!] = GROUP_POS.THIRD_QUALIFIED
    }
  }

  let degenerate = false
  let r32: { home: string; away: string }[]
  if (allocateThirds([...bestThirdGroups]) !== null) {
    r32 = buildRoundOf32(standings)
  } else {
    degenerate = true
    const base = buildRoundOf32(standings)
    // Reemplaza los cruces de terceros por asignación secuencial relajada
    const thirdByWinner = new Map<string, string>()
    WINNER_GROUPS_WITH_THIRD.forEach((g, i) => {
      const t = thirds[i]
      if (t) thirdByWinner.set(g, t.team)
    })
    r32 = base.map(mu => {
      const m3 = mu.away.match(/^3ro Grupo ([A-L])$/)
      return m3 ? { home: mu.home, away: thirdByWinner.get(m3[1]) ?? mu.away } : mu
    })
  }

  // 3) Cadena eliminatoria: R32 → R16 (mapeo oficial) → QF → SF → Final
  const playKnockout = (home: string, away: string): string => {
    const eh = eloOf(home)
    const ea = eloOf(away)
    const [h, a] = simulateScore(eh, ea, tau, rng)
    applyMomentum(home, away, h, a)
    if (h > a) return home
    if (a > h) return away
    return resolveShootout(eh, ea, tau, rng) === 'home' ? home : away
  }
  const mark = (team: string, stage: number) => {
    const idx = teamIndex.get(team)
    if (idx !== undefined && stageReached[idx] < stage) stageReached[idx] = stage
  }

  // R32
  const r16Slots: string[] = Array(16).fill('')
  r32.forEach((mu, i) => {
    mark(mu.home, STAGE.R32)
    mark(mu.away, STAGE.R32)
    r16Slots[R32_TO_R16_SLOT[i]] = playKnockout(mu.home, mu.away)
  })

  // R16 → QF → SF → Final: slots consecutivos (2k, 2k+1) forman cada partido
  let slots = r16Slots
  for (let stage = STAGE.R16; stage <= STAGE.FINAL; stage++) {
    const next: string[] = []
    for (let k = 0; k < slots.length; k += 2) {
      mark(slots[k], stage)
      mark(slots[k + 1], stage)
      next.push(playKnockout(slots[k], slots[k + 1]))
    }
    slots = next
  }

  // En la última pasada `slots` quedó con el campeón; los finalistas son los 2 con stage FINAL+
  const champion = slots[0]
  mark(champion, STAGE.CHAMPION)
  const championIdx = teamIndex.get(champion)!
  let finalistB = -1
  for (let i = 0; i < stageReached.length; i++) {
    if (stageReached[i] === STAGE.FINAL) { finalistB = i; break }
  }

  return { stageReached, groupPos, finalistA: championIdx, finalistB, championIdx, simScores, degenerate }
}
