import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props { unpredicted?: number }

const items = [
  { to: '/home', icon: '🏠', label: 'Inicio' },
  { to: '/matches', icon: '⚽', label: 'Partidos' },
  { to: '/bracket', icon: '🏆', label: 'Bracket' },
  { to: '/leaderboard', icon: '📊', label: 'Ranking' },
  { to: '/profile', icon: '👤', label: 'Perfil' },
]

export default function BottomNav({ unpredicted = 0 }: Props) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-800">
      <div className="flex">
        {items.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition ${
                isActive ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
            <span className="relative text-xl leading-none no-invert">
              {item.icon}
              {item.to === '/matches' && unpredicted > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-red-500 text-white font-black rounded-full"
                  style={{ fontSize: 8, minWidth: 14, height: 14, padding: '0 2px' }}>
                  {unpredicted > 9 ? '9+' : unpredicted}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
