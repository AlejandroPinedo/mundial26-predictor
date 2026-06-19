import { ingestResult } from './ingest.js'
import { FIFA_TLA_TO_ES } from './teamCodes.js'
import type { Queryable } from '../oracle/lock.js'

const WC_MATCHES_URL = 'https://api.football-data.org/v4/competitions/WC/matches'

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pairKey = (h: string, a: string) => [h, a].map(strip).sort().join(' | ')

export type SyncSummary = {
  applied: boolean
  ingested: { match: string; score: string; updatedPredictions: number }[]
  alreadyOk: number
  diverge: number
  pending: number
  unmapped: string[]
  /** Finales donde football-data y Varzesh3 NO coinciden: NO se ingestan. */
  conflicts: { match: string; footballData: string; varzesh3: string }[]
}

/**
 * Trae los partidos del WC2026 desde football-data.org y carga en la BD los
 * resultados FINALIZADOS que falten o difieran, vía ingestResult (score +
 * recálculo de puntos + lock del Oráculo). Idempotente: solo actúa cuando el
 * marcador de la API difiere del de la BD.
 *
 * Núcleo compartido por el script CLI (scripts/sync-results.ts) y el endpoint
 * del cron (routes/cron.ts). No hace logging ni cierra la conexión: eso lo
 * decide quien la llama.
 *
 * @param opts.apply  false = dry-run (no escribe). true = escribe.
 */
export async function syncResults(
  db: Queryable,
  token: string,
  opts: { apply: boolean } = { apply: false },
): Promise<SyncSummary> {
  const res = await fetch(WC_MATCHES_URL, { headers: { 'X-Auth-Token': token } })
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  }
  const { matches } = (await res.json()) as { matches: any[] }

  const apiByPair = new Map<
    string,
    { status: string; home: number | null; away: number | null; label: string }
  >()
  const unmapped = new Set<string>()
  for (const m of matches) {
    const h = FIFA_TLA_TO_ES[m.homeTeam?.tla]
    const a = FIFA_TLA_TO_ES[m.awayTeam?.tla]
    if (!h || !a) {
      if (m.homeTeam?.tla && !h) unmapped.add(`${m.homeTeam.name} (${m.homeTeam.tla})`)
      if (m.awayTeam?.tla && !a) unmapped.add(`${m.awayTeam.name} (${m.awayTeam.tla})`)
      continue
    }
    apiByPair.set(pairKey(h, a), {
      status: m.status,
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      label: `${h} vs ${a}`,
    })
  }

  const { rows } = await db.query(
    'SELECT id, home_team, away_team, home_score, away_score, live_home, live_away, live_status FROM matches ORDER BY match_date',
  )

  const summary: SyncSummary = {
    applied: opts.apply,
    ingested: [],
    alreadyOk: 0,
    diverge: 0,
    pending: 0,
    unmapped: [...unmapped],
    conflicts: [],
  }

  for (const r of rows) {
    const api = apiByPair.get(pairKey(r.home_team, r.away_team))
    if (!api || api.status !== 'FINISHED' || api.home === null || api.away === null) {
      summary.pending++
      continue
    }
    const dbHas = r.home_score !== null && r.away_score !== null
    if (dbHas && Number(r.home_score) === api.home && Number(r.away_score) === api.away) {
      summary.alreadyOk++
      continue
    }

    // Doble verificación: si Varzesh3 ya cerró este partido (FINISHED) con un
    // marcador DISTINTO al de football-data, es un resultado en disputa → NO se
    // ingesta (no se dan puntos con datos contradictorios). Se reporta para
    // resolución manual del admin. Si Varzesh3 no lo tiene, football-data manda.
    if (
      r.live_status === 'FINISHED' &&
      r.live_home !== null &&
      r.live_away !== null &&
      (Number(r.live_home) !== api.home || Number(r.live_away) !== api.away)
    ) {
      summary.conflicts.push({
        match: api.label,
        footballData: `${api.home}-${api.away}`,
        varzesh3: `${r.live_home}-${r.live_away}`,
      })
      continue
    }

    if (dbHas) summary.diverge++

    let updatedPredictions = 0
    if (opts.apply) {
      ;({ updatedPredictions } = await ingestResult(db, r.id, api.home, api.away))
    }
    summary.ingested.push({ match: api.label, score: `${api.home}-${api.away}`, updatedPredictions })
  }

  return summary
}
