import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Icon, { type IconName } from './Icon'

interface Props { unpredicted?: number }

const mainItems: { to: string; icon: IconName; label: string }[] = [
  { to: '/home', icon: 'home', label: 'Inicio' },
  { to: '/matches', icon: 'ball', label: 'Partidos' },
  { to: '/bracket', icon: 'trophy', label: 'Bracket' },
  { to: '/leaderboard', icon: 'chart', label: 'Ranking' },
]

const moreItems: { to: string; icon: IconName; label: string }[] = [
  { to: '/calendar', icon: 'calendar', label: 'Calendario' },
  { to: '/teams', icon: 'globe', label: 'Equipos' },
  { to: '/stadiums', icon: 'stadium', label: 'Estadios' },
  { to: '/groups', icon: 'users', label: 'Grupos' },
  { to: '/my', icon: 'target', label: 'Mis predicciones' },
  { to: '/standings', icon: 'medal', label: 'Clasificaciones' },
  { to: '/stats', icon: 'trending', label: 'Estadísticas' },
  { to: '/simulator', icon: 'zap', label: 'Simulador' },
  { to: '/profile', icon: 'user', label: 'Perfil' },
  { to: '/rules', icon: 'book', label: 'Guía' },
]

export default function BottomNav({ unpredicted = 0 }: Props) {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const [showMore, setShowMore] = useState(false)
  if (!user) return null

  const items = user.isAdmin
    ? [...moreItems, { to: '/admin', icon: 'wrench' as IconName, label: 'Admin' }]
    : moreItems

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-ink-900/98 backdrop-blur border-t border-white/8 px-4 pt-1 pb-4"
            onClick={e => e.stopPropagation()}>
            <div className="tri-stripe -mx-4 mb-4" />
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.18em] font-condensed font-black mb-3">Más secciones</p>
            <div className="grid grid-cols-4 gap-2">
              {items.map(item => (
                <Link key={item.to} to={item.to}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-panel border border-white/6 text-gray-300 hover:border-gold/30 hover:text-gold transition">
                  <Icon name={item.icon} size={20} />
                  <span className="text-[9px] font-condensed font-extrabold uppercase tracking-wide">{item.label}</span>
                </Link>
              ))}
              <button onClick={toggle}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-panel border border-white/6 text-gray-300 hover:border-gold/30 hover:text-gold transition">
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
                <span className="text-[9px] font-condensed font-extrabold uppercase tracking-wide">
                  {theme === 'dark' ? 'Claro' : 'Oscuro'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-ink-950/95 backdrop-blur-lg border-t border-white/8 select-none">
        <div className="flex">
          {mainItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150 relative ${
                  isActive ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
                }`
              }>
              {({ isActive }) => (
                <>
                  <span className="relative flex items-center justify-center">
                    <Icon name={item.icon} size={19} strokeWidth={isActive ? 2.4 : 2} />
                    {item.to === '/matches' && unpredicted > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center bg-ca text-white font-black rounded-full"
                        style={{ fontSize: 7, minWidth: 12, height: 12, padding: '0 2px' }}>
                        {unpredicted > 9 ? '9+' : unpredicted}
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-condensed font-black">{item.label}</span>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-[3px] rounded-b-full bg-gradient-to-r from-ca via-gold to-mx" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          <button onClick={() => setShowMore(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150 ${
              showMore ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
            }`}>
            <Icon name="dots" size={19} />
            <span className="text-[9px] uppercase tracking-wider font-condensed font-black">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
