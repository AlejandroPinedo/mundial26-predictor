import { useMemo } from 'react'
import { ChartPanel, EmptyChart } from './ChartPanel'
import { C } from './theme'
import type { Match } from './OracleInsights'

/**
 * Gráficos basados en las agregaciones del pool que expone el backend
 * (GET /predictions/global-insights): distribución de puntos, goles predichos
 * vs reales, embudo del bracket y actividad temporal de las predicciones.
 */
export type PoolData = {
  pointsDistribution: { points: number; count: number }[]
  predictedGoalsDistribution: { goals: number; count: number }[]
  bracketRounds: { round: string; picks: number; distinct_teams: number }[]
  activity: { byHour: { hour: number; count: number }[]; byDow: { dow: number; count: number }[] }
}

const GMAX = 6 // tope del histograma (6 = "6 o más")

// ── Distribución de puntos del pool ─────────────────────────────────────────
const POINT_META: Record<number, { label: string; color: string }> = {
  0: { label: 'Fallo', color: '#6b7280' },
  1: { label: 'Resultado', color: C.us },
  3: { label: 'Marcador exacto', color: C.gold },
}
function PointsDistribution({ data }: { data: PoolData['pointsDistribution'] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return <EmptyChart icon="chart" label="Aún no hay predicciones evaluadas." />
  const order = [0, 1, 3]
  const byPts = new Map(data.map((d) => [d.points, d.count]))
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end justify-around gap-4 h-48 px-2">
      {order.map((p) => {
        const count = byPts.get(p) ?? 0
        const meta = POINT_META[p] ?? { label: `${p} pts`, color: '#6b7280' }
        return (
          <div key={p} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 max-w-[110px]">
            <span className="font-display text-lg" style={{ color: meta.color }}>{count.toLocaleString()}</span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{ height: `${Math.max((count / max) * 100, 3)}%`, background: `linear-gradient(to top, ${meta.color}33, ${meta.color})` }}
            />
            <span className="font-condensed font-extrabold text-[10px] uppercase tracking-wide text-gray-300 text-center">{meta.label}</span>
            <span className="font-sans text-[10px] text-gray-500">{Math.round((count / total) * 100)}% · {p} pt{p === 1 ? '' : 's'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Goles predichos (pool) vs reales ────────────────────────────────────────
function PredictedVsReal({ pool, matches }: { pool: PoolData['predictedGoalsDistribution']; matches: Match[] }) {
  const { bars, hasReal } = useMemo(() => {
    const bucket = (g: number) => Math.min(g, GMAX)
    const poolArr = new Array(GMAX + 1).fill(0)
    let poolTot = 0
    for (const d of pool) {
      poolArr[bucket(d.goals)] += d.count
      poolTot += d.count
    }
    const realArr = new Array(GMAX + 1).fill(0)
    let realTot = 0
    for (const m of matches) {
      if (m.home_score == null || m.away_score == null) continue
      realArr[bucket(m.home_score)]++
      realArr[bucket(m.away_score)]++
      realTot += 2
    }
    const bars = Array.from({ length: GMAX + 1 }, (_, g) => ({
      g,
      pool: poolTot ? (poolArr[g] / poolTot) * 100 : 0,
      real: realTot ? (realArr[g] / realTot) * 100 : 0,
    }))
    return { bars, hasReal: realTot > 0 }
  }, [pool, matches])

  if (!pool.length) return <EmptyChart icon="chart" label="Aún no hay predicciones registradas." />
  const max = Math.max(...bars.flatMap((b) => [b.pool, b.real]), 1)

  return (
    <div>
      <div className="flex items-end justify-between gap-2 sm:gap-3 h-44 px-1">
        {bars.map((b) => (
          <div key={b.g} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <div className="flex items-end justify-center gap-1 w-full h-full">
              <div className="w-1/2 max-w-[16px] rounded-t-sm transition-all duration-500" style={{ height: `${(b.pool / max) * 100}%`, background: C.us }} title={`Pool: ${b.pool.toFixed(1)}%`} />
              {hasReal && <div className="w-1/2 max-w-[16px] rounded-t-sm transition-all duration-500" style={{ height: `${(b.real / max) * 100}%`, background: C.gold }} title={`Real: ${b.real.toFixed(1)}%`} />}
            </div>
            <span className="font-condensed font-bold text-[10px] text-gray-400">{b.g === GMAX ? `${GMAX}+` : b.g}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-5 text-[10px] text-gray-400 mt-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.us }} /> goles predichos por el pool</span>
        {hasReal && <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.gold }} /> goles reales</span>}
      </div>
    </div>
  )
}

// ── Embudo del bracket ───────────────────────────────────────────────────────
const ROUND_META: { key: string; label: string; teams: number }[] = [
  { key: 'round16', label: 'Octavos', teams: 16 },
  { key: 'quarter', label: 'Cuartos', teams: 8 },
  { key: 'semi', label: 'Semifinal', teams: 4 },
  { key: 'finalist', label: 'Final', teams: 2 },
  { key: 'champion', label: 'Campeón', teams: 1 },
]
function BracketFunnel({ data }: { data: PoolData['bracketRounds'] }) {
  const rows = useMemo(() => {
    const by = new Map(data.map((d) => [d.round, d]))
    return ROUND_META.map((r) => ({ ...r, ...(by.get(r.key) ?? { picks: 0, distinct_teams: 0 }) }))
  }, [data])
  const total = rows.reduce((s, r) => s + r.picks, 0)
  if (!total) return <EmptyChart icon="trophy" label="Aún no hay predicciones de bracket." />
  const maxTeams = Math.max(...rows.map((r) => r.distinct_teams), 1)
  const colors = [C.us, C.mx, C.gold, C.gold, C.ca]

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.key} className="flex items-center gap-3">
          <span className="font-condensed font-extrabold text-[10px] uppercase tracking-wide text-gray-400 w-20 flex-shrink-0">{r.label}</span>
          <div className="flex-1 flex justify-center min-w-0">
            <div
              className="h-7 rounded-md flex items-center justify-center transition-all duration-500"
              style={{ width: `${Math.max((r.distinct_teams / maxTeams) * 100, 8)}%`, background: `linear-gradient(135deg, ${colors[i]}, ${colors[i]}aa)` }}
            >
              <span className="font-display text-xs text-ink-950">{r.distinct_teams}</span>
            </div>
          </div>
          <span className="font-sans text-[10px] text-gray-500 w-20 text-right flex-shrink-0">{r.picks} pred.</span>
        </div>
      ))}
      <p className="text-[10px] text-gray-500 pt-1 text-center">
        Equipos distintos que el pool aún sostiene en cada ronda. Menos ancho = más consenso.
      </p>
    </div>
  )
}

// ── Actividad temporal ───────────────────────────────────────────────────────
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function Activity({ data }: { data: PoolData['activity'] }) {
  const hours = useMemo(() => {
    const arr = new Array(24).fill(0)
    for (const h of data.byHour) if (h.hour >= 0 && h.hour < 24) arr[h.hour] = h.count
    return arr
  }, [data.byHour])
  const dow = useMemo(() => {
    const arr = new Array(7).fill(0)
    for (const d of data.byDow) if (d.dow >= 0 && d.dow < 7) arr[d.dow] = d.count
    return arr
  }, [data.byDow])

  const total = hours.reduce((s, n) => s + n, 0)
  if (!total) return <EmptyChart icon="clock" label="Aún no hay actividad registrada." />
  const maxH = Math.max(...hours, 1)
  const maxD = Math.max(...dow, 1)
  const peak = hours.indexOf(maxH)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.14em] text-gray-500">Por hora del día</span>
          <span className="chip text-gray-400">Pico: {peak}:00–{peak + 1}:00 h</span>
        </div>
        <div className="flex items-end gap-[3px] h-24">
          {hours.map((n, h) => (
            <div
              key={h}
              className="flex-1 rounded-t-[2px] transition-all duration-500"
              style={{ height: `${Math.max((n / maxH) * 100, n ? 4 : 1)}%`, background: h === peak ? C.gold : 'rgba(61,123,255,0.55)' }}
              title={`${h}:00 — ${n} predicciones`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-gray-600 mt-1">
          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </div>

      <div>
        <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.14em] text-gray-500 block mb-2">Por día de la semana</span>
        <div className="flex items-end justify-between gap-2 h-20">
          {dow.map((n, d) => (
            <div key={d} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div className="w-full max-w-[28px] rounded-t-sm transition-all duration-500" style={{ height: `${Math.max((n / maxD) * 100, n ? 5 : 2)}%`, background: C.mx }} title={`${n} predicciones`} />
              <span className="font-condensed font-bold text-[9px] uppercase text-gray-500">{DOW[d]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sección completa ──────────────────────────────────────────────────────────
export default function PoolInsights({ data, matches }: { data: PoolData; matches: Match[] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="¿Qué tan difícil es acertar?"
          icon="chart"
          fade="fade-up-1"
          description="Reparto de los puntos que reparte el pool: fallo (0), resultado correcto (1) o marcador exacto (3)."
          footnote="El marcador exacto es la joya: vale 3 puntos pero es el resultado más escaso."
        >
          <PointsDistribution data={data.pointsDistribution} />
        </ChartPanel>

        <ChartPanel
          title="Lo que la gente predice vs lo que pasa"
          icon="trending"
          fade="fade-up-2"
          description="Distribución de goles que pronostica el pool frente a los goles que realmente se marcan."
          footnote="Si el pool sobreestima los goles, las barras azules se cargan a la derecha frente a las doradas."
        >
          <PredictedVsReal pool={data.predictedGoalsDistribution} matches={matches} />
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartPanel
          title="Embudo del bracket"
          icon="trophy"
          fade="fade-up-3"
          description="Cuántos equipos distintos sobreviven en las predicciones de bracket a medida que avanza el torneo."
        >
          <BracketFunnel data={data.bracketRounds} />
        </ChartPanel>

        <ChartPanel
          title="Cuándo pronostica la comunidad"
          icon="clock"
          fade="fade-up-4"
          description="Actividad de envío de predicciones por hora del día y día de la semana."
          footnote="Los picos suelen aparecer justo antes del cierre de cada jornada."
        >
          <Activity data={data.activity} />
        </ChartPanel>
      </div>
    </div>
  )
}
