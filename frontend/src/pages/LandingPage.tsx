import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-8xl mb-6">⚽</div>
        <h1 className="text-5xl font-black text-yellow-400 mb-4 tracking-tight">
          Mundial26 Predictor
        </h1>
        <p className="text-xl text-gray-400 mb-2 max-w-md">
          Predice los marcadores del Mundial 2026 y compite con tus amigos.
        </p>
        <p className="text-yellow-400 font-bold mb-10">
          🏆 El torneo arranca el 11 de junio
        </p>
        <div className="flex gap-4">
          <Link to="/register"
            className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-xl text-lg hover:bg-yellow-300 transition">
            Jugar gratis
          </Link>
          <Link to="/login"
            className="border border-gray-700 text-gray-300 font-bold px-8 py-3 rounded-xl text-lg hover:border-gray-500 transition">
            Iniciar sesión
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-gray-800 border-t border-gray-800">
        {[
          { icon: '🎯', label: 'Predice', desc: 'El marcador exacto de cada partido' },
          { icon: '🏅', label: 'Puntúa', desc: '3 pts por marcador exacto, 1 pt por resultado' },
          { icon: '📊', label: 'Compite', desc: 'Ranking en tiempo real con tus amigos' },
        ].map(item => (
          <div key={item.label} className="bg-gray-900 px-6 py-8 text-center">
            <div className="text-4xl mb-3">{item.icon}</div>
            <div className="font-bold text-white mb-1">{item.label}</div>
            <div className="text-gray-500 text-sm">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}