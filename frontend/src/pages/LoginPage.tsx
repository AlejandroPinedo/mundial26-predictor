import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      login(data.token, data.user)
      toast.success(`¡Bienvenido de vuelta, ${data.user.username}!`)
      navigate('/home')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[350px] h-[350px] bg-yellow-400/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Back Link */}
        <Link
          to="/"
          className="text-gray-500 hover:text-yellow-400 text-xs font-bold uppercase tracking-wider mb-6 inline-flex items-center gap-1.5 transition-colors"
          id="login-back-btn"
        >
          ← Volver al inicio
        </Link>

        {/* Login Box */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          
          <div className="mb-8">
            <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">
              Iniciar Sesión
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Ingresa tus credenciales para acceder a tus predicciones
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold pl-1">Email</label>
              <input
                className="bg-gray-950 border border-gray-850 text-white px-4 py-3 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
                type="email"
                placeholder="tu@correo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                id="login-email-input"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold pl-1">Contraseña</label>
              <input
                className="bg-gray-950 border border-gray-850 text-white px-4 py-3 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                id="login-password-input"
              />
            </div>

            {/* Submit Button */}
            <button
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black py-3.5 rounded-2xl text-sm transition-all duration-150 uppercase tracking-wider font-barlow cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-yellow-500/5"
              type="submit"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>

          <p className="text-gray-400 mt-6 text-center text-xs">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" className="text-yellow-400 hover:underline font-semibold" id="login-to-register-link">
              Regístrate aquí
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
