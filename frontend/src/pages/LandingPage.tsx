import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const KICKOFF = new Date('2026-06-11T19:00:00Z')

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(KICKOFF.getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(KICKOFF.getTime() - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, started: timeLeft <= 0 }
}

export default function LandingPage() {
  const { days, hours, minutes, seconds, started } = useCountdown()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center py-12">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-yellow-400 text-xs font-bold mb-6 uppercase tracking-wider">
          🏆 USA · CANADA · MÉXICO 2026
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
          <span className="text-white">Mundial26</span>
          <br />
          <span className="text-yellow-400">Predictor</span>
        </h1>

        <p className="text-gray-400 mb-8 max-w-sm text-lg">
          Predice los marcadores. Compite con amigos. Demuestra que la tienes clara.
        </p>

        {!started ? (
          <div className="mb-8">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">El torneo arranca en</p>
            <div className="flex gap-3">
              {[
                { value: days, label: 'días' },
                { value: hours, label: 'horas' },
                { value: minutes, label: 'min' },
                { value: seconds, label: 'seg' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 min-w-[60px] text-center">
                  <div className="text-2xl md:text-3xl font-black text-yellow-400 tabular-nums">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-6 py-3">
            <p className="text-yellow-400 font-bold">🏆 ¡El torneo ya comenzó!</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Link to="/register"
            className="bg-yellow-400 text-gray-950 font-black px-8 py-3 rounded-xl text-base hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20 text-center">
            Jugar gratis →
          </Link>
          <Link to="/login"
            className="border border-gray-700 text-gray-300 font-bold px-8 py-3 rounded-xl text-base hover:border-gray-500 hover:text-white transition text-center">
            Iniciar sesión
          </Link>
        </div>

        <Link to="/rules" className="text-gray-600 hover:text-gray-400 text-sm transition">
          ¿Cómo funciona? →
        </Link>
      </div>

      <div className="relative grid grid-cols-3 border-t border-gray-800">
        {[
          { icon: '🎯', label: 'Predice', desc: 'El marcador exacto de cada partido antes de que empiece' },
          { icon: '🏅', label: 'Puntúa', desc: '3 pts marcador exacto · 1 pt resultado correcto' },
          { icon: '👥', label: 'Compite', desc: 'Ranking global y grupos privados con tus amigos' },
        ].map((item, i) => (
          <div key={item.label}
            className={`bg-gray-900/50 px-4 md:px-6 py-6 text-center ${i < 2 ? 'border-r border-gray-800' : ''}`}>
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-bold text-white text-sm mb-1">{item.label}</div>
            <div className="text-gray-600 text-xs hidden md:block leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
