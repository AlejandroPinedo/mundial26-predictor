import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function OAuthCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userStr = params.get('user')
    const error = params.get('error')

    if (error) {
      toast.error(error === 'cancelled' ? 'Login cancelado' : 'Error al iniciar sesión')
      navigate('/login')
      return
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        login(token, user)
        toast.success(`Bienvenido, ${user.username}!`)
        navigate('/home')
      } catch {
        toast.error('Error al procesar el login')
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  }, [])

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center font-sans relative overflow-hidden">
      <div className="tri-stripe absolute top-0 left-0 right-0" />
      <span className="wm-26 -bottom-12 -right-8" aria-hidden="true">26</span>
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[480px] h-[480px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 glass rounded-2xl px-12 py-10 text-center fade-up">
        <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center mx-auto mb-6 shadow-[0_4px_16px_-4px_rgba(255,195,0,0.5)]">
          <span className="font-display text-ink-950 text-sm leading-none">26</span>
        </div>
        <div className="w-10 h-10 border-[3px] border-white/10 border-t-gold rounded-full animate-spin mx-auto mb-5" />
        <p className="text-white text-[10px] font-condensed font-extrabold uppercase tracking-[0.25em] mb-1.5">Acceso al torneo</p>
        <p className="text-gray-400 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
