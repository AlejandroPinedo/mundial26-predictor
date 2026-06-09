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
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-gray-950/75 backdrop-blur-md border-r border-gray-900 z-50 font-sans">
      
      {/* Brand logo */}
      <div className="p-5 border-b border-gray-900 select-none">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl no-invert leading-none">⚽</span>
          <div>
            <p className="font-barlow font-black text-white text-base uppercase tracking-wider leading-none">Mundial26</p>
            <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Predictor</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
        {main.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-150 ${
                isActive
                  ? 'bg-yellow-400/5 text-yellow-400 border-l-2 border-l-yellow-400 rounded-l-none'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
              }`
            }>
            <span className="text-base w-5 text-center relative no-invert flex items-center justify-center">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
                  style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="p-3 border-t border-gray-900 flex flex-col gap-1">
        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-900/50 transition font-bold w-full cursor-pointer">
          <span className="w-5 text-center no-invert flex items-center justify-center">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        {bottom.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-150 ${
                isActive 
                  ? 'bg-yellow-400/5 text-yellow-400 border-l-2 border-l-yellow-400 rounded-l-none' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
              }`
            }>
            <span className="text-base w-5 text-center no-invert flex items-center justify-center">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition w-full cursor-pointer">
          <span className="w-5 text-center no-invert flex items-center justify-center">🚪</span>
          <span>Salir</span>
        </button>
      </div>
    </aside>
  )
}
