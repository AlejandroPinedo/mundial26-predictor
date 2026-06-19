/**
 * Cron de resultados: trae los partidos FINALIZADOS del WC2026 desde
 * football-data.org y carga en la BD los que falten o difieran, propagando el
 * scoring vía ingestResult (el MISMO camino que POST /admin/result).
 *
 * SEGURO POR DEFECTO: dry-run (no escribe) salvo --apply. Idempotente: solo
 * actúa cuando el marcador de la API difiere del de la BD. La carga manual del
 * admin sigue siendo el override.
 *
 * Uso (desde backend/):
 *   FOOTBALL_DATA_TOKEN=xxxx npm run sync:results            → dry-run
 *   FOOTBALL_DATA_TOKEN=xxxx npm run sync:results -- --apply → escribe
 *
 * Requiere DATABASE_URL (dotenv) y FOOTBALL_DATA_TOKEN en el entorno.
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { ingestResult } from '../src/results/ingest.js'
import { FIFA_TLA_TO_ES } from '../src/results/teamCodes.js'

const TOKEN = process.env.FOOTBALL_DATA_TOKEN
if (!TOKEN) {
  console.error('Falta FOOTBALL_DATA_TOKEN en el entorno')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pairKey = (h: string, a: string) => [h, a].map(strip).sort().join(' | ')

type ApiResult = { status: string; home: number | null; away: number | null; label: string }

const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
  headers: { 'X-Auth-Token': TOKEN },
})
if (!res.ok) {
  console.error(`football-data.org ${res.status}: ${await res.text()}`)
  await db.end()
  process.exit(1)
}
const { matches } = (await res.json()) as { matches: any[] }

const apiByPair = new Map<string, ApiResult>()
const unmapped = new Set<string>()
for (const m of matches) {
  const h = FIFA_TLA_TO_ES[m.homeTeam?.tla]
  const a = FIFA_TLA_TO_ES[m.awayTeam?.tla]
  if (!h || !a) {
    // Los partidos de eliminatorias aún sin definir traen tla null: se ignoran.
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
if (unmapped.size) {
  console.log(`⚠️  tla sin mapear (ignorados): ${[...unmapped].join(', ')}`)
}

const { rows } = await db.query(
  'SELECT id, home_team, away_team, home_score, away_score FROM matches ORDER BY match_date',
)

let acted = 0
let alreadyOk = 0
let diverge = 0
let pending = 0

for (const r of rows) {
  const api = apiByPair.get(pairKey(r.home_team, r.away_team))
  if (!api || api.status !== 'FINISHED' || api.home === null || api.away === null) {
    pending++
    continue
  }
  const dbHas = r.home_score !== null && r.away_score !== null
  if (dbHas && Number(r.home_score) === api.home && Number(r.away_score) === api.away) {
    alreadyOk++
    continue
  }
  if (dbHas) diverge++
  acted++

  if (APPLY) {
    const { updatedPredictions } = await ingestResult(db, r.id, api.home, api.away)
    console.log(`✅ ${api.label}  →  ${api.home}-${api.away}  (${updatedPredictions} predicción/es recalculada/s)`)
  } else {
    const detail = dbHas ? `(BD ${r.home_score}-${r.away_score} → cambiaría)` : '(BD vacío)'
    console.log(`+ ${api.label}  →  ${api.home}-${api.away}  ${detail}`)
  }
}

console.log(
  `\n${APPLY ? `Aplicado: ${acted} resultado(s) cargado(s)` : `Dry-run: ${acted} se cargaría(n)`}` +
    ` · ${alreadyOk} ya correctos · ${diverge} divergencia(s) · ${pending} sin final`,
)
if (!APPLY && acted > 0) console.log('Ejecuta con --apply para escribir (y disparar el scoring).')
await db.end()
