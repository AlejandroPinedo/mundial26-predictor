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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  )
}
