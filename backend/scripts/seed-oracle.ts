/**
 * Siembra / pone al día las predicciones del Pez Oráculo.
 *
 * Congela la jornada 1 (primeros 24 partidos) con el Elo pre-torneo y, de forma
 * adaptativa, cualquier partido de grupos cuyo saque inicial ya pasó. Es
 * idempotente: re-ejecutarlo no reescribe picks ya congelados.
 *
 * Uso (desde backend/):
 *   npm run seed:oracle
 *   # o: tsx scripts/seed-oracle.ts
 *
 * Requiere DATABASE_URL en backend/.env (lo carga dotenv).
 */
import 'dotenv/config'
import { db } from '../src/db.js'
import { computeOracleEntry, lockOraclePredictions, ORACLE_NAME } from '../src/oracle/lock.js'

const locked = await lockOraclePredictions(db)
console.log(`🐟 ${ORACLE_NAME}: ${locked} predicción(es) congelada(s) en esta corrida.`)

const entry = await computeOracleEntry(db)
if (entry) {
  console.log(`   Total de picks: ${entry.total_predictions} · Puntos acumulados: ${entry.total_points}`)
} else {
  console.log('   Aún no hay predicciones del Oráculo.')
}

await db.end()
