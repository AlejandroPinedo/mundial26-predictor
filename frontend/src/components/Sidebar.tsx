import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Icon, { type IconName } from './Icon'

interface Props { unpredicted?: number }

export default function Sidebar({ unpredicted = 0 }: Props) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  const main: { to: string; icon: IconName; label: string; badge?: number }[] = [
    { to: '/home', icon: 'home', label: 'Inicio' },
    { to: '/calendar', icon: 'calendar', label: 'Calendario' },
    { to: '/matches', icon: 'ball', label: 'Partidos', badge: unpredicted },
    { to: '/bracket', icon: 'trophy', label: 'Bracket' },
    { to: '/leaderboard', icon: 'chart', label: 'Ranking' },
    { to: '/standings', icon: 'medal', label: 'Clasificaciones' },
    { to: '/stats', icon: 'trending', label: 'Estadísticas' },
    { to: '/simulator', icon: 'zap', label: 'Simulador' },
    { to: '/my', icon: 'target', label: 'Mis predicciones' },
    { to: '/groups', icon: 'users', label: 'Grupos privados' },
    { to: '/teams', icon: 'globe', label: 'Equipos' },
    { to: '/stadiums', icon: 'stadium', label: 'Estadios' },
    { to: '/rules', icon: 'book', label: 'Guía' },
  ]

  const bottom: { to: string; icon: IconName; label: string }[] = [
    ...(user.isAdmin ? [{ to: '/admin', icon: 'wrench' as IconName, label: 'Admin' }] : []),
    { to: '/profile', icon: 'user', label: user.username },
  ]

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-50 font-sans bg-ink-900 border-r border-white/5">
      <div className="tri-stripe" />

      {/* Brand */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]">
            <span className="font-display text-ink-950 text-sm leading-none">26</span>
          </div>
          <div>
            <p className="font-display text-sm text-white tracking-wider leading-none">MUNDIAL26</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-mx live-dot" />
              <p className="text-mx text-[9px] font-condensed font-extrabold uppercase tracking-[0.18em]">En curso</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pitch-divider mx-5 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {main.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 py-2 px-3 rounded-xl text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-white/[0.06] text-gold'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              }`
            }>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-ca via-gold to-mx" />
                )}
                <span className={`relative w-5 flex items-center justify-center transition-transform ${isActive ? '' : 'group-hover:scale-110'}`}>
                  <Icon name={item.icon} size={17} strokeWidth={isActive ? 2.4 : 2} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-ca text-white font-black rounded-full"
                      style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="font-medium text-[13px]">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="pitch-divider mx-5 mt-2 mb-3" />

      {/* Bottom */}
      <div className="px-3 pb-4 flex flex-col gap-0.5">
        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] transition-all w-full cursor-pointer">
          <span className="w-5 flex items-center justify-center">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </span>
          <span className="font-medium text-[13px]">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        {bottom.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 px-3 rounded-xl text-sm transition-all ${
                isActive ? 'bg-white/[0.06] text-gold' : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              }`
            }>
            <span className="w-5 flex items-center justify-center"><Icon name={item.icon} size={17} /></span>
            <span className="font-medium text-[13px] truncate">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-ca/70 hover:text-ca hover:bg-ca/5 transition-all w-full cursor-pointer">
          <span className="w-5 flex items-center justify-center"><Icon name="logout" size={17} /></span>
          <span className="text-[13px]">Salir</span>
        </button>
      </div>
    </aside>
  )
}
