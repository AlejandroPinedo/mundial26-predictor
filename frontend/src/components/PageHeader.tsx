import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  badge?: string
  live?: boolean
  action?: ReactNode
  icon?: string
}

export default function PageHeader({ title, subtitle, badge, live, action, icon }: Props) {
  return (
    <div className="wc-page-header fade-up mb-6">
      <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          {(badge || live) && (
            <div className="flex items-center gap-2 mb-2">
              {live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot flex-shrink-0" />}
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
                  {badge}
                </span>
              )}
            </div>
          )}
          <h1 className="font-display text-4xl md:text-5xl text-white leading-none uppercase tracking-wide flex items-center gap-3">
            {icon && <span className="no-invert text-3xl">{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1.5 font-sans">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
