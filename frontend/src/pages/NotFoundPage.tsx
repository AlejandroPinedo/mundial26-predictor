export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-ink-950 flex flex-col font-sans relative overflow-hidden">
      <div className="tri-stripe" />
      <span className="wm-26 -top-8 -left-12 hidden md:block" aria-hidden="true">26</span>
      <span className="wm-26 -bottom-16 -right-10 hidden md:block" aria-hidden="true">26</span>
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 w-[520px] h-[400px] bg-ca/5 rounded-full blur-[130px] pointer-events-none" aria-hidden="true" />

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="text-center px-6 fade-up">
          <p className="text-ca text-[11px] font-condensed font-extrabold uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ca live-dot" />
            Tarjeta roja
          </p>
          <div className="font-display text-[clamp(8rem,26vw,15rem)] leading-[0.85] text-white/5 select-none" aria-hidden="true">404</div>
          <h1 className="font-display text-4xl md:text-6xl text-gold -mt-10 md:-mt-14 relative z-10 uppercase">Fuera de Juego</h1>
          <div className="tri-stripe w-24 rounded-full mx-auto my-5" />
          <p className="text-gray-500 mb-8 text-sm">El árbitro ha pitado. Esta página no existe.</p>
          <a href="/home" className="btn-gold text-base min-w-[220px]">
            Volver al Estadio
          </a>
        </div>
      </div>
    </div>
  )
}
