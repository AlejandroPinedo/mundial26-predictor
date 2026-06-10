import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error('Completa todos los campos')
      return
    }
    if (form.password.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      toast.success('¡Cuenta creada! Inicia sesión.')
      navigate('/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-stretch font-sans overflow-hidden">

      {/* Left — Stadium visual */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12">
        {/* Pitch base */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, #021a08 0%, #031208 50%, #020d05 100%)' }} />
        {/* Alternating stripe pattern */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, rgba(34,197,94,0.07) 0, rgba(34,197,94,0.07) 60px, rgba(34,197,94,0.04) 60px, rgba(34,197,94,0.04) 120px)`,
          }} />
        {/* Grid lines */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, rgba(34,197,94,0.18) 0, rgba(34,197,94,0.18) 1px, transparent 1px, transparent 60px),
              repeating-linear-gradient(0deg, rgba(34,197,94,0.18) 0, rgba(34,197,94,0.18) 1px, transparent 1px, transparent 60px)`,
          }} />
        {/* Midfield line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px]" style={{ background: 'rgba(34,197,94,0.35)' }} />
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full"
          style={{ border: '2px solid rgba(34,197,94,0.3)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
          style={{ border: '2px solid rgba(34,197,94,0.4)' }} />
        {/* Penalty boxes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[90px]"
          style={{ border: '2px solid rgba(34,197,94,0.3)', borderTop: 'none' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[180px] h-[90px]"
          style={{ border: '2px solid rgba(34,197,94,0.3)', borderBottom: 'none' }} />
        {/* Floodlight — green */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.15) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl no-invert">⚽</span>
            <span className="font-display text-xl text-yellow-400 tracking-widest uppercase">Mundial26</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-display text-6xl text-white leading-none mb-4 uppercase">
            Unirse a<br />
            <span className="text-green-400">La Porra</span><br />
            Global
          </p>
          <p className="text-green-400/70 text-sm font-medium">
            USA · Canadá · México 2026
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {['Predice todos los partidos', 'Crea grupos con amigos', 'Completa tu bracket de playoffs'].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right — Register form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle noise */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

        <div className="w-full max-w-sm relative fade-up">

          <Link to="/" className="text-gray-600 hover:text-yellow-400 text-xs font-bold uppercase tracking-widest mb-8 inline-flex items-center gap-1.5 transition-colors">
            ← Inicio
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 border border-green-500/20 bg-green-500/5 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">Registro gratuito</span>
            </div>
            <h1 className="font-display text-6xl text-white leading-none mb-2 uppercase">UNIRSE</h1>
            <p className="text-gray-500 text-sm">Únete antes de que empiece el próximo partido</p>
          </div>

          {/* OAuth */}
          <div className="space-y-2.5 mb-6">
            <a href={`${API}/auth/google`}
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3.5 rounded-2xl text-sm transition-all cursor-pointer shadow-sm w-full">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Registrarse con Google
            </a>
            <a href={`${API}/auth/github`}
              className="flex items-center justify-center gap-3 bg-[#161b22] hover:bg-[#1c2128] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all cursor-pointer border border-white/10 w-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Registrarse con GitHub
            </a>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="pitch-divider flex-1" />
            <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">o</span>
            <div className="pitch-divider flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Email</label>
              <input
                className="w-full bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-3.5 rounded-2xl text-sm outline-none transition-all placeholder-gray-700"
                type="email" placeholder="tu@correo.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Usuario</label>
              <input
                className="w-full bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-3.5 rounded-2xl text-sm outline-none transition-all placeholder-gray-700"
                placeholder="tu_usuario"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Contraseña</label>
              <input
                className="w-full bg-white/[0.04] border border-white/10 focus:border-yellow-400/40 text-white px-4 py-3.5 rounded-2xl text-sm outline-none transition-all placeholder-gray-700"
                type="password" placeholder="Mínimo 6 caracteres"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 text-white font-display text-2xl py-3.5 rounded-2xl transition-all disabled:opacity-50 tracking-widest uppercase">
              {loading ? 'CREANDO...' : 'UNIRSE GRATIS'}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
