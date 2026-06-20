import type pg from 'pg'
import { FIFA_TLA_TO_ES } from './teamCodes.js'

/**
 * Shot map del WC2026 desde la API OFICIAL y pública de FIFA (sin token).
 *
 * Modelo: el timeline de cada partido trae PositionX/PositionY (cancha 0-100) en
 * los eventos de tiro. Tipos de tiro: 0 "Goal!", 12 "Attempt at Goal",
 * 41 "Penalty Goal". Se excluyen 34 (autogol), 57 (acción defensiva), 6 (penal concedido).
 *
 * El scrape es pesado (~30 timelines), así que NO se hace por request: un job
 * diario (scripts/sync-shotmap.ts → npm run sync:shotmap) calcula el payload y lo
 * guarda en `shot_map_cache` (DB). El endpoint solo lee de DB (+ caché en memoria).
 *
 * Gotcha de dirección: la posición es absoluta y los equipos cambian de lado, así
 * que se PLIEGA todo hacia el arco X=100 (si X<50, espejo). Sin esto los goles de
 * un mismo equipo salen en los dos arcos.
 */
const FIFA_BASE = 'https://api.fifa.com/api/v3'
const COMP = '17' // FIFA World Cup
const SEASON = '285023' // 2026

const SHOT_TYPES = new Set([0, 12, 41])
const GOAL_TYPES = new Set([0, 41])
const PEN_TYPE = 41

const PITCH_L = 105
const PITCH_W = 68
const BOX_X = 100 - (16.5 / PITCH_L) * 100 // >= 84.29
const BOX_HALF_W = (20.16 / PITCH_W) * 100 // +/- 29.65 respecto al centro (Y=50)
const PEN_SPOT_X = 100 - (11 / PITCH_L) * 100 // 89.52

// Nombre de fase de FIFA (inglés) → etiqueta en español para el filtro.
const STAGE_ES: Record<string, string> = {
  'First Stage': 'Fase de grupos',
  'Round of 32': 'Dieciseisavos',
  'Round of 16': 'Octavos',
  'Quarter-final': 'Cuartos',
  'Semi-final': 'Semifinal',
  'Play-off for third place': 'Tercer puesto',
  Final: 'Final',
}

export type Shot = {
  x: number
  y: number
  goal: boolean
  pen: boolean
  inBox: boolean
  dist: number // metros al arco
  team: string // nombre en español (para <Flag team=...>)
  player: string
  minute: string
  stage: string // fase en español (Fase de grupos, Octavos, ...)
}
export type Conv = { shots: number; goals: number; pct: number }
export type ShotMapStats = {
  total: Conv
  nonPen: Conv
  inside: Conv
  outside: Conv
  penalties: Conv
  medShot: number
  medGoal: number
}
export type ShotMapPayload = {
  updatedAt: string
  matches: number
  stats: ShotMapStats // agregado de TODO (para el CLI/log; el cliente recalcula al filtrar)
  shots: Shot[] // TODOS los tiros con metadatos (para filtrar y recalcular en el cliente)
}

async function fifaGet(path: string): Promise<any> {
  const res = await fetch(`${FIFA_BASE}${path}`, {
    headers: { 'User-Agent': 'mundial26-predictor/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`fifa ${res.status} ${path}`)
  return res.json()
}

const r1 = (n: number) => Math.round(n * 10) / 10

function fold(x: number, y: number): [number, number] {
  return x < 50 ? [100 - x, 100 - y] : [x, y]
}

function distM(x: number, y: number): number {
  const dx = ((100 - x) / 100) * PITCH_L
  const dy = ((50 - y) / 100) * PITCH_W
  return Math.hypot(dx, dy)
}

function insideBox(x: number, y: number): boolean {
  return x >= BOX_X && Math.abs(y - 50) <= BOX_HALF_W
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// "Julian QUINONES (Mexico) scores!!" -> "Julian QUINONES"
function playerFrom(desc: string): string {
  return desc.includes('(') ? desc.split('(')[0].trim() : ''
}

function stageEs(match: any): string {
  const en = (match.StageName?.[0]?.Description as string) || ''
  return STAGE_ES[en] || en
}

// IdTeam -> nombre en español (vía código FIFA del partido). Reusa FIFA_TLA_TO_ES.
function teamMap(match: any): Record<string, string> {
  const m: Record<string, string> = {}
  for (const side of ['Home', 'Away']) {
    const t = match[side] || {}
    const code = t.Abbreviation || t.IdCountry
    const en = (t.TeamName?.[0]?.Description as string) || ''
    if (t.IdTeam) m[String(t.IdTeam)] = (code && FIFA_TLA_TO_ES[code]) || en
  }
  return m
}

/** Scrapea FIFA y devuelve el payload calculado. NO toca la DB. */
export async function computeShotMap(): Promise<ShotMapPayload> {
  const cal = await fifaGet(
    `/calendar/matches?idCompetition=${COMP}&idSeason=${SEASON}&count=200&language=en`,
  )
  const played = (cal.Results ?? []).filter((m: any) => m.MatchStatus === 0)

  type Raw = {
    x: number
    y: number
    goal: boolean
    pen: boolean
    dist: number
    inBox: boolean
    team: string
    player: string
    minute: string
    stage: string
  }
  const raw: Raw[] = []

  // Secuencial: cortesía con FIFA y suficiente para ~30 partidos (job diario).
  for (const m of played) {
    try {
      const tl = await fifaGet(`/timelines/${COMP}/${SEASON}/${m.IdStage}/${m.IdMatch}?language=en`)
      const tmap = teamMap(m)
      const stage = stageEs(m)
      for (const ev of tl.Event ?? []) {
        if (!SHOT_TYPES.has(ev.Type)) continue
        let px = ev.PositionX
        let py = ev.PositionY
        if (px == null || py == null) {
          if (ev.Type === PEN_TYPE) {
            px = PEN_SPOT_X
            py = 50
          } else continue
        }
        const [x, y] = fold(Number(px), Number(py))
        const desc = (ev.EventDescription?.[0]?.Description as string) || ''
        raw.push({
          x: r1(x),
          y: r1(y),
          goal: GOAL_TYPES.has(ev.Type),
          pen: ev.Type === PEN_TYPE,
          dist: distM(x, y),
          inBox: insideBox(x, y),
          team: tmap[String(ev.IdTeam)] || '',
          player: playerFrom(desc),
          minute: (ev.MatchMinute as string) || '',
          stage,
        })
      }
    } catch (err) {
      console.warn(`[shot-map] timeline ${m.IdMatch} falló:`, String(err))
    }
  }

  const conv = (arr: Raw[]): Conv => {
    const goals = arr.filter((s) => s.goal).length
    return { shots: arr.length, goals, pct: arr.length ? r1((100 * goals) / arr.length) : 0 }
  }
  const nonPen = raw.filter((s) => !s.pen)
  const stats: ShotMapStats = {
    total: conv(raw),
    nonPen: conv(nonPen),
    inside: conv(nonPen.filter((s) => s.inBox)),
    outside: conv(nonPen.filter((s) => !s.inBox)),
    penalties: conv(raw.filter((s) => s.pen)),
    medShot: r1(median(nonPen.map((s) => s.dist))),
    medGoal: r1(median(nonPen.filter((s) => s.goal).map((s) => s.dist))),
  }

  return {
    updatedAt: new Date().toISOString(),
    matches: played.length,
    stats,
    shots: raw.map((s) => ({
      x: s.x,
      y: s.y,
      goal: s.goal,
      pen: s.pen,
      inBox: s.inBox,
      dist: r1(s.dist),
      team: s.team,
      player: s.player,
      minute: s.minute,
      stage: s.stage,
    })),
  }
}

// ── Persistencia (tabla de caché de una sola fila) ──────────────────────────
export async function ensureShotMapTable(db: pg.Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shot_map_cache (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

/** Recalcula desde FIFA y persiste en DB (lo usa el job diario). */
export async function syncShotMap(db: pg.Pool): Promise<ShotMapPayload> {
  await ensureShotMapTable(db)
  const payload = await computeShotMap()
  await db.query(
    `INSERT INTO shot_map_cache (id, payload, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = now()`,
    [JSON.stringify(payload)],
  )
  return payload
}

// Caché en memoria sobre la lectura de DB (evita pegarle a Postgres en cada visita).
let mem: { at: number; data: ShotMapPayload } | null = null
const READ_TTL = 5 * 60_000

/** Lee el último payload desde DB (con caché en memoria + stale-while-error). */
export async function getShotMap(db: pg.Pool): Promise<ShotMapPayload | null> {
  const now = Date.now()
  if (mem && now - mem.at < READ_TTL) return mem.data
  try {
    await ensureShotMapTable(db)
    const r = await db.query('SELECT payload FROM shot_map_cache WHERE id = 1')
    const data = (r.rows[0]?.payload as ShotMapPayload) ?? null
    if (data) mem = { at: now, data }
    return data
  } catch (err) {
    if (mem) return mem.data // stale-while-error
    throw err
  }
}
