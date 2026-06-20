import pg from 'pg'
import { ensureOracleTable } from './oracle/lock.js'
import { ensureOracleBracketTable } from './oracle/bracket.js'
import { ensureShotMapTable } from './results/fifaShotMap.js'

const { Pool } = pg

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Initialize group messages table
db.query(`
  CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => {
  console.error('Error creating group_messages table:', err)
})

// Predicciones congeladas del Pez Oráculo (competidor virtual del ranking).
// No es un usuario: una fila por partido, inmutable una vez insertada.
// El DDL vive en src/oracle/lock.ts (fuente única). Ver allí la regla de justicia.
ensureOracleTable(db).catch(err => {
  console.error('Error creating oracle_predictions table:', err)
})

// Bracket congelado del Pez Oráculo (pronóstico pre-torneo). Ver oracle/bracket.ts.
ensureOracleBracketTable(db).catch(err => {
  console.error('Error creating oracle_bracket table:', err)
})

// Caché del shot map (una fila, JSONB). La rellena el job diario sync:shotmap.
ensureShotMapTable(db).catch(err => {
  console.error('Error creating shot_map_cache table:', err)
})

// Columnas para el seguimiento EN VIVO (Varzesh3). Display-only y separadas del
// scoring (home_score/away_score). Idempotente: no-op si ya existen.
db.query(`
  ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS live_home INTEGER,
    ADD COLUMN IF NOT EXISTS live_away INTEGER,
    ADD COLUMN IF NOT EXISTS live_minute TEXT,
    ADD COLUMN IF NOT EXISTS live_status TEXT,
    ADD COLUMN IF NOT EXISTS result_status TEXT
`).catch(err => {
  console.error('Error añadiendo columnas live_*/result_status a matches:', err)
})