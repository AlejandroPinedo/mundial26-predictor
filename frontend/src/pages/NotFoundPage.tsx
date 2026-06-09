import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-8xl mb-4">⚽</div>
        <h1 className="text-6xl font-barlow font-black text-yellow-400 mb-2">404</h1>
        <p className="text-gray-400 text-lg mb-2">Esta página no existe</p>
        <p className="text-gray-600 text-sm mb-8">El árbitro ha pitado fuera de juego.</p>
        <Link to="/home"
          className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-2xl hover:bg-yellow-300 transition">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
