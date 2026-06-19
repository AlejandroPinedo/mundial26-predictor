import type { Queryable } from '../oracle/lock.js'

/**
 * Seguimiento EN VIVO (display-only) vía Varzesh3.
 *
 * Escribe SOLO las columnas live_* de `matches` (marcador y minuto en vivo).
 * NUNCA toca home_score/away_score ni el scoring: el resultado oficial que da
 * puntos sigue viniendo de football-data. Si Varzesh3 falla/bloquea, el cron lo
 * aísla en try/catch → solo desaparece el badge en vivo.
 */

const VARZESH3_URL = 'https://web-api.varzesh3.com/v2.0/livescore/today'
const WC_LEAGUE_ID = 28 // id del Mundial en Varzesh3

// Persa normalizado → nombre ES (igual que en la tabla matches). Generado del
// name_fa del dataset (tools/wc2026-dataset-check) y verificado contra Varzesh3.
const FA_TO_ES: Record<string, string> = {
  آلمان: 'Alemania',
  عربستان: 'Arabia Saudí',
  الجزایر: 'Argelia',
  آرژانتین: 'Argentina',
  استرالیا: 'Australia',
  اتریش: 'Austria',
  'بوسنی و هرزگوین': 'Bosnia y Herzegovina',
  برزیل: 'Brasil',
  بلژیک: 'Bélgica',
  'کیپ ورد': 'Cabo Verde',
  کانادا: 'Canadá',
  قطر: 'Catar',
  کلمبیا: 'Colombia',
  'کره جنوبی': 'Corea del Sur',
  'ساحل عاج': 'Costa de Marfil',
  کرواسی: 'Croacia',
  کوراسائو: 'Curazao',
  اکوادور: 'Ecuador',
  مصر: 'Egipto',
  اسکاتلند: 'Escocia',
  اسپانیا: 'España',
  آمریکا: 'Estados Unidos',
  فرانسه: 'Francia',
  غنا: 'Ghana',
  هائیتی: 'Haití',
  انگلستان: 'Inglaterra',
  عراق: 'Irak',
  ایران: 'Irán',
  ژاپن: 'Japón',
  اردن: 'Jordania',
  مراکش: 'Marruecos',
  مکزیک: 'México',
  نروژ: 'Noruega',
  نیوزیلند: 'Nueva Zelanda',
  پاناما: 'Panamá',
  پاراگوئه: 'Paraguay',
  هلند: 'Países Bajos',
  پرتغال: 'Portugal',
  'جمهوری چک': 'República Checa',
  'جمهوری دموکراتیک کنگو': 'República Democrática del Congo',
  سنگال: 'Senegal',
  'آفریقای جنوبی': 'Sudáfrica',
  سوئد: 'Suecia',
  سوئیس: 'Suiza',
  ترکیه: 'Turquía',
  تونس: 'Túnez',
  اروگوئه: 'Uruguay',
  ازبکستان: 'Uzbekistán',
}

// Normalización persa (DEBE coincidir con la usada al generar FA_TO_ES):
// unifica Yeh/Kaf árabe↔persa, quita diacríticos y marcas de ancho cero.
export function normFa(s: string): string {
  if (!s) return ''
  return s
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ً-ْ‌‎‏]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pairKey = (h: string, a: string) => [h, a].map(strip).sort().join(' | ')

function liveStatus(m: any): 'LIVE' | 'FINISHED' | 'NS' {
  if (Number(m.status) === 7) return 'FINISHED'
  if (m.isLive === true || Number(m.status) === 2) return 'LIVE'
  return 'NS'
}

async function fetchVarzesh3WC(): Promise<any[]> {
  const res = await fetch(VARZESH3_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`varzesh3 ${res.status}`)
  const data = (await res.json()) as any[]
  const lg = (Array.isArray(data) ? data : []).find((l) => Number(l.id) === WC_LEAGUE_ID)
  const matches: any[] = []
  for (const dg of lg?.dates ?? []) for (const m of dg.matches ?? []) matches.push(m)
  return matches
}

export type LiveSummary = {
  applied: boolean
  updated: { match: string; home: number | null; away: number | null; minute: string; status: string }[]
  unmapped: string[]
  notFound: string[]
}

/**
 * Actualiza columnas live_* de los partidos EN VIVO o recién finalizados según
 * Varzesh3. opts.apply=false → dry-run (no escribe; tampoco lee live_*, así que
 * funciona aunque la migración aún no exista).
 */
export async function updateLiveScores(
  db: Queryable,
  opts: { apply: boolean } = { apply: false },
): Promise<LiveSummary> {
  const matches = await fetchVarzesh3WC()
  const { rows } = await db.query('SELECT id, home_team, away_team FROM matches')
  const dbByPair = new Map<string, any>(rows.map((r) => [pairKey(r.home_team, r.away_team), r]))

  const summary: LiveSummary = { applied: opts.apply, updated: [], unmapped: [], notFound: [] }

  for (const m of matches) {
    const st = liveStatus(m)
    if (st === 'NS') continue

    const esHost = FA_TO_ES[normFa(m.host?.name)]
    const esGuest = FA_TO_ES[normFa(m.guest?.name)]
    if (!esHost && m.host?.name) summary.unmapped.push(m.host.name)
    if (!esGuest && m.guest?.name) summary.unmapped.push(m.guest.name)
    if (!esHost || !esGuest) continue

    const row = dbByPair.get(pairKey(esHost, esGuest))
    if (!row) {
      summary.notFound.push(`${esHost} vs ${esGuest}`)
      continue
    }

    // Orienta el marcador al home_team de la BD (Varzesh3 puede invertir local/visita).
    const homeIsHost = row.home_team === esHost
    const liveHome = homeIsHost ? (m.goals?.host ?? null) : (m.goals?.guest ?? null)
    const liveAway = homeIsHost ? (m.goals?.guest ?? null) : (m.goals?.host ?? null)
    const liveMinute = m.liveTime || (st === 'FINISHED' ? 'FT' : '')

    if (opts.apply) {
      await db.query(
        'UPDATE matches SET live_home = $1, live_away = $2, live_minute = $3, live_status = $4 WHERE id = $5',
        [liveHome, liveAway, liveMinute, st, row.id],
      )
    }
    summary.updated.push({
      match: `${row.home_team} vs ${row.away_team}`,
      home: liveHome,
      away: liveAway,
      minute: liveMinute,
      status: st,
    })
  }

  return summary
}
