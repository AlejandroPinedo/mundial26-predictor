/**
 * Validación READ-ONLY: dataset externo (rezarahiminia/worldcup2026, ISC)
 * vs. los datos que ya tiene este proyecto.
 *
 * No toca la base de datos ni modifica código de la app. Solo lee archivos
 * y emite un reporte de diferencias para decidir qué (si algo) vale la pena
 * importar/enriquecer.
 *
 * Uso (desde la raíz del repo):
 *   node tools/wc2026-dataset-check/check.mjs
 *
 * Fuentes locales comparadas:
 *   - frontend/src/utils/flags.ts        (48 equipos ES → ISO2)
 *   - frontend/src/pages/StadiumsPage.tsx (16 estadios hardcodeados)
 *   - backend/scripts/matches-backup.json (respaldo del fixture real, 72 grupos)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
const readJSON = (p) => JSON.parse(read(p))

// ---------- helpers ----------
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STOP = new Set(['stadium', 'field', 'estadio', 'at', 'geha'])
const tokenize = (name) =>
  strip(name)
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9&'-]/g, ''))
    .filter((t) => t.length >= 2 && !STOP.has(t))
const overlap = (a, b) => a.filter((t) => b.includes(t)).length
const pairKey = (h, a) => [h, a].map(strip).sort().join(' ⟷ ')

// ---------- cargar dataset externo ----------
const extTeams = readJSON('tools/wc2026-dataset-check/external/teams.json')
const extStadiums = readJSON('tools/wc2026-dataset-check/external/stadiums.json')
const extMatches = readJSON('tools/wc2026-dataset-check/external/matches.json')

const extTeamById = new Map(extTeams.map((t) => [t.id, t]))
const extStadiumById = new Map(extStadiums.map((s) => [s.id, s]))

// ---------- cargar datos locales ----------
// flags.ts → { nombreES: iso2 }
const flagsSrc = read('frontend/src/utils/flags.ts')
const codesBlock = flagsSrc.slice(flagsSrc.indexOf('const FLAG_CODES'))
const localTeamByIso = new Map() // iso2 → nombreES
const localIsoByName = new Map() // nombreES → iso2
for (const m of codesBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
  const [, nameES, iso] = m
  if (nameES === 'Escocia' || nameES === 'Inglaterra') {
    // gb-sct / gb-eng → normalizamos para cruzar contra ISO2 del externo (gb)
  }
  localTeamByIso.set(iso.toLowerCase(), nameES)
  localIsoByName.set(nameES, iso.toLowerCase())
}

// StadiumsPage.tsx → [{ name, city, capacity, countryCode }]
const stadSrc = read('frontend/src/pages/StadiumsPage.tsx')
const localStadiums = []
const stadRe =
  /name:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?city:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?capacity:\s*(\d+)[\s\S]*?countryCode:\s*'([A-Z]{2})'/g
for (const m of stadSrc.matchAll(stadRe)) {
  localStadiums.push({
    name: m[1].replace(/\\'/g, "'"),
    city: m[2].replace(/\\'/g, "'"),
    capacity: Number(m[3]),
    countryCode: m[4],
  })
}

// matches-backup.json → [{ home_team, away_team, match_date }]
const localMatches = readJSON('backend/scripts/matches-backup.json')

// ---------- util de salida ----------
let warnings = 0
const h = (t) => console.log(`\n${'─'.repeat(64)}\n${t}\n${'─'.repeat(64)}`)
const warn = (m) => {
  warnings++
  console.log(`  ⚠️  ${m}`)
}
const ok = (m) => console.log(`  ✓  ${m}`)

// =====================================================================
// 1) EQUIPOS  (externo iso2 ↔ flags.ts ES)
// =====================================================================
h('1) EQUIPOS — externo (iso2/fifa_code) ↔ flags.ts (español)')

// El externo usa iso2 FIFA para Reino Unido (ENG/SCO); flags.ts usa gb-eng/gb-sct.
const ISO_ALIAS = { eng: 'gb-eng', sco: 'gb-sct', wal: 'gb-wls', nir: 'gb-nir' }

const extIsoToName = new Map() // iso2 (normalizado) → name_en (externo)
const unmatchedExt = []
const idToLocalName = new Map() // id externo → nombre ES (clave para fixtures)
for (const t of extTeams) {
  const iso = ISO_ALIAS[t.iso2.toLowerCase()] || t.iso2.toLowerCase()
  extIsoToName.set(iso, t.name_en)
  const localName = localTeamByIso.get(iso)
  if (localName) idToLocalName.set(t.id, localName)
  else unmatchedExt.push(`${t.name_en} (iso2=${t.iso2}, fifa=${t.fifa_code})`)
}
const localOnly = [...localIsoByName.keys()].filter(
  (name) => !extIsoToName.has(localIsoByName.get(name)),
)

console.log(`  externos: ${extTeams.length} · locales (flags.ts): ${localIsoByName.size}`)
if (idToLocalName.size) ok(`${idToLocalName.size}/48 equipos del externo mapean a un nombre ES por ISO2`)
if (unmatchedExt.length) {
  warn(`${unmatchedExt.length} equipo(s) del externo NO mapean por ISO2 (ojo: Inglaterra/Escocia usan gb-eng/gb-sct, el externo usa gb):`)
  unmatchedExt.forEach((t) => console.log(`        - ${t}`))
}
if (localOnly.length) {
  warn(`${localOnly.length} equipo(s) locales sin equivalente por ISO2 en el externo:`)
  localOnly.forEach((t) => console.log(`        - ${t} (iso2=${localIsoByName.get(t)})`))
}

// =====================================================================
// 2) ESTADIOS  (externo ↔ StadiumsPage.tsx)
// =====================================================================
h('2) ESTADIOS — externo ↔ StadiumsPage.tsx')

const byCountry = (cc) => localStadiums.filter((s) => s.countryCode === cc).length
console.log(
  `  locales: ${localStadiums.length} (US=${byCountry('US')} MX=${byCountry('MX')} CA=${byCountry('CA')}) · externos: ${extStadiums.length}`,
)

const extTokens = extStadiums.map((s) => ({ s, tok: tokenize(s.name_en) }))
const usedExt = new Set()
for (const ls of localStadiums) {
  const lt = tokenize(ls.name)
  let best = null
  let bestScore = 0
  for (const e of extTokens) {
    const score = overlap(lt, e.tok)
    if (score > bestScore) {
      bestScore = score
      best = e.s
    }
  }
  if (!best || bestScore === 0) {
    warn(`sin pareja en el externo: "${ls.name}" (${ls.city})`)
    continue
  }
  usedExt.add(best.id)
  const capDiff = ls.capacity - best.capacity
  const extra = `fifa_name="${best.fifa_name}" · region=${best.region}`
  if (capDiff !== 0) {
    warn(
      `"${ls.name}" capacidad local ${ls.capacity.toLocaleString()} vs externo ${best.capacity.toLocaleString()} (Δ${capDiff > 0 ? '+' : ''}${capDiff}) · ${extra}`,
    )
  } else {
    ok(`"${ls.name}" capacidad coincide (${ls.capacity.toLocaleString()}) · ${extra}`)
  }
}
const extUnused = extStadiums.filter((s) => !usedExt.has(s.id))
if (extUnused.length) {
  warn(`${extUnused.length} estadio(s) del externo sin pareja local:`)
  extUnused.forEach((s) => console.log(`        - ${s.name_en} (${s.city_en}, ${s.country_en})`))
}

// =====================================================================
// 3) FIXTURES  (fase de grupos: backup local ↔ externo)
// =====================================================================
h('3) FIXTURES fase de grupos — backup local ↔ externo')

// pares del externo (solo type=group), con grupo/jornada/estadio para enriquecer
const extGroup = extMatches.filter((m) => m.type === 'group')
const extPairs = new Map() // pairKey → {group, matchday, stadium, home, away}
let extUnresolved = 0
for (const m of extGroup) {
  const home = idToLocalName.get(m.home_team_id)
  const away = idToLocalName.get(m.away_team_id)
  if (!home || !away) {
    extUnresolved++
    continue
  }
  const st = extStadiumById.get(m.stadium_id)
  extPairs.set(pairKey(home, away), {
    group: m.group,
    matchday: m.matchday,
    stadium: st ? st.name_en : `#${m.stadium_id}`,
    home,
    away,
  })
}
console.log(`  partidos de grupo — local: ${localMatches.length} · externo: ${extGroup.length}`)
if (extUnresolved) warn(`${extUnresolved} partido(s) del externo no se pudieron resolver por equipo`)

let matched = 0
const localOnlyMatches = []
const matchedDetail = []
for (const lm of localMatches) {
  const hit = extPairs.get(pairKey(lm.home_team, lm.away_team))
  if (hit) {
    matched++
    matchedDetail.push({ lm, hit })
  } else {
    localOnlyMatches.push(lm)
  }
}
const seenLocal = new Set(localMatches.map((lm) => pairKey(lm.home_team, lm.away_team)))
const extOnly = [...extPairs.values()].filter((v) => !seenLocal.has(pairKey(v.home, v.away)))

if (matched === localMatches.length) {
  ok(`los ${matched} enfrentamientos del backup existen en el externo (mismo sorteo)`)
} else {
  warn(`solo ${matched}/${localMatches.length} enfrentamientos coinciden`)
}
if (localOnlyMatches.length) {
  warn(`${localOnlyMatches.length} partido(s) locales que el externo NO tiene:`)
  localOnlyMatches.forEach((lm) => console.log(`        - ${lm.home_team} vs ${lm.away_team}`))
}
if (extOnly.length) {
  warn(`${extOnly.length} partido(s) de grupo del externo que el backup NO tiene:`)
  extOnly.forEach((v) => console.log(`        - ${v.home} vs ${v.away} (grupo ${v.group})`))
}

// muestra del enriquecimiento que el externo puede aportar (grupo/jornada/estadio)
if (matchedDetail.length) {
  console.log('\n  Enriquecimiento disponible (grupo · jornada · estadio) — muestra de 6:')
  matchedDetail.slice(0, 6).forEach(({ lm, hit }) =>
    console.log(
      `        ${lm.home_team} vs ${lm.away_team}  →  Grupo ${hit.group} · J${hit.matchday} · ${hit.stadium}`,
    ),
  )
}

// =====================================================================
// VEREDICTO
// =====================================================================
h('VEREDICTO')
console.log(`  Equipos mapeados:     ${idToLocalName.size}/48`)
console.log(`  Estadios emparejados: ${usedExt.size}/16`)
console.log(`  Fixtures coincididos: ${matched}/${localMatches.length}`)
console.log(`  Advertencias totales: ${warnings}`)
console.log(
  warnings === 0
    ? '\n  ✅ Dataset externo 100% consistente con el proyecto: seguro para importar/enriquecer.'
    : '\n  ⚠️  Dataset mayormente consistente; revisar las advertencias antes de importar.',
)
