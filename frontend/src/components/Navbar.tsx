import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center">
      <Link to="/matches" className="text-yellow-400 font-bold text-lg">
        Mundial26 ⚽
      </Link>
      <div className="flex gap-6 items-center">
        <Link to="/matches" className="text-gray-300 hover:text-white">Partidos</Link>
        <Link to="/my" className="text-gray-300 hover:text-white">Mis predicciones</Link>
        <Link to="/leaderboard" className="text-gray-300 hover:text-white">Ranking</Link>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">{user?.username}</span>
        <button onClick={logout} className="text-red-400 hover:text-red-300 text-sm">
          Salir
        </button>
      </div>
    </nav>
  )
}