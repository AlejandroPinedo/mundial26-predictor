import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()                                                                                    
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),                                                                                 
      })
      login(data.token, data.user)
      navigate('/matches')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Iniciar sesión</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
            type="email" placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
            type="password" placeholder="Password"
            value={form.password}                                                                                   
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button
            className="bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg hover:bg-yellow-300"
            type="submit"
          >
            Entrar
          </button>                                                                                                 
        </form>
        <p className="text-gray-400 mt-4 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-yellow-400 hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
