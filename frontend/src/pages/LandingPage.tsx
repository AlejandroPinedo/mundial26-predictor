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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Dynamic Glowing Blur Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-yellow-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[110px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-16 max-w-4xl mx-auto">
        
        {/* Flag Host Header */}
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-yellow-400 text-xs font-black mb-6 uppercase tracking-wider select-none font-sans shadow-inner">
          <span className="no-invert">🏆</span> USA · CANADA · MÉXICO 2026
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-barlow font-black uppercase tracking-tight leading-[0.9] mb-4">
          <span className="text-white drop-shadow-md">Mundial26</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300">Predictor</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 mb-8 max-w-md text-base md:text-lg leading-relaxed font-sans">
          Predice los marcadores exactos, compite en grupos privados con tus amigos y demuestra quién es el rey del fútbol.
        </p>

        {/* Countdown / Live Indicator */}
        {!started ? (
          <div className="mb-10 flex flex-col items-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-bold">El torneo arranca en</p>
            <div className="flex gap-3">
              {[
                { value: days, label: 'días' },
                { value: hours, label: 'horas' },
                { value: minutes, label: 'min' },
                { value: seconds, label: 'seg' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-gray-900/60 border border-gray-800/80 backdrop-blur-md rounded-2xl px-4 py-3 min-w-[70px] text-center shadow-lg">
                  <div className="text-3xl font-barlow font-black text-yellow-400 tabular-nums">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-10 bg-yellow-400/10 border border-yellow-400/20 rounded-3xl px-8 py-3.5 shadow-lg shadow-yellow-500/5">
            <p className="text-yellow-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
              <span className="no-invert">⚽</span> ¡El torneo ya está en marcha!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full sm:w-auto">
          <Link
            to="/register"
            className="bg-yellow-400 text-gray-950 font-black px-10 py-3.5 rounded-2xl text-base hover:bg-yellow-300 transition-all shadow-lg hover:shadow-yellow-400/20 active:scale-98 text-center uppercase tracking-wider font-barlow cursor-pointer"
            id="landing-register-btn"
          >
            Jugar gratis →
          </Link>
          <Link
            to="/login"
            className="border border-gray-800 text-gray-300 font-bold px-10 py-3.5 rounded-2xl text-base hover:border-gray-600 hover:text-white transition-all bg-gray-900/40 backdrop-blur-md active:scale-98 text-center cursor-pointer"
            id="landing-login-btn"
          >
            Iniciar sesión
          </Link>
        </div>

        <Link to="/rules" className="text-gray-500 hover:text-yellow-400 text-xs font-semibold tracking-wider uppercase transition-colors">
          ¿Cómo funciona el juego? →
        </Link>
      </div>

      {/* Feature cards row */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 border-t border-gray-900 bg-gray-900/10 backdrop-blur-sm">
        {[
          { icon: '🎯', label: 'Predice Marcadores', desc: 'Elige tus resultados antes del pitazo inicial de cada partido.' },
          { icon: '🏅', label: 'Suma Puntos', desc: 'Gana 3 puntos por marcador exacto y 1 punto por acertar ganador/empate.' },
          { icon: '👥', label: 'Grupos Privados', desc: 'Crea tu propia liga y chatea en tiempo real con tus amigos.' },
        ].map((item, i) => (
          <div
            key={item.label}
            className={`px-6 py-8 text-center flex flex-col items-center gap-2 ${
              i < 2 ? 'border-b md:border-b-0 md:border-r border-gray-900/60' : 'border-b md:border-b-0 border-gray-900/60'
            }`}
          >
            <div className="text-3xl mb-1 no-invert">{item.icon}</div>
            <h3 className="font-barlow font-black text-white text-base uppercase tracking-wider">{item.label}</h3>
            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
