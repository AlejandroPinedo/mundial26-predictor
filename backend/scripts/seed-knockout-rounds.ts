/**
 * Siembra las rondas eliminatorias DESDE OCTAVOS hasta la FINAL + 3er puesto
 * (M89..M104) en la tabla `matches`, con placeholders de equipo ("Ganador M73")
 * que la propagación (applyKnockoutProgression, en el cron) va resolviendo conforme
 * hay ganadores. Complementa scripts/seed-knockout-matches.ts (que siembra M73..M88).
 *
 * Cableado: fuente única = src/utils/knockoutProgression.ts (KO_TREE), en paridad
 * con frontend/src/utils/bracketStructure.ts.
 *
 * ⚠️  FECHAS/SEDES: BEST-EFFORT, PENDIENTES DE VERIFICAR contra el fixture oficial.
 *     No afectan el puntaje (eso va por nombre de equipo), pero sí el calendario y
 *     el deadline del bracket. Revisa el dry-run y corrige SCHEDULE antes de --apply.
 *
 * SEGURO POR DEFECTO: dry-run salvo --apply. Idempotente: clave = group_name (M##);
 * en re-corridas actualiza fecha/sede/etapa pero NUNCA pisa equipos ya resueltos ni
 * marcadores. Tras --apply corre la propagación para resolver lo que ya se pueda.
 *
 * Uso (desde backend/):
 *   npm run seed:knockout-rounds            → dry-run
 *   npm run seed:knockout-rounds -- --apply → escribe
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { KO_TREE, applyKnockoutProgression } from '../src/utils/knockoutProgression.js'

// ⚠️ VERIFICAR contra el fixture oficial (fechas en UTC, sedes reales).
const SCHEDULE: Record<number, { dateUtc: string; venue: string }> = {
  89: { dateUtc: '2026-07-04T17:00:00Z', venue: 'Lincoln Financial Field, Philadelphia' },
  90: { dateUtc: '2026-07-04T20:30:00Z', venue: 'NRG Stadium, Houston' },
  91: { dateUtc: '2026-07-05T18:00:00Z', venue: 'Estadio Azteca, Ciudad de México' },
  92: { dateUtc: '2026-07-05T22:00:00Z', venue: 'Estadio Azteca, Ciudad de México' },
  93: { dateUtc: '2026-07-06T20:00:00Z', venue: 'Lumen Field, Seattle' },
  94: { dateUtc: '2026-07-06T23:00:00Z', venue: 'AT&T Stadium, Arlington' },
  95: { dateUtc: '2026-07-07T20:00:00Z', venue: 'BC Place, Vancouver' },
  96: { dateUtc: '2026-07-07T23:00:00Z', venue: 'BC Place, Vancouver' },
  97: { dateUtc: '2026-07-09T20:00:00Z', venue: 'Gillette Stadium, Foxborough' },
  98: { dateUtc: '2026-07-10T23:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  99: { dateUtc: '2026-07-11T21:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
  100: { dateUtc: '2026-07-12T01:00:00Z', venue: 'Arrowhead Stadium, Kansas City' },
  101: { dateUtc: '2026-07-14T23:00:00Z', venue: 'AT&T Stadium, Arlington' },
  102: { dateUtc: '2026-07-15T23:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
  103: { dateUtc: '2026-07-18T20:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
  104: { dateUtc: '2026-07-19T19:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
}

const APPLY = process.argv.includes('--apply')

// Placeholder legible del equipo, derivado del feeder del árbol.
const placeholder = (f: { from: number; take: 'W' | 'L' }) =>
  `${f.take === 'W' ? 'Ganador' : 'Perdedor'} M${f.from}`

async function main() {
  console.log(`\n${APPLY ? '🏆 Sembrando Octavos→Final (M89..M104)' : '🏆 Octavos→Final (dry-run)'}\n`)

  let inserted = 0
  let updated = 0
  for (const node of KO_TREE) {
    const code = `M${node.code}`
    const sched = SCHEDULE[node.code]
    if (!sched) {
      console.log(`  ⚠️  ${code} sin calendario — se omite`)
      continue
    }
    const home = placeholder(node.a)
    const away = placeholder(node.b)
    console.log(
      `  ${code.padEnd(4)} ${node.stage.padEnd(14)} ${home} vs ${away}  ·  ${sched.dateUtc}  ·  ${sched.venue}`,
    )

    if (!APPLY) continue

    const { rows: existing } = await db.query(
      'SELECT id FROM matches WHERE group_name = $1',
      [code],
    )
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO matches (home_team, away_team, match_date, stage, group_name, stadium_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [home, away, sched.dateUtc, node.stage, code, sched.venue],
      )
      inserted++
    } else {
      // Solo metadatos: NO toca equipos (los resuelve la propagación) ni marcadores.
      await db.query(
        'UPDATE matches SET match_date = $1, stage = $2, stadium_name = $3 WHERE group_name = $4',
        [sched.dateUtc, node.stage, sched.venue, code],
      )
      updated++
    }
  }

  if (!APPLY) {
    console.log('\nDry-run. Verifica fechas/sedes y ejecuta con --apply para escribir.')
    return
  }

  console.log(`\n✅ Sembrado: ${inserted} insertado(s), ${updated} actualizado(s).`)
  const prog = await applyKnockoutProgression(db)
  console.log(`   Propagación: ${prog.resolved.length} partido(s) con equipos resueltos.`)
  for (const r of prog.resolved) console.log(`     M${r.code}: ${r.home} vs ${r.away}`)
}

main()
  .catch((err) => {
    console.error(String(err))
    process.exitCode = 1
  })
  .finally(() => db.end())
