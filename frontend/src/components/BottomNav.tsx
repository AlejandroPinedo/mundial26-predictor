import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props { unpredicted?: number }

const mainItems = [
  { to: '/home', icon: '🏠', label: 'Inicio' },
  { to: '/matches', icon: '⚽', label: 'Partidos' },
  { to: '/bracket', icon: '🏆', label: 'Bracket' },
  { to: '/leaderboard', icon: '📊', label: 'Ranking' },
]

const moreItems = [
  { to: '/calendar', icon: '📅', label: 'Calendario' },
  { to: '/teams', icon: '🌍', label: 'Equipos' },
  { to: '/stadiums', icon: '🏟️', label: 'Estadios' },
  { to: '/groups', icon: '👥', label: 'Grupos' },
  { to: '/my', icon: '🎯', label: 'Mis predicciones' },
  { to: '/stats', icon: '📈', label: 'Estadísticas' },
  { to: '/profile', icon: '👤', label: 'Perfil' },
  { to: '/rules', icon: '📖', label: 'Guía' },
]

export default function BottomNav({ unpredicted = 0 }: Props) {
  const { user } = useAuth()
  const [showMore, setShowMore] = useState(false)
  if (!user) return null

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-gray-900/98 backdrop-blur border-t border-gray-800 px-4 py-4"
            onClick={e => e.stopPropagation()}>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black mb-3">Más secciones</p>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map(item => (
                <Link key={item.to} to={item.to}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 transition">
                  <span className="text-xl no-invert">{item.icon}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-950/95 backdrop-blur-lg border-t border-gray-800 select-none">
        <div className="flex">
          {mainItems.map(item => (
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

          <button onClick={() => setShowMore(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150 ${
              showMore ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
            }`}>
            <span className="text-lg leading-none">⊕</span>
            <span className="text-[9px] uppercase tracking-wider font-black">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
