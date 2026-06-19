/**
 * Verifica/rellena grupo y estadio de la fase de grupos en la tabla `matches`
 * contra el dataset abierto worldcup2026 (ISC). Verificado 72/72 contra el
 * fixture real por tools/wc2026-dataset-check/.
 *
 * Nota: al 2026-06-18 la tabla ya tiene group_name y stadium_name poblados, así
 * que en la práctica esto funciona como CHEQUEO DE CONSISTENCIA (detecta drift).
 * La tabla no tiene columna matchday, por eso no se toca la jornada.
 *
 * SEGURO POR DEFECTO:
 *   - dry-run (no escribe) salvo --apply
 *   - solo RELLENA campos vacíos (NULL/''); los que ya tienen valor se reportan
 *     como divergencia pero NO se tocan, salvo que pases --force
 *   - respalda matches antes de aplicar (enrich-backup.json)
 *
 * Uso (desde backend/):
 *   node scripts/enrich-match-venues.mjs            → dry-run: muestra el plan/diff
 *   node scripts/enrich-match-venues.mjs --apply    → rellena vacíos
 *   node scripts/enrich-match-venues.mjs --apply --force → además sobrescribe divergencias
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
const readJSON = (p) => JSON.parse(read(p))
const EXT = 'tools/wc2026-dataset-check/external'

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

// ---------- .env (sin dotenv) ----------
try {
  for (const line of read('backend/.env').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* DATABASE_URL puede venir del entorno */ }
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL (backend/.env o entorno)')
  process.exit(1)
}

// ---------- helpers ----------
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STOP = new Set(['stadium', 'field', 'estadio', 'at', 'geha'])
const tokenize = (n) =>
  strip(n).split(/\s+/).map((t) => t.replace(/[^a-z0-9&'-]/g, '')).filter((t) => t.length >= 2 && !STOP.has(t))
const overlap = (a, b) => a.filter((t) => b.includes(t)).length
const pairKey = (h, a) => [h, a].map(strip).sort().join(' ⟷ ')
const empty = (v) => v === null || v === undefined || String(v).trim() === ''

// ---------- dataset externo ----------
const extTeams = readJSON(`${EXT}/teams.json`)
const extStadiums = readJSON(`${EXT}/stadiums.json`)
const extMatches = readJSON(`${EXT}/matches.json`)

// iso2 (normalizado) → nombre ES, vía flags.ts
const ISO_ALIAS = { eng: 'gb-eng', sco: 'gb-sct' }
const flagsSrc = read('frontend/src/utils/flags.ts')
const codesBlock = flagsSrc.slice(flagsSrc.indexOf('const FLAG_CODES'))
const isoToName = new Map()
for (const m of codesBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) isoToName.set(m[2].toLowerCase(), m[1])
const idToName = new Map()
for (const t of extTeams) {
  const iso = ISO_ALIAS[t.iso2.toLowerCase()] || t.iso2.toLowerCase()
  const es = isoToName.get(iso)
  if (es) idToName.set(t.id, es)
}

// estadio externo → nombre local canónico (el que muestra StadiumsPage)
const stadSrc = read('frontend/src/pages/StadiumsPage.tsx')
const localStadNames = [...stadSrc.matchAll(/name:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
const extStadIdToLocalName = new Map()
for (const s of extStadiums) {
  const et = tokenize(s.name_en)
  let best = null
  let bestScore = 0
  for (const ln of localStadNames) {
    const sc = overlap(et, tokenize(ln))
    if (sc > bestScore) { bestScore = sc; best = ln }
  }
  extStadIdToLocalName.set(s.id, best || s.name_en)
}

// par de equipos → { group, matchday, stadium }
const target = new Map()
for (const m of extMatches) {
  if (m.type !== 'group') continue
  const h = idToName.get(m.home_team_id)
  const a = idToName.get(m.away_team_id)
  if (!h || !a) continue
  target.set(pairKey(h, a), {
    group_name: m.group,
    stadium_name: extStadIdToLocalName.get(m.stadium_id),
  })
}

// ---------- BD ----------
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const { rows } = await db.query(
  `SELECT id, home_team, away_team, stage, group_name, stadium_name FROM matches ORDER BY match_date`,
)
const groupRows = rows.filter((r) => /grupo/i.test(r.stage || '') || target.has(pairKey(r.home_team, r.away_team)))
console.log(`Partidos en BD: ${rows.length} · de grupo (detectados): ${groupRows.length} · objetivos externos: ${target.size}\n`)

// respaldo siempre
const backup = resolve(here, 'enrich-backup.json')
writeFileSync(backup, JSON.stringify(rows, null, 1))
console.log(`Respaldo: ${backup}\n`)

const FIELDS = ['group_name', 'stadium_name']
// stadium_name es SOLO-LECTURA: el dataset externo asigna sedes por partido que
// NO coinciden con el calendario oficial de la BD (verificado: ~57/72 difieren).
// La BD es la fuente de verdad; aquí solo reportamos divergencias, nunca escribimos.
const WRITABLE = new Set(['group_name'])
let fills = 0, mismatches = 0, already = 0, notFound = 0
const toWrite = [] // { id, sets: {campo: valor} }

for (const r of groupRows) {
  const t = target.get(pairKey(r.home_team, r.away_team))
  if (!t) { notFound++; console.log(`⚠️  sin objetivo externo: ${r.home_team} vs ${r.away_team}`); continue }

  const sets = {}
  const notes = []
  for (const f of FIELDS) {
    const cur = r[f]
    const next = t[f]
    const writable = WRITABLE.has(f)
    if (empty(cur) && writable) {
      sets[f] = next
      notes.push(`+${f}="${next}"`)
    } else if (String(cur) !== String(next)) {
      const force = FORCE && writable
      notes.push(`≠${f}: BD="${cur}" ext="${next}"${force ? ' (se sobrescribe)' : writable ? '' : ' (solo-lectura)'}`)
      if (force) sets[f] = next
      mismatches++
    } else {
      already++
    }
  }
  if (Object.keys(sets).length) {
    fills++
    toWrite.push({ id: r.id, sets })
    console.log(`✏️  ${r.home_team} vs ${r.away_team}  →  ${notes.join(' · ')}`)
  } else if (notes.length) {
    console.log(`•  ${r.home_team} vs ${r.away_team}  →  ${notes.join(' · ')}`)
  }
}

console.log(
  `\nResumen: ${fills} partido(s) a escribir · ${mismatches} divergencia(s)` +
  ` · ${already} campo(s) ya correctos · ${notFound} sin objetivo`,
)

if (APPLY && toWrite.length) {
  for (const { id, sets } of toWrite) {
    const cols = Object.keys(sets)
    const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
    await db.query(`UPDATE matches SET ${setSql} WHERE id = $${cols.length + 1}`, [...cols.map((c) => sets[c]), id])
  }
  console.log(`\n✅ Aplicado: ${toWrite.length} fila(s) actualizadas.`)
} else if (!APPLY && toWrite.length) {
  console.log('\nDry-run — ejecuta con --apply para escribir. Añade --force para sobrescribir divergencias.')
} else {
  console.log('\nNada que escribir.')
}
await db.end()
