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
    { to: '/stats', icon: '📈', label: 'Estadísticas' },
    { to: '/my', icon: '🎯', label: 'Mis predicciones' },
    { to: '/groups', icon: '👥', label: 'Grupos privados' },
    { to: '/teams', icon: '🌍', label: 'Equipos' },
    { to: '/stadiums', icon: '🏟️', label: 'Estadios' },
    { to: '/rules', icon: '📋', label: 'Reglas' },
  ]

  const bottom = [
    ...(user.isAdmin ? [{ to: '/admin', icon: '🔧', label: 'Admin' }] : []),
    { to: '/profile', icon: '👤', label: user.username },
  ]

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-gray-900 border-r border-gray-800 z-50">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl no-invert">⚽</span>
          <div>
            <p className="font-black text-yellow-400 text-sm leading-none">Mundial26</p>
            <p className="text-gray-600 text-xs">Predictor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {main.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-yellow-400/15 text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }>
            <span className="text-base w-5 text-center relative no-invert">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
                  style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800 flex flex-col gap-1">
        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition w-full">
          <span className="w-5 text-center no-invert">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        {bottom.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                isActive ? 'bg-yellow-400/15 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }>
            <span className="text-base w-5 text-center no-invert">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition w-full">
          <span className="w-5 text-center no-invert">🚪</span>
          <span>Salir</span>
        </button>
      </div>
    </aside>
  )
}
