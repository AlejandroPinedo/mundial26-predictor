import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()                                                                                
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')                                                                                                   
    setOpen(false)
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex justify-between items-center">
        <Link to="/matches" className="text-yellow-400 font-bold text-lg">
          Mundial26 ⚽
        </Link>

        <button onClick={() => setOpen(!open)}
          className="md:hidden text-gray-400 hover:text-white text-2xl">
          {open ? '✕' : '☰'}
        </button>

        <div className="hidden md:flex gap-6 items-center">                                                         
          <Link to="/matches" className="text-gray-300 hover:text-white text-sm">Partidos</Link>
          <Link to="/my" className="text-gray-300 hover:text-white text-sm">Mis predicciones</Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-white text-sm">Ranking</Link>
          <Link to="/profile" className="text-gray-300 hover:text-white text-sm">Perfil</Link>
          {user?.isAdmin && (
            <Link to="/admin" className="text-orange-400 hover:text-orange-300 text-sm font-bold">Admin</Link>
          )}
          <span className="text-gray-700">|</span>
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm">Salir</button>
        </div>
      </div>

      {open && (                                                                                                    
        <div className="md:hidden mt-4 flex flex-col gap-4 pb-2">
          <Link to="/matches" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Partidos</Link>
          <Link to="/my" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Mis predicciones</Link>
          <Link to="/leaderboard" onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">Ranking</Link>
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
