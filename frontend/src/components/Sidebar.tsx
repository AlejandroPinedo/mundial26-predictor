import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

interface Props { unpredicted?: number }

export default function Sidebar({ unpredicted = 0 }: Props) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  if (!user) return null

  const main = [
    { to: '/home', icon: '🏠', label: 'Inicio' },
    { to: '/calendar', icon: '📅', label: 'Calendario' },
    { to: '/matches', icon: '⚽', label: 'Partidos', badge: unpredicted },
    { to: '/bracket', icon: '🏆', label: 'Bracket' },
    { to: '/leaderboard', icon: '📊', label: 'Ranking' },
    { to: '/standings', icon: '🏅', label: 'Clasificaciones' },
    { to: '/stats', icon: '📈', label: 'Estadísticas' },
    { to: '/my', icon: '🎯', label: 'Mis predicciones' },
    { to: '/groups', icon: '👥', label: 'Grupos privados' },
    { to: '/teams', icon: '🌍', label: 'Equipos' },
    { to: '/stadiums', icon: '🏟️', label: 'Estadios' },
    { to: '/rules', icon: '📖', label: 'Guía' },
  ]

  const bottom = [
    ...(user.isAdmin ? [{ to: '/admin', icon: '🔧', label: 'Admin' }] : []),
    { to: '/profile', icon: '👤', label: user.username },
  ]

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-50 font-sans"
      style={{ background: 'linear-gradient(180deg, #07090f 0%, #030712 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Brand */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <span className="text-base no-invert">⚽</span>
          </div>
          <div>
            <p className="font-display text-base text-white tracking-widest leading-none">MUNDIAL26</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <p className="text-green-400 text-[9px] font-bold uppercase tracking-widest">En curso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pitch divider */}
      <div className="pitch-divider mx-5 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {main.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 px-3 rounded-xl text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-yellow-400/10 text-yellow-400'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              }`
            }>
            {({ isActive }) => (
              <>
                <span className={`text-base w-5 text-center relative no-invert flex items-center justify-center transition-transform ${isActive ? '' : 'group-hover:scale-110'}`}>
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
                      style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="font-medium text-[13px]">{item.label}</span>
                {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-yellow-400 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Pitch divider */}
      <div className="pitch-divider mx-5 mt-2 mb-3" />

      {/* Bottom */}
      <div className="px-3 pb-4 flex flex-col gap-0.5">
        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] transition-all w-full cursor-pointer">
          <span className="w-5 text-center no-invert text-base">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="font-medium text-[13px]">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        {bottom.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 px-3 rounded-xl text-sm transition-all ${
                isActive ? 'bg-yellow-400/10 text-yellow-400' : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              }`
            }>
            <span className="text-base w-5 text-center no-invert">{item.icon}</span>
            <span className="font-medium text-[13px] truncate">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500/70 hover:text-red-400 hover:bg-red-500/5 transition-all w-full cursor-pointer">
          <span className="w-5 text-center no-invert text-base">🚪</span>
          <span className="text-[13px]">Salir</span>
        </button>
      </div>
    </aside>
  )
}
