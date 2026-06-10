import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) })
      login(data.token, data.user)
      toast.success(`¡Bienvenido, ${data.user.username}!`)
      navigate('/home')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-stretch font-sans overflow-hidden">

      {/* Izquierda — panel visual tipo cancha de noche */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12 bg-ink-900 border-r border-white/5">
        <div className="tri-stripe absolute top-0 left-0 right-0 z-20" />

        {/* Texturas de cancha sobre tinta */}
        <div className="absolute inset-0 pitch-stripes" aria-hidden="true" />
        <div className="absolute inset-0 pitch-bg" aria-hidden="true" />
        {/* Línea media y círculo central */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gold/40" aria-hidden="true" />
        {/* Reflector dorado */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[520px] h-[380px] bg-gold/10 rounded-full blur-[120px]" aria-hidden="true" />
        <span className="wm-26 -right-10 bottom-20" aria-hidden="true">26</span>

        {/* Marca */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]">
            <span className="font-display text-ink-950 text-sm leading-none">26</span>
          </div>
          <span className="font-display text-base text-white tracking-widest uppercase">Mundial26</span>
        </div>

        {/* Titular */}
        <div className="relative z-10">
          <p className="font-display text-6xl text-white leading-[0.95] mb-5 uppercase">
            El Torneo<br />
            <span className="text-gold">Ya Está</span><br />
            En Curso
          </p>
          <div className="tri-stripe w-24 rounded-full mb-4" />
          <p className="text-gray-400 text-xs font-condensed font-extrabold uppercase tracking-[0.22em]">
            USA · Canadá · México 2026
          </p>
        </div>

        {/* Cifras del torneo */}
        <div className="relative z-10 flex gap-9 text-center">
          {[
            { n: '48', l: 'Equipos' },
            { n: '104', l: 'Partidos' },
            { n: '3', l: 'Sedes' },
          ].map(({ n, l }) => (
            <div key={l}>
              <p className="font-display text-3xl text-gold leading-none">{n}</p>
              <p className="text-gray-500 text-[10px] font-condensed font-extrabold uppercase tracking-[0.2em] mt-1.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Derecha — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative bg-ink-950">
        <span className="wm-26 -top-8 -right-6 lg:hidden" aria-hidden="true">26</span>

        <div className="w-full max-w-sm relative fade-up">

          <Link to="/"
            className="text-gray-600 hover:text-gold text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em] mb-8 inline-flex items-center gap-1 transition-colors">
            <Icon name="chevronLeft" size={13} />
            Inicio
          </Link>

          {/* Encabezado tipo pase de acceso */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 border border-gold/25 bg-gold/5 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold live-dot" />
              <span className="text-gold text-[10px] font-condensed font-extrabold uppercase tracking-[0.18em]">Acceso al torneo</span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl text-white leading-none uppercase">Entrar</h1>
            <div className="tri-stripe w-20 rounded-full my-3" />
            <p className="text-gray-500 text-sm">Continúa con tu cuenta</p>
          </div>

          {/* OAuth */}
          <div className="space-y-2.5 mb-6">
            <a href={`${API}/auth/google`}
              className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow-sm w-full">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </a>
            <a href={`${API}/auth/github`}
              className="flex items-center justify-center gap-3 bg-[#161b22] hover:bg-[#1c2128] text-white font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer border border-white/10 w-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continuar con GitHub
            </a>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="pitch-divider flex-1" />
            <span className="text-gray-600 text-[10px] font-condensed font-extrabold uppercase tracking-[0.22em]">o</span>
            <div className="pitch-divider flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-condensed font-extrabold block mb-1.5">Email</label>
              <input
                className="w-full bg-white/[0.04] border border-white/10 focus:border-gold/40 text-white px-4 py-3.5 rounded-xl text-sm outline-none transition-all placeholder-gray-600"
                type="email" placeholder="tu@correo.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-condensed font-extrabold block mb-1.5">Contraseña</label>
              <input
                className="w-full bg-white/[0.04] border border-white/10 focus:border-gold/40 text-white px-4 py-3.5 rounded-xl text-sm outline-none transition-all placeholder-gray-600"
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full text-base">
              {loading ? 'ENTRANDO...' : 'ENTRAR AL TORNEO'}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-6">
            ¿Sin cuenta?{' '}
            <Link to="/register" className="text-gold hover:text-gold/80 font-semibold transition-colors">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
