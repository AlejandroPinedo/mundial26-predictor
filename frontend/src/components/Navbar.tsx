import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavbarProps {
  unpredicted?: number
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center bg-red-500 text-white font-black leading-none rounded-full"
      style={{ fontSize: 10, minWidth: 18, height: 18, padding: '0 4px' }}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function Navbar({ unpredicted = 0 }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
    setOpen(false)
  }

  return (
    <nav className="bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <Link to="/matches" className="text-yellow-400 font-black text-xl tracking-tight">
          ⚽ Mundial26
        </Link>

        <button onClick={() => setOpen(!open)}
          className="md:hidden text-gray-400 hover:text-white text-2xl">
          {open ? '✕' : '☰'}
        </button>

        <div className="hidden md:flex gap-5 items-center">
          <Link to="/matches" className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition">
            Partidos
            {unpredicted > 0 && <Badge count={unpredicted} />}
          </Link>
          <Link to="/my" className="text-gray-300 hover:text-white text-sm transition">Predicciones</Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-white text-sm transition">Ranking</Link>
          <Link to="/bracket" className="text-gray-300 hover:text-white text-sm transition">Playoff</Link>
          <Link to="/groups" className="text-gray-300 hover:text-white text-sm transition">Grupos</Link>
          <Link to="/profile" className="text-gray-300 hover:text-white text-sm transition">Perfil</Link>
          {user?.isAdmin && (
            <Link to="/admin" className="text-orange-400 hover:text-orange-300 text-sm font-bold transition">Admin</Link>
          )}
          <span className="text-gray-700">|</span>
          <span className="text-gray-500 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm transition">Salir</button>
        </div>
      </div>

      {open && (
        <div className="md:hidden mt-4 flex flex-col gap-4 pb-2 border-t border-gray-800 pt-4">
          <Link to="/matches" onClick={() => setOpen(false)} className="flex items-center justify-between text-gray-300 hover:text-white">
            <span>Partidos</span>
            {unpredicted > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {unpredicted} sin predecir
              </span>
            )}
          </Link>
          <Link to="/my" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Predicciones</Link>
          <Link to="/leaderboard" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Ranking</Link>
          <Link to="/bracket" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Playoff</Link>
          <Link to="/groups" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Grupos</Link>
          <Link to="/profile" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Perfil</Link>
          {user?.isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className="text-orange-400 font-bold">Admin</Link>
          )}
          <span className="text-gray-500 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-red-400 text-left">Salir</button>
        </div>
      )}
    </nav>
  )
}
