/**
 * Construye y congela el BRACKET del Pez Oráculo (pronóstico pre-torneo).
 *
 * Reusa el simulador Monte Carlo del frontend (frontend/src/sim). Simula el
 * torneo IGNORANDO los resultados de grupos ya jugados (scores = null), con el
 * Elo pre-torneo y una SEMILLA FIJA → resultado reproducible y auditable.
 * Equivale a "el Oráculo llenó su bracket antes de arrancar", igual que la
 * jornada 1 de sus predicciones de grupo.
 *
 * Por defecto NO sobreescribe un bracket ya congelado (lock-once). Usa --force
 * para regenerarlo (p. ej. si cambia el modelo o el calendario).
 *
 * Uso (desde backend/):
 *   npm run seed:oracle-bracket
 *   npm run seed:oracle-bracket -- --force
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { runSimulation } from '../../frontend/src/sim/runner.js'
import { buildBracket, saveOracleBracket } from '../src/oracle/bracket.js'

// Config del pronóstico oficial del Oráculo. Elo puro (sin plantilla ni boost
// de anfitrión) para ser coherente con sus predicciones de grupo, y sin
// "surprise" extra: usamos la varianza propia del modelo.
const SIM_CONFIG = {
  iterations: 50000,
  surprise: 0,
  squadWeight: 0,
  hostBoost: false,
  momentum: false,
  seed: 20260611,
}

const force = process.argv.includes('--force')

const { rows } = await db.query(
  "SELECT id, home_team, away_team, group_name FROM matches WHERE stage = 'Fase de Grupos' ORDER BY match_date",
)

// Pronóstico PRE-TORNEO: descartamos cualquier resultado ya jugado.
const matches = rows.map((r) => ({
  id: r.id,
  home_team: r.home_team,
  away_team: r.away_team,
  group_name: r.group_name,
  home_score: null,
  away_score: null,
}))
console.log(`Partidos de grupos leídos: ${matches.length} (esperado 72)`)

const res = runSimulation(matches, SIM_CONFIG)
const bracket = buildBracket(res.teams)

console.log('\n🐟 Bracket del Pez Oráculo (pronóstico pre-torneo):')
console.log(`   Campeón:    ${bracket.champion.join(', ')}`)
console.log(`   Finalistas: ${bracket.finalist.join(', ')}`)
console.log(`   Semis:      ${bracket.semi.join(', ')}`)
console.log(`   Cuartos:    ${bracket.quarter.join(', ')}`)
console.log(`   Octavos:    ${bracket.round16.join(', ')}`)

const n = await saveOracleBracket(db, bracket, { force })
if (n === -1) {
  console.log('\n⚠️  Ya había un bracket congelado — no se sobreescribió. Usa --force para regenerar.')
} else {
  console.log(`\n✅ Bracket congelado: ${n} filas escritas (${res.iterations} simulaciones, semilla ${SIM_CONFIG.seed}).`)
}

await db.end()
