import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from './Spinner'
import Icon from './Icon'
import Flag from './Flag'

/**
 * Mapa de tiros del WC2026 (API oficial de FIFA, vía backend cacheado:
 * GET /football/shot-map). Media cancha vertical (arco arriba), nube tenue,
 * goles con la bandera del goleador (tooltip al pasar/tocar) y filtros por
 * fase / país / jugador. Los porcentajes y medianas se RECALCULAN al filtrar.
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
  home?: string
  away?: string
}
type ShotMapData = { updatedAt: string; matches: number; shots: Shot[] }

// ── Geometría: MEDIA cancha vertical, arco arriba (metros → viewBox) ─────────
const S = 7
const OX = 3
const OY = 3
const W = 68
const HL = 42 // profundidad visible desde el arco (recorta el mediocampo vacío)
const VW = (W + 2 * OX) * S
const VH = (HL + 2 * OY) * S
const pxm = (xm: number) => (xm + OX) * S
const pym = (dm: number) => (dm + OY) * S
// Eje horizontal espejado: en coords plegadas (arco arriba, ataque hacia arriba)
// la banda del extremo IZQUIERDO cae en ny alto → debe ir a la izquierda de la
// pantalla. FIFA da coords absolutas y el pliegue 180° las normaliza bien; aquí
// solo se corrige la lectura izquierda/derecha del render.
const gx = (ny: number) => pxm(((100 - ny) / 100) * W)
const gy = (nx: number) => pym(((100 - nx) / 100) * 105)
const LINE = 'rgba(255,255,255,0.22)'

const STAGE_ORDER = [
  'Fase de grupos',
  'Dieciseisavos',
  'Octavos',
  'Cuartos',
  'Semifinal',
  'Tercer puesto',
  'Final',
]

// ── Estadísticas (mismas reglas que el backend; se recalculan al filtrar) ────
type Conv = { shots: number; goals: number; pct: number }
const r1 = (n: number) => Math.round(n * 10) / 10
function median(a: number[]): number {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function computeStats(shots: Shot[]) {
  const conv = (arr: Shot[]): Conv => {
    const goals = arr.filter((s) => s.goal).length
    return { shots: arr.length, goals, pct: arr.length ? r1((100 * goals) / arr.length) : 0 }
  }
  const nonPen = shots.filter((s) => !s.pen)
  return {
    total: conv(shots),
    nonPen: conv(nonPen),
    inside: conv(nonPen.filter((s) => s.inBox)),
    outside: conv(nonPen.filter((s) => !s.inBox)),
    penalties: conv(shots.filter((s) => s.pen)),
    medShot: r1(median(nonPen.map((s) => s.dist))),
    medGoal: r1(median(nonPen.filter((s) => s.goal).map((s) => s.dist))),
  }
}

function Pitch({ cloud }: { cloud: Shot[] }) {
  const arcDx = Math.sqrt(9.15 ** 2 - 5.5 ** 2)
  const arcPath = `M ${pxm(34 - arcDx)},${pym(16.5)} A ${9.15 * S},${9.15 * S} 0 0 0 ${pxm(34 + arcDx)},${pym(16.5)}`
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto block" aria-hidden="true">
      <defs>
        <linearGradient id="pitchFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stopColor="#0C0A16" stopOpacity="0" />
          <stop offset="1" stopColor="#110E1E" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect x={pxm(0)} y={pym(0)} width={W * S} height={HL * S} fill="#0C0A16" rx="4" />
      {Array.from({ length: 5 }).map((_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x={pxm(0)} y={pym(i * 9)} width={W * S} height={9 * S} fill="rgba(0,224,143,0.035)" />
        ) : null,
      )}
      <g fill="#FFFFFF" fillOpacity="0.13">
        {cloud.map((s, i) => (
          <circle key={i} cx={gx(s.y)} cy={gy(s.x)} r="2.5" />
        ))}
      </g>
      <g stroke={LINE} strokeWidth="1.6" fill="none">
        <line x1={pxm(0)} y1={pym(0)} x2={pxm(W)} y2={pym(0)} />
        <line x1={pxm(0)} y1={pym(0)} x2={pxm(0)} y2={pym(HL)} />
        <line x1={pxm(W)} y1={pym(0)} x2={pxm(W)} y2={pym(HL)} />
        <rect x={pxm(13.84)} y={pym(0)} width={40.32 * S} height={16.5 * S} />
        <rect x={pxm(24.84)} y={pym(0)} width={18.32 * S} height={5.5 * S} />
        <path d={arcPath} />
      </g>
      <rect x={pxm(30.34)} y={pym(-1.4)} width={7.32 * S} height={1.4 * S} fill={LINE} />
      <circle cx={pxm(34)} cy={pym(11)} r="2" fill={LINE} />
      <rect x={pxm(0)} y={pym(HL - 12)} width={W * S} height={12 * S + OY * S} fill="url(#pitchFade)" />
    </svg>
  )
}

function StatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="relative bg-ink-950/60 border border-white/8 rounded-2xl p-3 sm:p-4 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: accent }} />
      <span className="font-display text-xl sm:text-[1.7rem] leading-none whitespace-nowrap" style={{ color: accent }}>
        {value}
      </span>
      <span className="block font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500 mt-2">
        {label}
      </span>
    </div>
  )
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string
  allLabel: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0 grow shrink basis-[150px]">
      <span className="font-condensed font-extrabold text-[9px] uppercase tracking-[0.14em] text-gray-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-ink-950 border border-white/10 rounded-lg text-sm text-white px-2.5 py-2 focus:outline-none focus:border-gold/50 cursor-pointer truncate"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function ShotMap() {
  const [data, setData] = useState<ShotMapData | null>(null)
  const [view, setView] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [active, setActive] = useState<number | null>(null)
  const [stage, setStage] = useState('')
  const [team, setTeam] = useState('')
  const [player, setPlayer] = useState('')

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

  const shots = data?.shots ?? []

  // Opciones: fase y país son independientes; jugador depende del país.
  const stages = useMemo(
    () =>
      [...new Set(shots.map((s) => s.stage).filter(Boolean))].sort(
        (a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b),
      ),
    [shots],
  )
  const teams = useMemo(
    () => [...new Set(shots.map((s) => s.team).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [shots],
  )
  const players = useMemo(
    () =>
      [...new Set(shots.filter((s) => !team || s.team === team).map((s) => s.player).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'es'),
      ),
    [shots, team],
  )

  const filtered = useMemo(
    () =>
      shots.filter(
        (s) =>
          (!stage || s.stage === stage) && (!team || s.team === team) && (!player || s.player === player),
      ),
    [shots, stage, team, player],
  )

  const cloud = useMemo(() => filtered.filter((s) => !s.goal && !s.pen), [filtered])
  const goals = useMemo(() => filtered.filter((s) => s.goal && !s.pen), [filtered])
  const stats = useMemo(() => computeStats(filtered), [filtered])

  // Al cambiar país, si el jugador ya no pertenece, lo limpiamos.
  const onTeam = (t: string) => {
    setTeam(t)
    setActive(null)
    if (player && !shots.some((s) => (!t || s.team === t) && s.player === player)) setPlayer('')
  }

  const anyFilter = stage || team || player
  const updated =
    data && new Date(data.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return (
    <section className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden fade-up-2">
      <div className="tri-stripe" />
      <span className="wm-26 -right-6 -bottom-12" aria-hidden="true">26</span>

      <div className="relative z-10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-1">
          <h2 className="font-display text-base sm:text-lg text-white uppercase tracking-tight flex items-center gap-2.5">
            <Icon name="ball" size={20} className="text-gold flex-shrink-0" />
            Dónde se dispara y dónde entra
          </h2>
          {data && (
            <span className="chip text-gray-400 flex-shrink-0 self-start">
              {data.matches} part. · Act. {updated}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 font-medium mb-4">
          Cada punto es un remate; cada bandera, un gol. Pasa el cursor sobre una bandera para el
          detalle. Datos oficiales de FIFA.
        </p>

        {view === 'loading' && (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        )}

        {view === 'empty' && (
          <div className="text-center py-16">
            <Icon name="ball" size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
              El mapa se genera a diario. Aún no hay datos disponibles.
            </p>
          </div>
        )}

        {view === 'ready' && data && (
          <>
            {/* Filtros: fase y país independientes; jugador depende del país */}
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <FilterSelect label="Fase" allLabel="Todas las fases" value={stage} onChange={(v) => { setStage(v); setActive(null) }} options={stages} />
              <FilterSelect label="País" allLabel="Todos los países" value={team} onChange={onTeam} options={teams} />
              <FilterSelect label="Jugador" allLabel="Todos los jugadores" value={player} onChange={(v) => { setPlayer(v); setActive(null) }} options={players} />
              {anyFilter && (
                <button
                  type="button"
                  onClick={() => { setStage(''); setTeam(''); setPlayer(''); setActive(null) }}
                  className="btn-ghost !py-2 !px-3 text-xs"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
              {/* Cancha */}
              <div>
                <div className="flex items-center gap-4 mb-2 text-[11px] text-gray-400 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/30" /> remate
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-2.5 rounded-[2px] bg-gradient-to-r from-ca via-gold to-mx ring-1 ring-white/20" />{' '}
                    gol (bandera del goleador)
                  </span>
                </div>

                <div className="relative" onMouseLeave={() => setActive(null)}>
                  <Pitch cloud={cloud} />
                  {/* Goles como banderas (overlay alineado al viewBox del SVG) */}
                  <div className="absolute inset-0">
                    {goals.map((g, i) => {
                      const left = (gx(g.y) / VW) * 100
                      const top = (gy(g.x) / VH) * 100
                      const below = top < 28
                      const isActive = active === i
                      return (
                        <div
                          key={i}
                          className="absolute"
                          style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', zIndex: isActive ? 30 : 10 }}
                        >
                          <button
                            type="button"
                            onMouseEnter={() => setActive(i)}
                            onFocus={() => setActive(i)}
                            onClick={() => setActive(isActive ? null : i)}
                            aria-label={`Gol de ${g.player} (${g.team}), minuto ${g.minute}, a ${g.dist} metros, ${g.inBox ? 'dentro del área' : 'fuera del área'}`}
                            className="block p-0.5 -m-0.5 rounded-full transition-transform hover:scale-150 focus:scale-150 focus:outline-none cursor-pointer"
                          >
                            <Flag
                              team={g.team}
                              className={`h-3 sm:h-3.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] ${isActive ? 'ring-2 ring-gold' : ''}`}
                            />
                          </button>
                          {isActive && (
                            <div
                              role="tooltip"
                              className="absolute left-1/2 -translate-x-1/2 w-44 z-40 pointer-events-none bg-panel-2 border border-white/15 rounded-xl p-2.5 shadow-xl shadow-black/60"
                              style={below ? { top: 'calc(50% + 14px)' } : { bottom: 'calc(50% + 14px)' }}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Flag team={g.team} className="h-3" />
                                <span className="font-condensed font-extrabold text-[11px] uppercase tracking-wide text-white truncate">
                                  {g.player || g.team}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 leading-relaxed">
                                {g.team} · min {g.minute}
                                <br />
                                <span className="text-gold font-bold">{g.dist} m</span> ·{' '}
                                {g.inBox ? 'dentro del área' : 'fuera del área'}
                                {g.home && g.away && (
                                  <>
                                    <br />
                                    <span className="text-gray-500">Partido:</span>{' '}
                                    <span className="text-gray-300">{g.home} vs {g.away}</span>
                                    {g.stage && <span className="text-gray-500"> · {g.stage}</span>}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {filtered.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500 bg-ink-950/70 px-4 py-2 rounded-lg">
                        Sin remates para este filtro
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lectura + métricas (recalculadas según filtros) */}
              <div>
                <div className="flex items-baseline gap-2.5 mb-1">
                  <span className="font-display text-5xl text-gold leading-none">{stats.outside.pct}%</span>
                  <p className="text-sm text-gray-300 leading-snug">
                    de los remates desde <b className="text-white">fuera del área</b> son gol.
                  </p>
                </div>
                <p className="text-xs text-gray-500 mb-5">
                  Dentro del área la cifra {stats.inside.pct >= stats.outside.pct ? 'sube' : 'es'} a{' '}
                  <b className="text-mx">{stats.inside.pct}%</b>. La distancia es la variable que más
                  mueve la probabilidad de gol.
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <StatCard value={stats.medShot ? `${stats.medShot} m` : '—'} label="Mediana · remate" accent="#FFFFFF" />
                  <StatCard value={stats.medGoal ? `${stats.medGoal} m` : '—'} label="Mediana · gol" accent="#FFC300" />
                  <StatCard value={`${stats.nonPen.pct}%`} label="Remates que son gol" accent="#00E08F" />
                </div>

                <p className="text-[10px] text-gray-500 border-t border-white/8 pt-3 mt-4 flex items-center gap-2 flex-wrap">
                  <span>
                    {stats.total.shots} remates · {stats.total.goals} goles
                    {anyFilter ? ' (filtrado)' : ''}
                  </span>
                  {stats.penalties.shots > 0 && (
                    <span className="chip text-gray-400">
                      {stats.penalties.goals}/{stats.penalties.shots} penales
                    </span>
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
