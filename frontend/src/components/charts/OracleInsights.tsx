import { useMemo } from 'react'
import Flag from '../Flag'
import Icon from '../Icon'
import { predictMatch, type MatchPrediction } from '../../predict/predictMatch'
import { updateElo } from '../../predict/elo'
import { ELO_RATINGS, HOST_NATIONS, getElo } from '../../utils/ratings'
import { ChartPanel, Donut, EmptyChart } from './ChartPanel'
import { C } from './theme'

/**
 * Gráficos que cruzan el modelo ML (Pez Oráculo) con los resultados reales.
 * Las predicciones se calculan client-side con un "paseo de Elo": cada partido
 * jugado se predice con el Elo PREVIO al partido (sin ver su resultado, igual que
 * el Oráculo congelado), y luego se actualiza el Elo. Los próximos usan el Elo
 * actual. Reusa predict/predictMatch + utils/ratings — sin endpoints nuevos.
 */
export type Match = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string
  stage: string
}

export type CrowdFavorite = {
  match_id: string
  home_team: string
  away_team: string
  stage: string
  home_score: number
  away_score: number
  crowd_home: number
  crowd_away: number
  votes: number
  total_votes: number
}

type Out = 'H' | 'D' | 'A'
const outcome = (h: number, a: number): Out => (h > a ? 'H' : h === a ? 'D' : 'A')
const probOf = (p: MatchPrediction, o: Out) => (o === 'H' ? p.probHome : o === 'D' ? p.probDraw : p.probAway)
const pct = (n: number) => Math.round(n * 100)

type Row = { match: Match; pred: MatchPrediction }
function buildOracle(matches: Match[]): { rows: Row[]; byId: Map<string, Row> } {
  const elo: Record<string, number> = { ...ELO_RATINGS }
  const sorted = [...matches].sort((a, b) => +new Date(a.match_date) - +new Date(b.match_date))
  const rows: Row[] = []
  const byId = new Map<string, Row>()
  for (const m of sorted) {
    if (elo[m.home_team] === undefined) elo[m.home_team] = getElo(m.home_team)
    if (elo[m.away_team] === undefined) elo[m.away_team] = getElo(m.away_team)
    const neutral = !HOST_NATIONS.has(m.home_team)
    const pred = predictMatch(m.home_team, m.away_team, { neutralVenue: neutral, elo })
    if (pred) {
      const row = { match: m, pred }
      rows.push(row)
      byId.set(m.id, row)
    }
    if (m.home_score != null && m.away_score != null) {
      const [nh, na] = updateElo(elo[m.home_team], elo[m.away_team], m.home_score, m.away_score, { neutral })
      elo[m.home_team] = nh
      elo[m.away_team] = na
    }
  }
  return { rows, byId }
}

// ── Goles promedio por fase ─────────────────────────────────────────────────
function GoalsByStage({ matches }: { matches: Match[] }) {
  const bins = useMemo(() => {
    const played = matches.filter((m) => m.home_score != null && m.away_score != null)
    // Agrupa por el string de fase REAL (sin asumir mayúsculas/nombres) y ordena
    // por la primera fecha de cada fase → orden natural del torneo (grupos → final).
    const by = new Map<string, { n: number; goals: number; first: number }>()
    for (const m of played) {
      const t = +new Date(m.match_date)
      const e = by.get(m.stage) ?? { n: 0, goals: 0, first: t }
      e.n++
      e.goals += m.home_score! + m.away_score!
      e.first = Math.min(e.first, t)
      by.set(m.stage, e)
    }
    return [...by.entries()]
      .sort((a, b) => a[1].first - b[1].first)
      .map(([stage, e]) => ({ stage, n: e.n, avg: Math.round((e.goals / e.n) * 100) / 100 }))
  }, [matches])

  if (!bins.length) return <EmptyChart icon="ball" label="Aún no hay partidos con resultado." />
  const max = Math.max(...bins.map((b) => b.avg), 1)
  const palette = [C.us, C.mx, C.gold, C.gold, C.ca, C.ca, C.ca]

  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3 h-48 px-1">
      {bins.map((b, i) => (
        <div key={b.stage} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
          <span className="font-display text-base" style={{ color: palette[i % palette.length] }}>{b.avg}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max((b.avg / max) * 100, 4)}%`, background: `linear-gradient(to top, ${palette[i % palette.length]}33, ${palette[i % palette.length]})` }}
          />
          <span className="font-condensed font-bold text-[8.5px] uppercase tracking-wide text-gray-500 text-center leading-tight">
            {b.stage}
          </span>
          <span className="font-sans text-[8px] text-gray-600">{b.n} part.</span>
        </div>
      ))}
    </div>
  )
}

// ── Resultado 1X2 real (¿ganó el favorito?) ─────────────────────────────────
function ResultSplit({ matches }: { matches: Match[] }) {
  const { h, d, a } = useMemo(() => {
    const played = matches.filter((m) => m.home_score != null && m.away_score != null)
    let h = 0, d = 0, a = 0
    for (const m of played) {
      const o = outcome(m.home_score!, m.away_score!)
      if (o === 'H') h++
      else if (o === 'D') d++
      else a++
    }
    return { h, d, a }
  }, [matches])
  const total = h + d + a
  if (!total) return <EmptyChart icon="ball" label="Aún no hay partidos con resultado." />

  const legend = [
    { label: 'Gana 1.º equipo', v: h, c: C.mx },
    { label: 'Empate', v: d, c: C.gold },
    { label: 'Gana 2.º equipo', v: a, c: C.us },
  ]
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
      <Donut
        size={132}
        thickness={15}
        segments={legend.map((l) => ({ value: l.v, color: l.c }))}
        center={
          <>
            <span className="font-display text-3xl text-white">{total}</span>
            <span className="font-condensed font-bold text-[9px] uppercase tracking-wider text-gray-500">partidos</span>
          </>
        }
      />
      <div className="space-y-2.5">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-2.5 text-sm">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.c }} />
            <span className="font-condensed font-bold uppercase tracking-wide text-gray-300 w-32">{l.label}</span>
            <span className="font-display text-sm" style={{ color: l.c }}>{l.v}</span>
            <span className="font-sans text-xs text-gray-500">{Math.round((l.v / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Calibración del Oráculo ──────────────────────────────────────────────────
const CONF_BINS = [
  { label: '34–45%', lo: 0.34, hi: 0.45 },
  { label: '45–55%', lo: 0.45, hi: 0.55 },
  { label: '55–70%', lo: 0.55, hi: 0.7 },
  { label: '70–100%', lo: 0.7, hi: 1.01 },
]
function Calibration({ rows }: { rows: Row[] }) {
  const buckets = useMemo(() => {
    const played = rows.filter((r) => r.match.home_score != null && r.match.away_score != null)
    return CONF_BINS.map((b) => {
      const inBin = played.filter((r) => {
        const conf = Math.max(r.pred.probHome, r.pred.probDraw, r.pred.probAway)
        return conf >= b.lo && conf < b.hi
      })
      const hits = inBin.filter((r) => {
        const predOut: Out = r.pred.probHome >= r.pred.probDraw && r.pred.probHome >= r.pred.probAway ? 'H' : r.pred.probAway >= r.pred.probDraw ? 'A' : 'D'
        return predOut === outcome(r.match.home_score!, r.match.away_score!)
      }).length
      const avgConf = inBin.length ? inBin.reduce((s, r) => s + Math.max(r.pred.probHome, r.pred.probDraw, r.pred.probAway), 0) / inBin.length : (b.lo + b.hi) / 2
      return { ...b, n: inBin.length, hitRate: inBin.length ? hits / inBin.length : null, avgConf }
    })
  }, [rows])

  const totalPlayed = buckets.reduce((s, b) => s + b.n, 0)
  if (!totalPlayed) return <EmptyChart icon="target" label="Aún no hay partidos jugados para evaluar el modelo." />

  const VW = 300
  const VH = 300
  const pad = 34
  const sx = (p: number) => pad + (VW - 2 * pad) * p
  const sy = (p: number) => VH - pad - (VH - 2 * pad) * p

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-[280px] h-auto">
        {/* marco */}
        <line x1={pad} y1={VH - pad} x2={VW - pad} y2={VH - pad} stroke={C.line} strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={VH - pad} stroke={C.line} strokeWidth="1" />
        {/* diagonal de calibración perfecta */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x={VW - pad} y={sy(1) - 6} textAnchor="end" fontSize="8.5" fill="#6b7280" fontFamily="Archivo">modelo perfecto</text>
        {/* ejes */}
        <text x={(VW) / 2} y={VH - 8} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Archivo">confianza del Oráculo →</text>
        <text x={12} y={VH / 2} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Archivo" transform={`rotate(-90 12 ${VH / 2})`}>aciertos reales →</text>
        {/* puntos */}
        {buckets.filter((b) => b.n > 0 && b.hitRate != null).map((b, i) => (
          <g key={i}>
            <circle cx={sx(b.avgConf)} cy={sy(b.hitRate!)} r={Math.min(4 + b.n, 12)} fill={C.gold} fillOpacity="0.3" />
            <circle cx={sx(b.avgConf)} cy={sy(b.hitRate!)} r="3.5" fill={C.gold} stroke="#07060E" strokeWidth="1.5" />
            <text x={sx(b.avgConf)} y={sy(b.hitRate!) - 10} textAnchor="middle" fontSize="8" fill="#d1d5db" fontFamily="Archivo">n={b.n}</text>
          </g>
        ))}
      </svg>
      <div className="text-sm text-gray-400 leading-relaxed max-w-xs">
        <p className="mb-2">
          Cuando el Oráculo dice estar <b className="text-gold">X% seguro</b> de un resultado, ¿acierta esa misma
          proporción de veces?
        </p>
        <p className="text-xs text-gray-500">
          Los puntos cerca de la diagonal = modelo bien calibrado. Por encima = el Oráculo es <i>prudente</i> (acierta más
          de lo que cree); por debajo = <i>sobreconfiado</i>. Basado en {totalPlayed} partido{totalPlayed === 1 ? '' : 's'} jugado{totalPlayed === 1 ? '' : 's'}.
        </p>
      </div>
    </div>
  )
}

// ── Probabilidad 1X2 por partido (próximos) ──────────────────────────────────
function UpcomingProbs({ rows }: { rows: Row[] }) {
  const upcoming = useMemo(
    () => rows.filter((r) => r.match.home_score == null || r.match.away_score == null).slice(0, 8),
    [rows],
  )
  if (!upcoming.length) return <EmptyChart icon="trending" label="No hay próximos partidos en el calendario." />

  return (
    <div className="space-y-3.5">
      {upcoming.map(({ match: m, pred: p }) => (
        <div key={m.id}>
          <div className="flex items-center justify-between gap-2 mb-1 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Flag team={m.home_team} className="h-3.5" />
              <span className="font-condensed font-bold uppercase tracking-wide text-white truncate">{m.home_team}</span>
            </div>
            <span className="font-display text-[9px] text-gray-600">vs</span>
            <div className="flex items-center gap-1.5 min-w-0 justify-end">
              <span className="font-condensed font-bold uppercase tracking-wide text-white truncate">{m.away_team}</span>
              <Flag team={m.away_team} className="h-3.5" />
            </div>
          </div>
          <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-display">
            <div className="flex items-center justify-start pl-1.5" style={{ width: `${pct(p.probHome)}%`, background: C.mx, color: '#07060E' }}>
              {p.probHome > 0.12 && `${pct(p.probHome)}%`}
            </div>
            <div className="flex items-center justify-center" style={{ width: `${pct(p.probDraw)}%`, background: C.gold, color: '#07060E' }}>
              {p.probDraw > 0.12 && `${pct(p.probDraw)}%`}
            </div>
            <div className="flex items-center justify-end pr-1.5" style={{ width: `${pct(p.probAway)}%`, background: C.us, color: '#07060E' }}>
              {p.probAway > 0.12 && `${pct(p.probAway)}%`}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.mx }} /> local</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} /> empate</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.us }} /> visita</span>
      </div>
    </div>
  )
}

// ── Termómetro de sorpresas ──────────────────────────────────────────────────
function Surprises({ rows }: { rows: Row[] }) {
  const top = useMemo(() => {
    const played = rows.filter((r) => r.match.home_score != null && r.match.away_score != null)
    return played
      .map((r) => {
        const o = outcome(r.match.home_score!, r.match.away_score!)
        return { r, o, surprise: 1 - probOf(r.pred, o) }
      })
      .sort((a, b) => b.surprise - a.surprise)
      .slice(0, 6)
  }, [rows])

  if (!top.length) return <EmptyChart icon="zap" label="Aún no hay resultados que sorprendan al modelo." />

  return (
    <div className="space-y-3">
      {top.map(({ r, o, surprise }) => {
        const m = r.match
        const fav = m.home_score! >= m.away_score! ? m.home_team : m.away_team
        return (
          <div key={m.id} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 min-w-0 w-36 sm:w-44 flex-shrink-0">
              <Flag team={m.home_team} className="h-3.5 flex-shrink-0" />
              <span className="scoreboard rounded px-1.5 py-0.5 text-[11px] flex-shrink-0">{m.home_score}-{m.away_score}</span>
              <Flag team={m.away_team} className="h-3.5 flex-shrink-0" />
            </div>
            <div className="flex-1 bg-ink-950 h-2.5 rounded-full overflow-hidden border border-white/5 min-w-0">
              <div className="h-full rounded-full" style={{ width: `${pct(surprise)}%`, background: `linear-gradient(to right, ${C.gold}, ${C.ca})` }} />
            </div>
            <span className="font-sans text-[10px] text-gray-500 flex-shrink-0 w-24 text-right">
              {o === 'D' ? 'empate' : `gana ${fav}`}: {pct(1 - surprise)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Masa vs Oráculo vs Real ──────────────────────────────────────────────────
function CrowdVsOracle({ favorites, byId }: { favorites: CrowdFavorite[]; byId: Map<string, Row> }) {
  const rows = useMemo(
    () => [...favorites].sort((a, b) => b.total_votes - a.total_votes).slice(0, 8),
    [favorites],
  )
  if (!rows.length) return <EmptyChart icon="users" label="Aún no hay partidos jugados con predicciones suficientes." />

  const mark = (h: number, a: number, rh: number, ra: number) => {
    if (h === rh && a === ra) return <Icon name="check" size={13} className="text-mx" />
    if (outcome(h, a) === outcome(rh, ra)) return <span className="text-gold text-[10px] font-bold">1X2</span>
    return <Icon name="x" size={13} className="text-gray-600" />
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-sm border-collapse min-w-[460px]">
        <thead>
          <tr className="text-left">
            <th className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500 pb-3">Partido</th>
            <th className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500 pb-3 text-center">Masa</th>
            <th className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500 pb-3 text-center">Oráculo</th>
            <th className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gold pb-3 text-center">Real</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cf) => {
            const oracle = byId.get(cf.match_id)?.pred.mostLikely
            return (
              <tr key={cf.match_id} className="border-t border-white/8">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Flag team={cf.home_team} className="h-3.5" />
                    <span className="font-condensed font-bold uppercase tracking-wide text-white text-xs truncate max-w-[60px] sm:max-w-none">{cf.home_team}</span>
                    <span className="text-gray-600 text-[10px]">vs</span>
                    <Flag team={cf.away_team} className="h-3.5" />
                    <span className="font-condensed font-bold uppercase tracking-wide text-white text-xs truncate max-w-[60px] sm:max-w-none">{cf.away_team}</span>
                  </div>
                </td>
                <td className="py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-display text-white">{cf.crowd_home}-{cf.crowd_away}</span>
                    {mark(cf.crowd_home, cf.crowd_away, cf.home_score, cf.away_score)}
                  </div>
                  <span className="text-[9px] text-gray-600">{Math.round((cf.votes / cf.total_votes) * 100)}% del pool</span>
                </td>
                <td className="py-2.5 text-center">
                  {oracle ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-display text-white">{oracle.home}-{oracle.away}</span>
                      {mark(oracle.home, oracle.away, cf.home_score, cf.away_score)}
                    </div>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="py-2.5 text-center">
                  <span className="scoreboard rounded px-2 py-0.5 text-[13px]">{cf.home_score}-{cf.away_score}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Sección completa ──────────────────────────────────────────────────────────
export default function OracleInsights({ matches, crowdFavorites }: { matches: Match[]; crowdFavorites: CrowdFavorite[] }) {
  const { rows, byId } = useMemo(() => buildOracle(matches), [matches])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Goles por fase"
          icon="ball"
          fade="fade-up-1"
          description="Promedio de goles por partido en cada fase del torneo (resultados reales)."
          footnote="Es habitual que el promedio baje en las rondas finales: los partidos se cierran y se juega a no perder."
        >
          <GoalsByStage matches={matches} />
        </ChartPanel>

        <ChartPanel
          title="¿Cómo terminan los partidos?"
          icon="chart"
          fade="fade-up-2"
          description="Reparto de los resultados ya jugados entre victoria del 1.º equipo, empate o victoria del 2.º."
          footnote="En un torneo casi todo es en cancha neutral, así que la 'ventaja de local' aquí refleje sobre todo el favoritismo."
        >
          <ResultSplit matches={matches} />
        </ChartPanel>
      </div>

      <ChartPanel
        title="Calibración del Pez Oráculo"
        icon="fish"
        iconClass="text-mx"
        fade="fade-up-2"
        watermark
        description="¿La confianza del modelo coincide con su tasa de acierto real?"
      >
        <Calibration rows={rows} />
      </ChartPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Pronóstico del Oráculo"
          icon="trending"
          fade="fade-up-3"
          description="Probabilidad 1X2 que asigna el modelo a los próximos partidos."
          footnote="Calculado con el Elo vigente (snapshot eloratings.net + resultados ya jugados)."
        >
          <UpcomingProbs rows={rows} />
        </ChartPanel>

        <ChartPanel
          title="Termómetro de sorpresas"
          icon="zap"
          iconClass="text-ca"
          fade="fade-up-4"
          description="Los resultados que el modelo veía más improbables. Cuanto más larga la barra, mayor el batacazo."
          footnote="El porcentaje es la probabilidad que el Oráculo le daba al resultado que de verdad ocurrió."
        >
          <Surprises rows={rows} />
        </ChartPanel>
      </div>

      <ChartPanel
        title="La masa vs el Oráculo vs la realidad"
        icon="users"
        fade="fade-up-4"
        watermark
        description="El marcador más votado por el pool frente al más probable del modelo, contra el resultado real."
        footnote="✓ verde = marcador exacto · 1X2 dorado = acertó ganador/empate · ✕ = falló. Ordenado por popularidad del partido."
      >
        <CrowdVsOracle favorites={crowdFavorites} byId={byId} />
      </ChartPanel>
    </div>
  )
}
