import type { ReactNode } from 'react'
import Icon, { type IconName } from '../Icon'
import { C } from './theme'

/**
 * Contenedor estándar de panel de estadística (mismo lenguaje visual que
 * ShotMap / StatsPage): borde, franja tricolor, cabecera con icono + chip y
 * pie de página opcional. Mantiene todos los gráficos consistentes.
 */
export function ChartPanel({
  title,
  subtitle,
  description,
  icon,
  iconClass = 'text-gold',
  footnote,
  children,
  fade = 'fade-up-2',
  watermark = false,
  className = '',
}: {
  title: string
  subtitle?: ReactNode
  description?: ReactNode
  icon: IconName
  iconClass?: string
  footnote?: ReactNode
  children: ReactNode
  fade?: string
  watermark?: boolean
  className?: string
}) {
  return (
    <section className={`relative bg-panel border border-white/8 rounded-2xl overflow-hidden ${fade} ${className}`}>
      <div className="tri-stripe" />
      {watermark && <span className="wm-26 -right-6 -bottom-12" aria-hidden="true">26</span>}
      <div className="relative z-10 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-1">
          <h2 className="font-display text-base sm:text-lg text-white uppercase tracking-tight flex items-center gap-2.5">
            <Icon name={icon} size={20} className={`${iconClass} flex-shrink-0`} />
            {title}
          </h2>
          {subtitle != null && <span className="chip text-gray-400 flex-shrink-0 self-start">{subtitle}</span>}
        </div>
        {description && <p className="text-xs text-gray-500 font-medium mb-4">{description}</p>}
        {children}
        {footnote && (
          <p className="text-[10px] text-gray-500 border-t border-white/8 pt-4 mt-5 leading-relaxed">{footnote}</p>
        )}
      </div>
    </section>
  )
}

/** Anillo de dona multi-segmento con contenido centrado opcional. */
export function Donut({
  segments,
  size = 132,
  thickness = 14,
  center,
}: {
  segments: { value: number; color: string }[]
  size?: number
  thickness?: number
  center?: ReactNode
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  // Longitud y desplazamiento acumulado de cada arco, sin mutar nada en el render.
  const lens = segments.map((s) => (s.value / total) * circ)
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.track} strokeWidth={thickness} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${lens[i]} ${circ - lens[i]}`}
            strokeDashoffset={-offsets[i]}
          />
        ))}
      </svg>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          {center}
        </div>
      )}
    </div>
  )
}

/** Estado vacío reutilizable (mismo tono que ShotMap / StatsPage). */
export function EmptyChart({ icon = 'chart', label }: { icon?: IconName; label: string }) {
  return (
    <div className="text-center py-12">
      <Icon name={icon} size={30} className="mx-auto text-gray-600 mb-3" />
      <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">{label}</p>
    </div>
  )
}
