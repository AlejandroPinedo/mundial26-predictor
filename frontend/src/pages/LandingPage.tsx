import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const KICKOFF = new Date('2026-06-11T19:00:00Z')

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(KICKOFF.getTime() - Date.now())

  useEffect(() => {                                                                                                 
    const interval = setInterval(() => {
      setTimeLeft(KICKOFF.getTime() - Date.now())
    }, 1000)
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-8xl mb-6">⚽</div>
        <h1 className="text-5xl font-black text-yellow-400 mb-4 tracking-tight">
          Mundial26 Predictor
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-md">
          Predice los marcadores del Mundial 2026 y compite con tus amigos.
        </p>

        {!started ? (
          <div className="flex gap-4 mb-10">
            {[
              { value: days, label: 'días' },
              { value: hours, label: 'horas' },
              { value: minutes, label: 'min' },
              { value: seconds, label: 'seg' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-gray-900 rounded-xl px-5 py-3 min-w-16 text-center">
                <div className="text-3xl font-black text-yellow-400">
                  {String(value).padStart(2, '0')}
                </div>
                <div className="text-gray-500 text-xs">{label}</div>
              </div>
            ))}
          </div>                                                                                                    
        ) : (
          <p className="text-yellow-400 font-bold text-xl mb-10">🏆 ¡El torneo ya comenzó!</p>
        )}

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
