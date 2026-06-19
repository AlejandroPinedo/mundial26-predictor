/**
 * CLI para la ingesta de resultados del WC2026 (football-data.org).
 * Envuelve el núcleo compartido `syncResults` (src/results/syncFromFootballData.ts),
 * el mismo que usa el endpoint del cron (routes/cron.ts).
 *
 * SEGURO POR DEFECTO: dry-run salvo --apply. Idempotente.
 *
 * Uso (desde backend/):
 *   FOOTBALL_DATA_TOKEN=xxxx npm run sync:results            → dry-run
 *   FOOTBALL_DATA_TOKEN=xxxx npm run sync:results -- --apply → escribe
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { syncResults } from '../src/results/syncFromFootballData.js'

const TOKEN = process.env.FOOTBALL_DATA_TOKEN
if (!TOKEN) {
  console.error('Falta FOOTBALL_DATA_TOKEN en el entorno')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')

try {
  const s = await syncResults(db, TOKEN, { apply: APPLY })
  if (s.unmapped.length) console.log(`⚠️  tla sin mapear (ignorados): ${s.unmapped.join(', ')}`)
  if (s.conflicts.length) {
    console.log('⛔ Conflictos football-data ≠ Varzesh3 (NO ingestados — revisar a mano):')
    s.conflicts.forEach((c) => console.log(`     ${c.match}: football-data ${c.footballData} vs Varzesh3 ${c.varzesh3}`))
  }
  for (const ing of s.ingested) {
    const tail = APPLY ? ` (${ing.updatedPredictions} predicción/es recalculada/s)` : ''
    console.log(`${APPLY ? '✅' : '+'} ${ing.match}  →  ${ing.score}${tail}`)
  }
  const head = APPLY
    ? `Aplicado: ${s.ingested.length} resultado(s) cargado(s)`
    : `Dry-run: ${s.ingested.length} se cargaría(n)`
  console.log(
    `\n${head} · ${s.alreadyOk} ya correctos · ${s.diverge} divergencia(s) · ${s.conflicts.length} conflicto(s) · ${s.pending} sin final`,
  )
  if (!APPLY && s.ingested.length) console.log('Ejecuta con --apply para escribir (y disparar el scoring).')
} catch (err) {
  console.error(String(err))
  process.exitCode = 1
} finally {
  await db.end()
}
