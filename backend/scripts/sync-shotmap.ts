/**
 * CLI para regenerar el shot map del WC2026 (API de FIFA) y guardarlo en DB.
 * Lo corre el job diario .github/workflows/shot-map.yml.
 *
 * SEGURO POR DEFECTO: dry-run salvo --apply.
 *
 * Uso (desde backend/):
 *   npm run sync:shotmap            → dry-run (scrapea y muestra resumen, no escribe)
 *   npm run sync:shotmap -- --apply → escribe en shot_map_cache
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { computeShotMap, syncShotMap } from '../src/results/fifaShotMap.js'

const APPLY = process.argv.includes('--apply')

try {
  const payload = APPLY ? await syncShotMap(db) : await computeShotMap()
  const s = payload.stats
  console.log(`${APPLY ? '✅ escrito' : '+ dry-run'} · ${payload.matches} partidos · ${s.total.shots} tiros · ${s.total.goals} goles`)
  console.log(`  dentro área ${s.inside.pct}%  ·  fuera ${s.outside.pct}%  ·  sin penales ${s.nonPen.pct}%`)
  console.log(`  mediana remate ${s.medShot} m  ·  mediana gol ${s.medGoal} m  ·  penales ${s.penalties.goals}/${s.penalties.shots}`)
  if (!APPLY) console.log('Ejecuta con --apply para escribir en DB.')
} catch (err) {
  console.error(String(err))
  process.exitCode = 1
} finally {
  await db.end()
}
