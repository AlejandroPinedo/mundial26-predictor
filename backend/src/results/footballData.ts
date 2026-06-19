import { FIFA_TLA_TO_ES } from './teamCodes.js'

/**
 * Proxy cacheado a football-data.org para datos OFICIALES (goleadores, tablas).
 * El token vive en el servidor. La caché en memoria con TTL acota las llamadas
 * a football-data sin importar cuántos usuarios consulten (free tier = 10/min).
 * Mapea tla→ES (reusa teamCodes) para que el frontend reciba nombres en español.
 */
const BASE = 'https://api.football-data.org/v4'

type CacheEntry = { at: number; data: unknown }
const cache = new Map<string, CacheEntry>()

async function fdGet(path: string, ttlMs: number): Promise<any> {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN no configurado')

  const hit = cache.get(path)
  const now = Date.now()
  if (hit && now - hit.at < ttlMs) return hit.data

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    if (hit) return hit.data // stale-while-error: si falla, servimos lo último bueno
    throw new Error(`football-data ${res.status}`)
  }
  const data = await res.json()
  cache.set(path, { at: now, data })
  return data
}

const esTeam = (tla?: string, fallback?: string) => (tla && FIFA_TLA_TO_ES[tla]) || fallback || ''

export async function getScorers() {
  const d = await fdGet('/competitions/WC/scorers', 5 * 60_000)
  return {
    scorers: (d.scorers ?? []).map((s: any) => ({
      player: s.player?.name,
      team: esTeam(s.team?.tla, s.team?.name),
      tla: s.team?.tla,
      goals: s.goals ?? 0,
      assists: s.assists,
      penalties: s.penalties,
    })),
  }
}

export async function getStandings() {
  const d = await fdGet('/competitions/WC/standings', 3 * 60_000)
  return {
    groups: (d.standings ?? [])
      .filter((b: any) => b.type === 'TOTAL')
      .map((b: any) => ({
        // football-data usa "Group A"; normalizamos a la letra para casar con la UI
        group: String(b.group ?? '').replace(/^Group\s*/i, '').trim(),
        table: (b.table ?? []).map((r: any) => ({
          team: esTeam(r.team?.tla, r.team?.name),
          tla: r.team?.tla,
          played: r.playedGames,
          wins: r.won,
          draws: r.draw,
          losses: r.lost,
          gf: r.goalsFor,
          ga: r.goalsAgainst,
          gd: r.goalDifference,
          points: r.points,
        })),
      })),
  }
}
