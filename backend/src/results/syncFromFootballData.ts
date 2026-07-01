import { ingestResult } from './ingest.js'
import { FIFA_TLA_TO_ES } from './teamCodes.js'
import { applyBracketResults, type ApplySummary } from '../utils/deriveBracketResults.js'
import type { Queryable } from '../oracle/lock.js'

const WC_MATCHES_URL = 'https://api.football-data.org/v4/competitions/WC/matches'

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pairKey = (h: string, a: string) => [h, a].map(strip).sort().join(' | ')

export type SyncSummary = {
  applied: boolean
  /** Finales escritos (marcador nuevo o corregido), con su estado. */
  ingested: { match: string; score: string; status: 'provisional' | 'confirmed'; updatedPredictions: number }[]
  /** Provisionales (Varzesh3) que football-data confirmó sin cambiar el marcador. */
  confirmed: string[]
  alreadyOk: number
  pending: number
  unmapped: string[]
  /** Finales donde el provisional de Varzesh3 difería de football-data: se corrigieron con el oficial. */
  conflicts: { match: string; footballData: string; varzesh3: string }[]
  /** Rondas de bracket_results/ko_shootouts reescritas a partir de los KO en `matches` (solo en apply). */
  bracket?: ApplySummary
}

export type Final = { h: number; a: number }
export type Decision =
  | { action: 'pending' }
  | { action: 'alreadyOk' }
  | { action: 'confirm'; status: 'confirmed' }
  | { action: 'write'; target: Final; status: 'provisional' | 'confirmed' }

/**
 * Decisión pura (testeable) para un partido, dados el final de football-data
 * (oficial) y/o el de Varzesh3 (provisional) más lo que hay en la BD.
 * Prioriza football-data (→ confirmed); si falta, usa Varzesh3 (→ provisional).
 * Nunca degrada un resultado ya confirmado.
 */
export function decideResult(
  fdFinal: Final | null,
  v3Final: Final | null,
  db: { home: number | null; away: number | null; status: string | null },
): Decision {
  const target = fdFinal ?? v3Final
  const status: 'provisional' | 'confirmed' | null = fdFinal ? 'confirmed' : v3Final ? 'provisional' : null
  if (!target || !status) return { action: 'pending' }

  const dbHas = db.home !== null && db.away !== null
  const scoreSame = dbHas && db.home === target.h && db.away === target.a
  if (scoreSame && db.status === 'confirmed') return { action: 'alreadyOk' } // no degradar
  if (scoreSame && db.status === status) return { action: 'alreadyOk' }
  if (scoreSame) return { action: 'confirm', status: 'confirmed' } // mismo marcador, solo confirma
  return { action: 'write', target, status }
}

/**
 * Reconcilia los resultados del WC2026 con scoring de consistencia eventual:
 *   - football-data FINISHED → ingesta como 'confirmed' (autoridad oficial).
 *   - si football-data aún no cerró (delay del free tier) pero Varzesh3 sí →
 *     ingesta como 'provisional' (puntaje rápido); football-data lo confirma o
 *     corrige en un tick posterior.
 * Escribe vía ingestResult (score + puntos + lock del Oráculo). Idempotente.
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
    { status: string; home: number | null; away: number | null; homePen: number | null; awayPen: number | null; label: string }
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
      // Penales: football-data los expone aparte del marcador, solo en KO por tanda.
      homePen: m.score?.penalties?.home ?? null,
      awayPen: m.score?.penalties?.away ?? null,
      label: `${h} vs ${a}`,
    })
  }

  const { rows } = await db.query(
    'SELECT id, home_team, away_team, home_score, away_score, home_pen, away_pen, live_home, live_away, live_status, result_status FROM matches ORDER BY match_date',
  )

  const summary: SyncSummary = {
    applied: opts.apply,
    ingested: [],
    confirmed: [],
    alreadyOk: 0,
    pending: 0,
    unmapped: [...unmapped],
    conflicts: [],
  }

  for (const r of rows) {
    const fd = apiByPair.get(pairKey(r.home_team, r.away_team))
    const fdFinal: Final | null =
      fd && fd.status === 'FINISHED' && fd.home !== null && fd.away !== null
        ? { h: fd.home, a: fd.away }
        : null
    const v3Final: Final | null =
      r.live_status === 'FINISHED' && r.live_home !== null && r.live_away !== null
        ? { h: Number(r.live_home), a: Number(r.live_away) }
        : null
    const label = fd?.label ?? `${r.home_team} vs ${r.away_team}`

    // football-data confirma distinto al provisional de Varzesh3 → manda el oficial;
    // se reporta el conflicto para trazabilidad.
    if (fdFinal && v3Final && (v3Final.h !== fdFinal.h || v3Final.a !== fdFinal.a)) {
      summary.conflicts.push({
        match: label,
        footballData: `${fdFinal.h}-${fdFinal.a}`,
        varzesh3: `${v3Final.h}-${v3Final.a}`,
      })
    }

    const decision = decideResult(fdFinal, v3Final, {
      home: r.home_score !== null ? Number(r.home_score) : null,
      away: r.away_score !== null ? Number(r.away_score) : null,
      status: r.result_status ?? null,
    })

    if (decision.action === 'pending') {
      summary.pending++
    } else if (decision.action === 'alreadyOk') {
      summary.alreadyOk++
    } else if (decision.action === 'confirm') {
      if (opts.apply) await db.query('UPDATE matches SET result_status = $1 WHERE id = $2', [decision.status, r.id])
      summary.confirmed.push(label)
    } else {
      let updatedPredictions = 0
      if (opts.apply) {
        ;({ updatedPredictions } = await ingestResult(db, r.id, decision.target.h, decision.target.a))
        await db.query('UPDATE matches SET result_status = $1 WHERE id = $2', [decision.status, r.id])
      }
      summary.ingested.push({
        match: label,
        score: `${decision.target.h}-${decision.target.a}`,
        status: decision.status,
        updatedPredictions,
      })
    }

    // Penales (KO): football-data los reporta aparte del marcador y solo cuando el
    // partido cerró por tanda. Se reconcilian de forma AISLADA del scoring de
    // predicciones (no afectan calculatePoints): solo alimentan la derivación del
    // bracket. Idempotente: escribe únicamente si cambian.
    if (opts.apply && fd && fd.status === 'FINISHED' && fd.homePen !== null && fd.awayPen !== null) {
      const dbHp = r.home_pen !== null ? Number(r.home_pen) : null
      const dbAp = r.away_pen !== null ? Number(r.away_pen) : null
      if (dbHp !== fd.homePen || dbAp !== fd.awayPen) {
        await db.query('UPDATE matches SET home_pen = $1, away_pen = $2 WHERE id = $3', [fd.homePen, fd.awayPen, r.id])
      }
    }
  }

  // Automatización del bracket: tras ingerir marcadores/penales, reconstruye
  // bracket_results (avance) y ko_shootouts (tandas) desde los KO en `matches`.
  // AISLADA: un fallo aquí no debe tumbar el sync de resultados.
  if (opts.apply) {
    try {
      summary.bracket = await applyBracketResults(db)
    } catch (err) {
      console.error('[sync] applyBracketResults falló (aislado):', err)
    }
  }

  return summary
}
