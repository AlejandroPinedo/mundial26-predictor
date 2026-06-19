/**
 * CLI del seguimiento EN VIVO (Varzesh3). Envuelve updateLiveScores.
 * Dry-run por defecto (no escribe; tampoco lee live_*, funciona sin la migración).
 *
 * Uso (desde backend/):
 *   npm run live:results            → dry-run (muestra qué pondría)
 *   npm run live:results -- --apply → escribe columnas live_*
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { updateLiveScores } from '../src/results/varzesh3.js'

const APPLY = process.argv.includes('--apply')

try {
  const s = await updateLiveScores(db, { apply: APPLY })
  if (s.unmapped.length) console.log(`⚠️  sin mapear (persa): ${s.unmapped.join(', ')}`)
  if (s.notFound.length) console.log(`⚠️  sin partido en BD: ${s.notFound.join(', ')}`)
  for (const u of s.updated) {
    const tag = u.status === 'LIVE' ? `🔴 ${u.minute}` : u.status
    console.log(`${APPLY ? '✅' : '+'} ${u.match}  →  ${u.home}-${u.away}  [${tag}]`)
  }
  console.log(`\n${APPLY ? 'Aplicado' : 'Dry-run'}: ${s.updated.length} partido(s) con estado en vivo/finalizado`)
} catch (err) {
  console.error('Varzesh3:', String(err))
  process.exitCode = 1
} finally {
  await db.end()
}
