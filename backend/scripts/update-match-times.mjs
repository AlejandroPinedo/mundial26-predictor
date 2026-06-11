/**
 * Actualiza los horarios de la fase de grupos con el calendario oficial FIFA 2026.
 *
 * Fuentes (verificación cruzada, junio 2026):
 *  - Sky Sports: day-by-day con horarios UK (BST = UTC+1)
 *  - Al Jazeera: calendario completo con conversión GMT
 *  - ESPN: desempate para conflictos puntuales
 * Los horarios se almacenan en UTC; el frontend los muestra en GMT-5 (America/Lima).
 *
 * Uso (desde backend/):
 *   node scripts/update-match-times.mjs           → dry-run: muestra el diff, no escribe
 *   node scripts/update-match-times.mjs --apply   → respalda y aplica los cambios
 */
import { readFileSync, writeFileSync } from 'node:fs'
import pg from 'pg'

// Carga backend/.env sin depender de dotenv (script standalone)
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* .env opcional si DATABASE_URL ya está en el entorno */ }

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL (en backend/.env o en el entorno)')
  process.exit(1)
}

// Calendario oficial — fase de grupos completa, kickoffs en UTC.
// Nombres EXACTOS como están en la tabla matches (español).
const OFFICIAL_KICKOFFS_UTC = [
  ['México', 'Sudáfrica', '2026-06-11T19:00:00Z'],
  ['Corea del Sur', 'República Checa', '2026-06-12T02:00:00Z'],
  ['Canadá', 'Bosnia y Herzegovina', '2026-06-12T19:00:00Z'],
  ['Estados Unidos', 'Paraguay', '2026-06-13T01:00:00Z'],
  ['Catar', 'Suiza', '2026-06-13T19:00:00Z'],
  ['Brasil', 'Marruecos', '2026-06-13T22:00:00Z'],
  ['Haití', 'Escocia', '2026-06-14T01:00:00Z'],
  ['Australia', 'Turquía', '2026-06-14T04:00:00Z'],
  ['Alemania', 'Curazao', '2026-06-14T17:00:00Z'],
  ['Países Bajos', 'Japón', '2026-06-14T20:00:00Z'],
  ['Costa de Marfil', 'Ecuador', '2026-06-14T23:00:00Z'],
  ['Suecia', 'Túnez', '2026-06-15T02:00:00Z'],
  ['España', 'Cabo Verde', '2026-06-15T16:00:00Z'],
  ['Bélgica', 'Egipto', '2026-06-15T19:00:00Z'],
  ['Arabia Saudí', 'Uruguay', '2026-06-15T22:00:00Z'],
  ['Irán', 'Nueva Zelanda', '2026-06-16T01:00:00Z'],
  ['Francia', 'Senegal', '2026-06-16T19:00:00Z'],
  ['Irak', 'Noruega', '2026-06-16T22:00:00Z'],
  ['Argentina', 'Argelia', '2026-06-17T01:00:00Z'],
  ['Austria', 'Jordania', '2026-06-17T04:00:00Z'],
  ['Portugal', 'República Democrática del Congo', '2026-06-17T17:00:00Z'],
  ['Inglaterra', 'Croacia', '2026-06-17T20:00:00Z'],
  ['Ghana', 'Panamá', '2026-06-17T23:00:00Z'],
  ['Uzbekistán', 'Colombia', '2026-06-18T02:00:00Z'],
  ['República Checa', 'Sudáfrica', '2026-06-18T16:00:00Z'],
  ['Suiza', 'Bosnia y Herzegovina', '2026-06-18T19:00:00Z'],
  ['Canadá', 'Catar', '2026-06-18T22:00:00Z'],
  ['México', 'Corea del Sur', '2026-06-19T01:00:00Z'],
  ['Estados Unidos', 'Australia', '2026-06-19T19:00:00Z'],
  ['Escocia', 'Marruecos', '2026-06-19T22:00:00Z'],
  ['Brasil', 'Haití', '2026-06-20T00:30:00Z'],
  ['Turquía', 'Paraguay', '2026-06-20T03:00:00Z'],
  ['Países Bajos', 'Suecia', '2026-06-20T17:00:00Z'],
  ['Alemania', 'Costa de Marfil', '2026-06-20T20:00:00Z'],
  ['Ecuador', 'Curazao', '2026-06-21T00:00:00Z'],
  ['Túnez', 'Japón', '2026-06-21T04:00:00Z'],
  ['España', 'Arabia Saudí', '2026-06-21T16:00:00Z'],
  ['Bélgica', 'Irán', '2026-06-21T19:00:00Z'],
  ['Uruguay', 'Cabo Verde', '2026-06-21T22:00:00Z'],
  ['Nueva Zelanda', 'Egipto', '2026-06-22T01:00:00Z'],
  ['Argentina', 'Austria', '2026-06-22T17:00:00Z'],
  ['Francia', 'Irak', '2026-06-22T21:00:00Z'],
  ['Noruega', 'Senegal', '2026-06-23T00:00:00Z'],
  ['Jordania', 'Argelia', '2026-06-23T03:00:00Z'],
  ['Portugal', 'Uzbekistán', '2026-06-23T17:00:00Z'],
  ['Inglaterra', 'Ghana', '2026-06-23T20:00:00Z'],
  ['Panamá', 'Croacia', '2026-06-23T23:00:00Z'],
  ['Colombia', 'República Democrática del Congo', '2026-06-24T02:00:00Z'],
  ['Suiza', 'Canadá', '2026-06-24T19:00:00Z'],
  ['Bosnia y Herzegovina', 'Catar', '2026-06-24T19:00:00Z'],
  ['Escocia', 'Brasil', '2026-06-24T22:00:00Z'],
  ['Marruecos', 'Haití', '2026-06-24T22:00:00Z'],
  ['Sudáfrica', 'Corea del Sur', '2026-06-25T01:00:00Z'],
  ['República Checa', 'México', '2026-06-25T01:00:00Z'],
  ['Curazao', 'Costa de Marfil', '2026-06-25T20:00:00Z'],
  ['Ecuador', 'Alemania', '2026-06-25T20:00:00Z'],
  ['Japón', 'Suecia', '2026-06-25T23:00:00Z'],
  ['Túnez', 'Países Bajos', '2026-06-25T23:00:00Z'],
  ['Turquía', 'Estados Unidos', '2026-06-26T02:00:00Z'],
  ['Paraguay', 'Australia', '2026-06-26T02:00:00Z'],
  ['Noruega', 'Francia', '2026-06-26T19:00:00Z'],
  ['Senegal', 'Irak', '2026-06-26T19:00:00Z'],
  ['Cabo Verde', 'Arabia Saudí', '2026-06-27T00:00:00Z'],
  ['Uruguay', 'España', '2026-06-27T00:00:00Z'],
  ['Egipto', 'Irán', '2026-06-27T03:00:00Z'],
  ['Nueva Zelanda', 'Bélgica', '2026-06-27T03:00:00Z'],
  ['Panamá', 'Inglaterra', '2026-06-27T21:00:00Z'],
  ['Croacia', 'Ghana', '2026-06-27T21:00:00Z'],
  ['Colombia', 'Portugal', '2026-06-27T23:30:00Z'],
  ['República Democrática del Congo', 'Uzbekistán', '2026-06-27T23:30:00Z'],
  ['Argelia', 'Austria', '2026-06-28T02:00:00Z'],
  ['Jordania', 'Argentina', '2026-06-28T02:00:00Z'],
]

const APPLY = process.argv.includes('--apply')
const LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', weekday: 'short', day: '2-digit', month: 'short',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await db.query(
  "SELECT id, home_team, away_team, match_date FROM matches WHERE stage = 'Fase de Grupos' ORDER BY match_date"
)
console.log(`Partidos de fase de grupos en BD: ${rows.length} | oficiales: ${OFFICIAL_KICKOFFS_UTC.length}\n`)

// Respaldo previo (siempre, también en dry-run)
const backupFile = new URL('./matches-backup.json', import.meta.url)
writeFileSync(backupFile, JSON.stringify(rows, null, 1))
console.log(`Respaldo: ${backupFile.pathname}\n`)

let updates = 0, ok = 0, missing = 0
for (const [home, away, utc] of OFFICIAL_KICKOFFS_UTC) {
  const row = rows.find(r =>
    (r.home_team === home && r.away_team === away) ||
    (r.home_team === away && r.away_team === home)
  )
  if (!row) {
    console.log(`⚠️  NO ENCONTRADO en BD: ${home} vs ${away}`)
    missing++
    continue
  }
  const current = new Date(row.match_date).toISOString()
  const official = new Date(utc).toISOString()
  if (current === official) { ok++; continue }

  updates++
  console.log(`✏️  ${row.home_team} vs ${row.away_team}`)
  console.log(`    BD:      ${current}`)
  console.log(`    Oficial: ${official}  → Lima: ${LIMA.format(new Date(utc))}`)
  if (APPLY) {
    await db.query('UPDATE matches SET match_date = $1 WHERE id = $2', [official, row.id])
  }
}

console.log(`\nResumen: ${ok} correctos · ${updates} ${APPLY ? 'actualizados' : 'por actualizar'} · ${missing} no encontrados`)
if (!APPLY && updates > 0) console.log('Dry-run — ejecuta con --apply para escribir en la BD.')
await db.end()
