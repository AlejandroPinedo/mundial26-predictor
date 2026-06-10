import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Icon, { type IconName } from '../components/Icon'

const KICKOFF = new Date('2026-06-11T19:00:00Z')

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => KICKOFF.getTime() - Date.now())

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

const FEATURES: { icon: IconName; tint: string; label: string; desc: string }[] = [
  { icon: 'target', tint: 'text-us', label: 'Predice Marcadores', desc: 'Elige tus resultados antes del pitazo inicial de cada partido.' },
  { icon: 'medal', tint: 'text-gold', label: 'Suma Puntos', desc: 'Gana 3 puntos por marcador exacto y 1 punto por acertar ganador/empate.' },
  { icon: 'users', tint: 'text-mx', label: 'Grupos Privados', desc: 'Crea tu propia liga y chatea en tiempo real con tus amigos.' },
]

export default function LandingPage() {
  const { days, hours, minutes, seconds, started } = useCountdown()

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col relative overflow-hidden font-sans">

      {/* Firma tricolor superior */}
      <div className="tri-stripe relative z-20" />

      {/* Atmósfera: reflectores tricolor de estadio */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-[560px] h-[560px] bg-gold/5 rounded-full blur-[130px]" />
        <div className="absolute top-[8%] left-[-10%] w-[340px] h-[340px] bg-ca/5 rounded-full blur-[110px]" />
        <div className="absolute top-[38%] right-[-10%] w-[420px] h-[420px] bg-us/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-6%] w-[380px] h-[380px] bg-mx/5 rounded-full blur-[110px]" />
        <div className="absolute inset-0 pitch-bg" />
      </div>

      {/* Barra de marca */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 fade-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]">
            <span className="font-display text-ink-950 text-sm leading-none">26</span>
          </div>
          <div>
            <p className="font-display text-sm text-white tracking-wider leading-none uppercase">Mundial26</p>
            <p className="text-gray-500 text-[9px] font-condensed font-extrabold uppercase tracking-[0.2em] mt-1">Canadá · México · USA</p>
          </div>
        </div>
        <span className="chip text-gray-400 hidden sm:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-ca live-dot" />
          Junio 2026
        </span>
      </header>

      {/* Héroe */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-12 md:py-16 w-full max-w-5xl mx-auto">
        <span className="wm-26 -top-4 -left-12 hidden md:block" aria-hidden="true">26</span>
        <span className="wm-26 -bottom-16 -right-10 hidden md:block" aria-hidden="true">26</span>

        {/* Badge anfitriones */}
        <div className="inline-flex items-center gap-2 border border-gold/25 bg-gold/5 rounded-full px-4 py-1.5 mb-7 fade-up">
          <span className="no-invert text-xs">🏆</span>
          <span className="text-gold text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em]">USA · CANADA · MÉXICO 2026</span>
        </div>

        {/* Titular gigante */}
        <h1 className="font-display uppercase tracking-tight leading-[0.85] text-[clamp(3.4rem,10vw,7.5rem)] mb-6 fade-up-1">
          <span className="block text-white drop-shadow-md">Mundial26</span>
          <span className="block tri-text">Predictor</span>
        </h1>

        <p className="text-gray-400 mb-10 max-w-md text-base md:text-lg leading-relaxed fade-up-2">
          Predice los marcadores exactos, compite en grupos privados con tus amigos y demuestra quién es el rey del fútbol.
        </p>

        {/* Cuenta regresiva / En marcha */}
        {!started ? (
          <div className="mb-10 flex flex-col items-center fade-up-3">
            <p className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.3em] mb-4">El torneo arranca en</p>
            <div className="flex items-start gap-2.5 md:gap-3">
              {[
                { value: days, label: 'días' },
                { value: hours, label: 'horas' },
                { value: minutes, label: 'min' },
                { value: seconds, label: 'seg' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="scoreboard rounded-2xl border border-white/8 px-2 py-3.5 min-w-[68px] md:min-w-[88px] text-center">
                    <span className="text-3xl md:text-5xl tabular-nums leading-none">{String(value).padStart(2, '0')}</span>
                  </div>
                  <span className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-10 glass rounded-2xl px-8 py-4 fade-up-3">
            <p className="text-gold font-condensed font-extrabold flex items-center gap-2.5 text-sm uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-ca live-dot flex-shrink-0" />
              <span className="no-invert">⚽</span> ¡El torneo ya está en marcha!
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3.5 mb-7 w-full sm:w-auto fade-up-4">
          <Link to="/register" className="btn-gold text-sm sm:min-w-[210px]">
            Jugar gratis
            <Icon name="chevronRight" size={15} />
          </Link>
          <Link to="/login" className="btn-ghost text-sm sm:min-w-[210px]">
            Iniciar sesión
          </Link>
        </div>

        <Link to="/rules"
          className="text-gray-500 hover:text-gold text-[11px] font-condensed font-extrabold tracking-[0.2em] uppercase transition-colors inline-flex items-center gap-1 fade-up-4">
          ¿Cómo funciona el juego?
          <Icon name="chevronRight" size={13} />
        </Link>
      </main>

      {/* Tarjetas de características */}
      <section className="relative z-10 px-6 md:px-10 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-5 fade-up-3">
            <div className="divider-gold flex-1" />
            <span className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.3em]">Cómo se juega</span>
            <div className="divider-gold flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {FEATURES.map((item, i) => (
              <div key={item.label}
                className={`relative overflow-hidden bg-panel border border-white/8 rounded-2xl px-6 py-7 text-center flex flex-col items-center gap-2.5 hover-lift fade-up-${i + 2}`}>
                <div className="tri-stripe absolute top-0 left-0 right-0" />
                <div className={`w-11 h-11 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center ${item.tint}`}>
                  <Icon name={item.icon} size={20} />
                </div>
                <h3 className="font-display text-white text-sm uppercase tracking-wider">{item.label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pie: trío anfitrión */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="flex items-center justify-center gap-6 md:gap-10 py-4 font-condensed font-extrabold text-[10px] uppercase tracking-[0.25em]">
          <span className="flex items-center gap-2 text-ca"><span className="w-1.5 h-1.5 rounded-full bg-ca" />Canadá</span>
          <span className="flex items-center gap-2 text-mx"><span className="w-1.5 h-1.5 rounded-full bg-mx" />México</span>
          <span className="flex items-center gap-2 text-us"><span className="w-1.5 h-1.5 rounded-full bg-us" />USA</span>
        </div>
      </footer>
    </div>
  )
}
