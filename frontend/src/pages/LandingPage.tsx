import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import Flag from '../components/Flag'

const KICKOFF = new Date('2026-06-11T19:00:00Z')

// Banderas para la marquesina inferior (claves ES de utils/flags.ts).
const FLAGS = [
  'Argentina', 'Brasil', 'Francia', 'España', 'Inglaterra', 'Alemania', 'Portugal',
  'Países Bajos', 'México', 'Estados Unidos', 'Canadá', 'Croacia', 'Uruguay', 'Bélgica',
  'Japón', 'Marruecos', 'Colombia', 'Senegal', 'Suiza', 'Corea del Sur',
]

// Cifras del torneo (se muestran una vez arrancado, en lugar de la cuenta regresiva).
const STATS = [
  { value: '48', label: 'selecciones' },
  { value: '104', label: 'partidos' },
  { value: '1', label: 'campeón' },
]

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => KICKOFF.getTime() - Date.now())
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(KICKOFF.getTime() - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  return {
    days: Math.floor(timeLeft / 86_400_000),
    hours: Math.floor((timeLeft % 86_400_000) / 3_600_000),
    minutes: Math.floor((timeLeft % 3_600_000) / 60_000),
    seconds: Math.floor((timeLeft % 60_000) / 1000),
    started: timeLeft <= 0,
  }
}

export default function LandingPage() {
  const { days, hours, minutes, seconds, started } = useCountdown()
  const countdown = [
    { value: days, label: 'días' },
    { value: hours, label: 'hrs' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'seg' },
  ]

  return (
    <div className="min-h-dvh bg-ink-950 text-white relative overflow-hidden flex flex-col font-sans">
      <div className="tri-stripe relative z-20" />

      {/* Atmósfera: haces de luz tri-color de estadio */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="beam absolute -top-1/3 left-[8%] w-44 h-[170%] bg-gradient-to-b from-transparent via-ca/25 to-transparent blur-[40px]" />
        <div className="beam beam-2 absolute -top-1/3 left-[42%] w-56 h-[170%] bg-gradient-to-b from-transparent via-gold/30 to-transparent blur-[44px]" />
        <div className="beam beam-3 absolute -top-1/3 left-[72%] w-48 h-[170%] bg-gradient-to-b from-transparent via-mx/22 to-transparent blur-[40px]" />
        <div className="absolute inset-0 pitch-bg opacity-70" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-white/[0.035] select-none leading-none" style={{ fontSize: '46vmin' }}>26</span>
      </div>

      {/* Barra de marca */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]">
            <span className="font-display text-ink-950 text-sm leading-none">26</span>
          </div>
          <div>
            <p className="font-display text-sm text-white tracking-wider leading-none uppercase">Mundial26</p>
            <p className="text-gray-500 text-[9px] font-condensed font-extrabold uppercase tracking-[0.2em] mt-1">Canadá · México · USA</p>
          </div>
        </div>
        <Link to="/login" className="chip text-gray-300 hover:text-gold transition hidden sm:inline-flex">Iniciar sesión</Link>
      </header>

      {/* Héroe */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-10">
        <div className="inline-flex items-center gap-2 border border-gold/25 bg-gold/5 rounded-full px-4 py-1.5 mb-8 fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-gold live-dot" />
          <span className="text-gold text-[10px] font-condensed font-extrabold uppercase tracking-[0.24em]">USA · Canadá · México 2026</span>
        </div>

        <h1 className="font-display uppercase tracking-tight leading-[0.82] text-[clamp(3.6rem,13vw,9rem)] fade-up-1">
          <span className="block text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">El Mundial</span>
          <span className="block tri-text">es tuyo</span>
        </h1>

        <p className="text-gray-300 mt-6 mb-9 max-w-lg text-base md:text-xl leading-relaxed fade-up-2">
          Predice cada marcador, reta a tus amigos y demuestra que lo viste venir.
        </p>

        {/* En marcha → cifras del torneo · antes del arranque → cuenta regresiva */}
        {started ? (
          <div className="flex flex-col items-center gap-5 mb-9 fade-up-3">
            <span className="inline-flex items-center gap-2 border border-mx/30 bg-mx/10 rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mx live-dot" />
              <span className="text-mx text-[10px] font-condensed font-extrabold uppercase tracking-[0.24em]">Fase de grupos · En vivo</span>
            </span>
            <div className="flex items-start gap-2.5 md:gap-3">
              {STATS.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="scoreboard rounded-2xl border border-white/10 px-3 py-4 min-w-[72px] md:min-w-[96px]">
                    <span className="text-4xl md:text-6xl tabular-nums leading-none">{value}</span>
                  </div>
                  <span className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mb-9 fade-up-3">
            <p className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.3em]">El torneo arranca en</p>
            <div className="flex items-start gap-2.5 md:gap-3">
              {countdown.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="scoreboard rounded-2xl border border-white/10 px-3 py-4 min-w-[72px] md:min-w-[96px]">
                    <span className="text-4xl md:text-6xl tabular-nums leading-none">{String(value).padStart(2, '0')}</span>
                  </div>
                  <span className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3.5 mb-6 w-full sm:w-auto fade-up-4">
          <Link to="/register" className="btn-gold text-base sm:min-w-[230px]">Jugar gratis <Icon name="chevronRight" size={16} /></Link>
          <Link to="/login" className="btn-ghost text-base sm:min-w-[180px]">Iniciar sesión</Link>
        </div>

        <Link to="/rules"
          className="text-gray-500 hover:text-gold text-[11px] font-condensed font-extrabold tracking-[0.2em] uppercase transition-colors inline-flex items-center gap-1 fade-up-4">
          ¿Cómo funciona el juego?
          <Icon name="chevronRight" size={13} />
        </Link>
      </main>

      {/* Marquesina de banderas */}
      <div className="relative z-10 py-5 border-t border-white/8 overflow-hidden">
        <div className="marquee-track gap-9 items-center">
          {[...FLAGS, ...FLAGS].map((t, i) => (
            <Flag key={i} team={t} className="h-5 opacity-70 hover:opacity-100 transition flex-shrink-0" />
          ))}
        </div>
      </div>
    </div>
  )
}
