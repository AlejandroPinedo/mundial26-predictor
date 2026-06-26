/**
 * Siembra los partidos eliminatorios en la tabla `matches` para que el resto del
 * pipeline ya existente (syncResults → resultado final, varzesh3 → marcador en
 * vivo) los cubra SIN cambios — ambos procesan toda la tabla por nombre de equipo.
 *
 * Esta corrida cubre los DIECISEISAVOS (R32, M73..M88): resuelve los equipos
 * desde las tablas de grupos (desempate oficial FIFA) y los inserta con su fecha
 * y sede oficiales. Las rondas siguientes (Octavos+) dependen de resultados que
 * aún no existen y se sembrarán en una iteración posterior.
 *
 * SEGURO POR DEFECTO: dry-run salvo --apply. Idempotente: usa `group_name` para
 * guardar el código del partido (M73..M88) como clave estable; en re-corridas
 * actualiza equipos/fecha/sede pero NUNCA pisa marcadores ya cargados.
 *
 * Requiere que la fase de grupos esté DECIDIDA para resolver equipos reales; en
 * dry-run antes de eso, muestra placeholders ("Ganador Grupo A") y no escribe.
 *
 * Uso (desde backend/):
 *   npm run seed:knockout            → dry-run
 *   npm run seed:knockout -- --apply → escribe
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { computeAllStandings, buildRoundOf32, type GroupMatch } from '../src/utils/knockoutBracket.js'

const STAGE_R32 = 'Dieciseisavos'

// Calendario oficial WC2026 (Wikipedia: 2026 FIFA World Cup knockout stage),
// convertido a UTC. Índice = orden M73..M88 (mismo que buildRoundOf32).
const R32_SCHEDULE: { code: string; dateUtc: string; venue: string }[] = [
  { code: 'M73', dateUtc: '2026-06-28T19:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  { code: 'M74', dateUtc: '2026-06-29T20:30:00Z', venue: 'Gillette Stadium, Foxborough' },
  { code: 'M75', dateUtc: '2026-06-30T01:00:00Z', venue: 'Estadio BBVA, Guadalupe' },
  { code: 'M76', dateUtc: '2026-06-29T17:00:00Z', venue: 'NRG Stadium, Houston' },
  { code: 'M77', dateUtc: '2026-06-30T21:00:00Z', venue: 'MetLife Stadium, East Rutherford' },
  { code: 'M78', dateUtc: '2026-06-30T17:00:00Z', venue: 'AT&T Stadium, Arlington' },
  { code: 'M79', dateUtc: '2026-07-01T01:00:00Z', venue: 'Estadio Azteca, Ciudad de México' },
  { code: 'M80', dateUtc: '2026-07-01T16:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta' },
  { code: 'M81', dateUtc: '2026-07-02T00:00:00Z', venue: "Levi's Stadium, Santa Clara" },
  { code: 'M82', dateUtc: '2026-07-01T20:00:00Z', venue: 'Lumen Field, Seattle' },
  { code: 'M83', dateUtc: '2026-07-02T23:00:00Z', venue: 'BMO Field, Toronto' },
  { code: 'M84', dateUtc: '2026-07-02T19:00:00Z', venue: 'SoFi Stadium, Inglewood' },
  { code: 'M85', dateUtc: '2026-07-03T03:00:00Z', venue: 'BC Place, Vancouver' },
  { code: 'M86', dateUtc: '2026-07-03T22:00:00Z', venue: 'Hard Rock Stadium, Miami Gardens' },
  { code: 'M87', dateUtc: '2026-07-04T01:30:00Z', venue: 'Arrowhead Stadium, Kansas City' },
  { code: 'M88', dateUtc: '2026-07-03T18:00:00Z', venue: 'AT&T Stadium, Arlington' },
]

const APPLY = process.argv.includes('--apply')

async function main() {
  const { rows } = await db.query(
    `SELECT home_team, away_team, group_name, home_score, away_score
     FROM matches WHERE stage = 'Fase de Grupos'`,
  )
  const groupMatches = rows as GroupMatch[]
  const standings = computeAllStandings(groupMatches)
  const r32 = buildRoundOf32(standings)

  const scheduleByCode = new Map(R32_SCHEDULE.map((s) => [s.code, s]))

  // GATE de seguridad: las posiciones de un grupo solo son DEFINITIVAS cuando se
  // jugaron todos sus partidos. `m.resolved` solo confirma que hay standings
  // (cierto desde el 1er partido), así que NO basta: exigimos cero pendientes.
  const pending = groupMatches.filter((m) => m.home_score === null || m.away_score === null)
  const groupsDecided = pending.length === 0

  console.log(`\n${APPLY ? '🏆 Sembrando Dieciseisavos' : '🏆 Dieciseisavos (dry-run)'}\n`)
  for (const m of r32) {
    const flag = m.resolved ? '✓' : '…'
    console.log(`  ${flag} ${m.code.padEnd(4)} ${m.home}  vs  ${m.away}`)
  }

  if (!groupsDecided) {
    console.log(
      `\n⚠️  Fase de grupos AÚN NO cerrada: faltan ${pending.length} partido(s) por jugar. ` +
        'Las posiciones (y por tanto los cruces) pueden cambiar. No se escribe nada — ' +
        'corre este seed cuando los 72 partidos de grupos tengan marcador.',
    )
    return
  }

  if (!APPLY) {
    console.log('\nDry-run: todos los cruces resueltos. Ejecuta con --apply para escribir.')
    return
  }

  let inserted = 0
  let updated = 0
  for (const m of r32) {
    const sched = scheduleByCode.get(m.code)!
    // Clave estable: group_name guarda el código del partido (KO no tiene grupo).
    const { rows: existing } = await db.query(
      'SELECT id, home_score FROM matches WHERE stage = $1 AND group_name = $2',
      [STAGE_R32, m.code],
    )
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO matches (home_team, away_team, match_date, stage, group_name, stadium_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [m.home, m.away, sched.dateUtc, STAGE_R32, m.code, sched.venue],
      )
      inserted++
    } else {
      // Actualiza metadatos pero NO toca marcadores ya cargados.
      await db.query(
        `UPDATE matches SET home_team = $1, away_team = $2, match_date = $3, stadium_name = $4
         WHERE id = $5`,
        [m.home, m.away, sched.dateUtc, sched.venue, existing[0].id],
      )
      updated++
    }
  }
  console.log(`\n✅ Aplicado: ${inserted} insertado(s), ${updated} actualizado(s).`)
  console.log('   syncResults y varzesh3 ahora cubren estos partidos automáticamente.')
}

main()
  .catch((err) => {
    console.error(String(err))
    process.exitCode = 1
  })
  .finally(() => db.end())
