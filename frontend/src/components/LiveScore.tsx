/**
 * Badge de marcador EN VIVO (Varzesh3). Se muestra solo cuando live_status === 'LIVE'.
 * Es display-only: estos campos NO afectan puntos (el resultado oficial llega aparte).
 */
export type LiveFields = {
  live_status?: string | null
  live_home?: number | null
  live_away?: number | null
  live_minute?: string | null
}

export function isLive(m: LiveFields): boolean {
  return m.live_status === 'LIVE'
}

export default function LiveScore({ m }: { m: LiveFields }) {
  if (m.live_status !== 'LIVE') return null
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="scoreboard px-2.5 py-1 rounded-lg text-sm">
        {m.live_home ?? 0} - {m.live_away ?? 0}
      </div>
      <span className="inline-flex items-center gap-1 text-[9px] font-condensed font-extrabold uppercase tracking-[0.14em] text-ca whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-ca animate-pulse" />
        EN VIVO{m.live_minute ? ` ${m.live_minute}` : ''}
      </span>
    </div>
  )
}
