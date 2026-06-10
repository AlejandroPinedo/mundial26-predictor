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
      <span className="wm-26 -right-4 -bottom-10" aria-hidden="true">26</span>
      <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          {(badge || live) && (
            <div className="flex items-center gap-2 mb-2">
              {live && <span className="w-1.5 h-1.5 rounded-full bg-ca live-dot flex-shrink-0" />}
              {badge && (
                <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em] text-mx">
                  {badge}
                </span>
              )}
            </div>
          )}
          <h1 className="font-display text-3xl md:text-[2.6rem] text-white leading-none uppercase tracking-tight flex items-center gap-3">
            {icon && <span className="no-invert text-3xl">{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-2 font-sans max-w-xl">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
