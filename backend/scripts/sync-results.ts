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
    console.log('⚠️  football-data corrigió un provisional de Varzesh3:')
    s.conflicts.forEach((c) =>
      console.log(`     ${c.match}: oficial ${c.footballData} (football-data) ≠ provisional ${c.varzesh3} (Varzesh3)`),
    )
  }
  for (const ing of s.ingested) {
    const tail = APPLY ? ` (${ing.updatedPredictions} pred.)` : ''
    console.log(`${APPLY ? '✅' : '+'} [${ing.status}] ${ing.match}  →  ${ing.score}${tail}`)
  }
  for (const m of s.confirmed) console.log(`✔︎ confirmado (sin cambio): ${m}`)
  const head = APPLY
    ? `Aplicado: ${s.ingested.length} escrito(s)`
    : `Dry-run: ${s.ingested.length} se escribiría(n)`
  console.log(
    `\n${head} · ${s.confirmed.length} confirmado(s) · ${s.alreadyOk} ya OK · ${s.conflicts.length} corregido(s) · ${s.pending} sin final`,
  )
  if (s.bracket) {
    console.log(
      `🏆 Bracket: ${s.bracket.bracketRoundsWritten} ronda(s) de avance · ${s.bracket.shootoutRoundsWritten} ronda(s) de tandas reescritas`,
    )
  }
  if (!APPLY && (s.ingested.length || s.confirmed.length)) console.log('Ejecuta con --apply para escribir.')
} catch (err) {
  console.error(String(err))
  process.exitCode = 1
} finally {
  await db.end()
}
