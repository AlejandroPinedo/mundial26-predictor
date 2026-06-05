import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import Navbar from '../components/Navbar'

type Group = {
  id: string
  name: string
  invite_code: string
  member_count: string
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadGroups() {
    const d = await apiFetch('/groups/my')
    setGroups(d.groups)
  }

  useEffect(() => { loadGroups() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const d = await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      })
      setMessage(`Grupo creado. Código de invitación: ${d.group.invite_code}`)
      setNewName('')
      loadGroups()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear grupo')
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiFetch('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: joinCode }),
      })
      setJoinCode('')
      loadGroups()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al unirse')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Mis Grupos</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <form onSubmit={handleCreate} className="bg-gray-900 rounded-xl p-5">
            <h2 className="font-bold mb-3">Crear grupo</h2>
            <input
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg mb-3 text-sm"
              placeholder="Nombre del grupo"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button type="submit"
              className="w-full bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg hover:bg-yellow-300 text-sm">
              Crear
            </button>
          </form>

          <form onSubmit={handleJoin} className="bg-gray-900 rounded-xl p-5">
            <h2 className="font-bold mb-3">Unirse con código</h2>
            <input
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg mb-3 text-sm uppercase tracking-widest"
              placeholder="Ej: ABC123"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button type="submit"
              className="w-full bg-gray-700 text-white font-bold py-2 rounded-lg hover:bg-gray-600 text-sm">
              Unirse
            </button>
          </form>
        </div>

        {message && (
          <div className="bg-green-900/40 border border-green-700 rounded-xl p-4 mb-6">
            <p className="text-green-400 text-sm">{message}</p>
          </div>
        )}
        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <div className="flex flex-col gap-3">
          {groups.length === 0 && (
            <p className="text-gray-600 text-center py-8">
              No perteneces a ningún grupo todavía.
            </p>
          )}
          {groups.map(group => (
            <button key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="bg-gray-900 rounded-xl p-4 text-left hover:bg-gray-800 transition">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{group.name}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {group.member_count} miembro{Number(group.member_count) !== 1 ? 's' : ''} · Código: <span className="text-yellow-400 font-mono">{group.invite_code}</span>
                  </p>
                </div>
                <span className="text-gray-600">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
