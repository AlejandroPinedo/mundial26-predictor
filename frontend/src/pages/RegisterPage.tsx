import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.username.trim() || !form.password.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      toast.success('¡Cuenta creada con éxito! Inicia sesión.')
      navigate('/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse')
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
          id="register-back-btn"
        >
          ← Volver al inicio
        </Link>

        {/* Register Box */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          
          <div className="mb-8">
            <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">
              Crear Cuenta
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Únete gratis y empieza a pronosticar los partidos
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
                id="register-email-input"
              />
            </div>

            {/* Username Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold pl-1">Nombre de usuario</label>
              <input
                className="bg-gray-950 border border-gray-850 text-white px-4 py-3 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
                type="text"
                placeholder="tu_usuario"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                id="register-username-input"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold pl-1">Contraseña</label>
              <input
                className="bg-gray-950 border border-gray-850 text-white px-4 py-3 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                id="register-password-input"
              />
            </div>

            {/* Submit Button */}
            <button
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black py-3.5 rounded-2xl text-sm transition-all duration-150 uppercase tracking-wider font-barlow cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-yellow-500/5"
              type="submit"
              disabled={loading}
              id="register-submit-btn"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>

          </form>

          <p className="text-gray-400 mt-6 text-center text-xs">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-yellow-400 hover:underline font-semibold" id="register-to-login-link">
              Inicia sesión aquí
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
