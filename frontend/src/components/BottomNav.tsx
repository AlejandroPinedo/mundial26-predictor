import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props { unpredicted?: number }

const items = [
  { to: '/home', icon: '🏠', label: 'Inicio' },
  { to: '/matches', icon: '⚽', label: 'Partidos' },
  { to: '/bracket', icon: '🏆', label: 'Bracket' },
  { to: '/leaderboard', icon: '📊', label: 'Ranking' },
  { to: '/stats', icon: '📈', label: 'Stats' },
  { to: '/profile', icon: '👤', label: 'Perfil' },
]

export default function BottomNav({ unpredicted = 0 }: Props) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-950/80 backdrop-blur-lg border-t border-gray-900 select-none">
      <div className="flex">
        {items.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150 relative ${
                isActive ? 'text-yellow-400 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
            {({ isActive }) => (
              <>
                <span className="relative text-lg leading-none no-invert flex items-center justify-center">
                  {item.icon}
                  {item.to === '/matches' && unpredicted > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
                      style={{ fontSize: 7, minWidth: 12, height: 12, padding: '0 2px' }}>
                      {unpredicted > 9 ? '9+' : unpredicted}
                    </span>
                  )}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-black">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
