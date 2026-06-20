import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../api/client'
import Spinner from '../Spinner'
import Flag from '../Flag'
import { ChartPanel, Donut, EmptyChart } from './ChartPanel'
import { C } from './theme'

/**
 * Gráficos derivados del mapa de tiros oficial de FIFA (GET /football/shot-map).
 * Reusa el mismo dataset que ShotMap pero lo agrega de otras formas: conversión
 * por distancia, goles por minuto, eficacia por selección, dentro/fuera del área
 * y un heatmap de zonas de remate. Todo client-side, sin endpoints nuevos.
 */
type Shot = {
  x: number
  y: number
  goal: boolean
  pen: boolean
  inBox: boolean
  dist: number
  team: string
  player: string
  minute: string
  stage: string
}
type ShotMapData = { updatedAt: string; matches: number; shots: Shot[] }

const pct = (g: number, s: number) => (s ? Math.round((1000 * g) / s) / 10 : 0)

// ── Conversión por distancia ─────────────────────────────────────────────────
const DIST_BINS = [
  { label: '0–6', lo: 0, hi: 6 },
  { label: '6–11', lo: 6, hi: 11 },
  { label: '11–16', lo: 11, hi: 16 },
  { label: '16–22', lo: 16, hi: 22 },
  { label: '22–30', lo: 22, hi: 30 },
  { label: '30+', lo: 30, hi: Infinity },
]
function distanceBins(shots: Shot[]) {
  const nonPen = shots.filter((s) => !s.pen)
  return DIST_BINS.map((b) => {
    const arr = nonPen.filter((s) => s.dist >= b.lo && s.dist < b.hi)
    const goals = arr.filter((s) => s.goal).length
    return { ...b, shots: arr.length, goals, pct: pct(goals, arr.length) }
  })
}

function DistanceChart({ shots }: { shots: Shot[] }) {
  const bins = useMemo(() => distanceBins(shots), [shots])
  const maxVol = Math.max(...bins.map((b) => b.shots), 1)
  const maxPct = Math.max(...bins.map((b) => b.pct), 10)
  const yTop = Math.ceil(maxPct / 10) * 10

  const VW = 460
  const VH = 200
  const padL = 30
  const padR = 12
  const padT = 16
  const padB = 34
  const iw = VW - padL - padR
  const ih = VH - padT - padB
  const step = iw / bins.length
  const cx = (i: number) => padL + step * (i + 0.5)
  const cy = (p: number) => padT + ih * (1 - p / yTop)

  const pts = bins.map((b, i) => [cx(i), cy(b.pct)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${line} L ${pts[pts.length - 1][0]} ${padT + ih} L ${pts[0][0]} ${padT + ih} Z`

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto block">
      <defs>
        <linearGradient id="distArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.gold} stopOpacity="0.32" />
          <stop offset="1" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* rejilla horizontal + escala % */}
      {[0, 0.5, 1].map((t) => {
        const y = padT + ih * t
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={VW - padR} y2={y} stroke={C.line} strokeWidth="1" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Archivo">
              {Math.round(yTop * (1 - t))}%
            </text>
          </g>
        )
      })}
      {/* volumen de remates (barras tenues) */}
      {bins.map((b, i) => {
        const h = (b.shots / maxVol) * ih
        return (
          <rect
            key={i}
            x={cx(i) - step * 0.28}
            y={padT + ih - h}
            width={step * 0.56}
            height={h}
            fill="#FFFFFF"
            fillOpacity="0.07"
            rx="2"
          />
        )
      })}
      {/* curva de conversión */}
      <path d={area} fill="url(#distArea)" />
      <path d={line} fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {bins.map((b, i) => (
        <g key={i}>
          <circle cx={cx(i)} cy={cy(b.pct)} r="3.5" fill={C.gold} stroke="#07060E" strokeWidth="1.5" />
          <text x={cx(i)} y={cy(b.pct) - 8} textAnchor="middle" fontSize="9" fill={C.gold} fontFamily="Archivo Black">
            {b.pct}%
          </text>
          <text x={cx(i)} y={VH - 16} textAnchor="middle" fontSize="9.5" fill="#d1d5db" fontFamily="Archivo">
            {b.label}
          </text>
          <text x={cx(i)} y={VH - 4} textAnchor="middle" fontSize="8" fill="#6b7280" fontFamily="Archivo">
            {b.shots} rem.
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Goles por minuto ──────────────────────────────────────────────────────────
const MIN_BINS = [
  { label: "1–15'", lo: 1, hi: 15 },
  { label: "16–30'", lo: 16, hi: 30 },
  { label: "31–45'", lo: 31, hi: 45 },
  { label: "46–60'", lo: 46, hi: 60 },
  { label: "61–75'", lo: 61, hi: 75 },
  { label: "76–90'", lo: 76, hi: 90 },
  { label: "90'+", lo: 91, hi: Infinity },
]
function MinuteChart({ shots }: { shots: Shot[] }) {
  const bins = useMemo(() => {
    const goals = shots.filter((s) => s.goal)
    return MIN_BINS.map((b) => {
      const n = goals.filter((s) => {
        const m = parseInt(s.minute, 10)
        return !Number.isNaN(m) && m >= b.lo && m <= b.hi
      }).length
      return { ...b, goals: n }
    })
  }, [shots])
  const max = Math.max(...bins.map((b) => b.goals), 1)
  const palette = [C.us, C.us, C.mx, C.mx, C.gold, C.gold, C.ca]

  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-2.5 h-44 px-1">
      {bins.map((b, i) => (
        <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
          <span className="font-display text-sm" style={{ color: palette[i] }}>{b.goals}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${Math.max((b.goals / max) * 100, b.goals ? 5 : 1.5)}%`,
              background: `linear-gradient(to top, ${palette[i]}33, ${palette[i]})`,
            }}
          />
          <span className="font-condensed font-bold text-[8.5px] uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Ranking de finalización por selección ─────────────────────────────────────
function FinishingRanking({ shots }: { shots: Shot[] }) {
  const rows = useMemo(() => {
    const nonPen = shots.filter((s) => !s.pen)
    const by = new Map<string, { shots: number; goals: number }>()
    for (const s of nonPen) {
      const e = by.get(s.team) ?? { shots: 0, goals: 0 }
      e.shots++
      if (s.goal) e.goals++
      by.set(s.team, e)
    }
    return [...by.entries()]
      .map(([team, v]) => ({ team, ...v, pct: pct(v.goals, v.shots) }))
      .filter((r) => r.shots >= 4)
      .sort((a, b) => b.pct - a.pct || b.goals - a.goals)
      .slice(0, 8)
  }, [shots])

  if (!rows.length) return <EmptyChart icon="medal" label="Aún no hay selecciones con remates suficientes." />
  const maxPct = Math.max(...rows.map((r) => r.pct), 1)

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.team} className="flex items-center gap-3 text-sm">
          <span className={`font-display text-sm w-5 text-center flex-shrink-0 ${i === 0 ? 'text-gold' : 'text-gray-600'}`}>
            {i + 1}
          </span>
          <Flag team={r.team} className="h-4 flex-shrink-0" />
          <span className="font-condensed font-extrabold uppercase tracking-wide text-white truncate w-24 sm:w-28 flex-shrink-0">
            {r.team}
          </span>
          <div className="flex-1 bg-ink-950 h-2.5 rounded-full overflow-hidden border border-white/5 min-w-0">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(r.pct / maxPct) * 100}%`, background: `linear-gradient(to right, ${C.mx}, ${C.gold})` }}
            />
          </div>
          <span className="font-display text-sm text-gold flex-shrink-0 w-10 text-right">{r.pct}%</span>
          <span className="font-sans text-[10px] text-gray-500 flex-shrink-0 w-12 text-right hidden sm:block">
            {r.goals}/{r.shots}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Dentro vs fuera del área ───────────────────────────────────────────────────
function BoxDonuts({ shots }: { shots: Shot[] }) {
  const { inside, outside, pens } = useMemo(() => {
    const nonPen = shots.filter((s) => !s.pen)
    const conv = (arr: Shot[]) => ({ shots: arr.length, goals: arr.filter((s) => s.goal).length })
    return {
      inside: conv(nonPen.filter((s) => s.inBox)),
      outside: conv(nonPen.filter((s) => !s.inBox)),
      pens: conv(shots.filter((s) => s.pen)),
    }
  }, [shots])

  const block = (label: string, c: { shots: number; goals: number }, color: string) => (
    <div className="flex flex-col items-center gap-2">
      <Donut
        size={120}
        thickness={13}
        segments={[
          { value: c.goals, color },
          { value: c.shots - c.goals, color: C.track },
        ]}
        center={
          <>
            <span className="font-display text-2xl" style={{ color }}>{pct(c.goals, c.shots)}%</span>
            <span className="font-condensed font-bold text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
              {c.goals}/{c.shots}
            </span>
          </>
        }
      />
      <span className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.14em] text-gray-400">{label}</span>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-8">
        {block('Dentro del área', inside, C.mx)}
        {block('Fuera del área', outside, C.gold)}
      </div>
      {pens.shots > 0 && (
        <span className="chip text-gray-400">
          Penales: {pens.goals}/{pens.shots} ({pct(pens.goals, pens.shots)}%)
        </span>
      )}
    </div>
  )
}

// ── Heatmap de zonas de remate ─────────────────────────────────────────────────
const HM_COLS = 7
const HM_ROWS = 5
function ZoneHeatmap({ shots }: { shots: Shot[] }) {
  const { cells, max } = useMemo(() => {
    const grid: { shots: number; goals: number }[] = Array.from({ length: HM_COLS * HM_ROWS }, () => ({
      shots: 0,
      goals: 0,
    }))
    for (const s of shots.filter((sh) => !sh.pen)) {
      // y: ancho de cancha (0–100). depth: distancia al arco normalizada (0 = arco).
      const depth = Math.min(100 - s.x, 100)
      const col = Math.min(HM_COLS - 1, Math.max(0, Math.floor((s.y / 100) * HM_COLS)))
      const row = Math.min(HM_ROWS - 1, Math.max(0, Math.floor((depth / 50) * HM_ROWS)))
      const cell = grid[row * HM_COLS + col]
      cell.shots++
      if (s.goal) cell.goals++
    }
    return { cells: grid, max: Math.max(...grid.map((c) => c.shots), 1) }
  }, [shots])

  const cw = 100 / HM_COLS
  const ch = 100 / HM_ROWS
  return (
    <div>
      <div className="relative w-full max-w-[420px] mx-auto aspect-[7/5] rounded-xl overflow-hidden bg-ink-900 border border-white/8">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {cells.map((c, i) => {
            const col = i % HM_COLS
            const row = Math.floor(i / HM_COLS)
            const intensity = c.shots / max
            return (
              <rect
                key={i}
                x={col * cw}
                y={row * ch}
                width={cw}
                height={ch}
                fill={C.gold}
                fillOpacity={intensity ? 0.12 + intensity * 0.72 : 0}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.4"
              />
            )
          })}
          {/* arco arriba (zona de mayor peligro) */}
          <rect x="38" y="0" width="24" height="1.6" fill="rgba(255,255,255,0.5)" />
          <rect x="28" y="0" width="44" height="20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        </svg>
        {/* recuento de goles por celda con remates */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${HM_COLS},1fr)`, gridTemplateRows: `repeat(${HM_ROWS},1fr)` }}>
          {cells.map((c, i) => (
            <div key={i} className="flex items-center justify-center">
              {c.goals > 0 && <span className="font-display text-[10px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{c.goals}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-gray-500 mt-2 text-center">
        Arriba = arco. Tono = densidad de remates · número = goles de la zona.
      </p>
    </div>
  )
}

// ── Sección completa ────────────────────────────────────────────────────────────
export default function ShotInsights() {
  const [data, setData] = useState<ShotMapData | null>(null)
  const [view, setView] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    apiFetch('/football/shot-map')
      .then((res) => {
        if (res?.shots?.length) {
          setData(res)
          setView('ready')
        } else setView('empty')
      })
      .catch(() => setView('empty'))
  }, [])

  if (view === 'loading')
    return (
      <ChartPanel title="Anatomía del remate" icon="target" description="Datos oficiales de FIFA.">
        <div className="flex justify-center py-16"><Spinner /></div>
      </ChartPanel>
    )
  if (view === 'empty' || !data)
    return (
      <ChartPanel title="Anatomía del remate" icon="target" description="Datos oficiales de FIFA.">
        <EmptyChart icon="target" label="El mapa se genera a diario. Aún no hay datos disponibles." />
      </ChartPanel>
    )

  const shots = data.shots
  const updated = new Date(data.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const chip = `${data.matches} part. · Act. ${updated}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ChartPanel
        title="Conversión por distancia"
        icon="target"
        subtitle={chip}
        fade="fade-up-1"
        description="Qué porcentaje de remates termina en gol según la distancia al arco (sin penales)."
        footnote="Las barras tenues marcan el volumen de remates en cada franja. La distancia es la variable que más mueve la probabilidad de gol."
      >
        <DistanceChart shots={shots} />
      </ChartPanel>

      <ChartPanel
        title="¿Cuándo caen los goles?"
        icon="clock"
        fade="fade-up-2"
        description="Goles del torneo repartidos por tramos de 15 minutos (incluye penales)."
        footnote="Los tramos finales suelen concentrar más goles por el desgaste físico y los partidos abiertos."
      >
        <MinuteChart shots={shots} />
      </ChartPanel>

      <ChartPanel
        title="Eficacia goleadora"
        icon="medal"
        fade="fade-up-3"
        description="Selecciones ordenadas por % de remates convertidos en gol (mín. 4 remates, sin penales)."
        footnote="No es lo mismo rematar mucho que rematar bien: esto premia la puntería, no el volumen."
      >
        <FinishingRanking shots={shots} />
      </ChartPanel>

      <ChartPanel
        title="Dentro vs fuera del área"
        icon="ball"
        fade="fade-up-4"
        description="La diferencia de eficacia según desde dónde se dispara."
        footnote="Rematar dentro del área multiplica la probabilidad de gol frente a los disparos lejanos."
      >
        <BoxDonuts shots={shots} />
      </ChartPanel>

      <ChartPanel
        title="Zonas de remate"
        icon="target"
        fade="fade-up-4"
        className="lg:col-span-2"
        description="Mapa de calor de desde dónde se dispara más. El arco está arriba."
      >
        <ZoneHeatmap shots={shots} />
      </ChartPanel>
    </div>
  )
}
