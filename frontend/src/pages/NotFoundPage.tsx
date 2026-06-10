export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center font-sans">
      <div className="text-center px-6">
        <div className="font-display text-[180px] text-white/5 leading-none select-none">404</div>
        <div className="font-display text-6xl text-yellow-400 -mt-12 relative z-10 uppercase">Fuera de Juego</div>
        <p className="text-gray-500 mt-3 mb-8 text-sm">El árbitro ha pitado. Esta página no existe.</p>
        <a href="/home" className="bg-yellow-400 text-gray-950 font-display text-xl px-8 py-3 rounded-xl hover:bg-yellow-300 transition tracking-widest inline-block uppercase">
          Volver al Estadio
        </a>
      </div>
    </div>
  )
}
