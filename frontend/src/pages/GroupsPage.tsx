import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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
  const [loading, setLoading] = useState(false)

  async function loadGroups() {
    const d = await apiFetch('/groups/my')
    setGroups(d.groups)
  }

  useEffect(() => { loadGroups() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { toast.error('Ingresa un nombre para el grupo'); return }
    setLoading(true)
    try {
      const d = await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      })
      toast.success(`Grupo creado. Código: ${d.group.invite_code}`)
      setNewName('')
      loadGroups()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear grupo')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim()) { toast.error('Ingresa un código de invitación'); return }
    setLoading(true)
    try {
      await apiFetch('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: joinCode }),
      })
      toast.success('Te uniste al grupo')
      setJoinCode('')
      loadGroups()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al unirse')
    } finally {
      setLoading(false)
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
            <button type="submit" disabled={loading}
              className="w-full bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg hover:bg-yellow-300 text-sm disabled:opacity-50">
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
            <button type="submit" disabled={loading}
              className="w-full bg-gray-700 text-white font-bold py-2 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50">
              Unirse
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-gray-400 font-bold mb-1">Sin grupos todavía</p>
              <p className="text-gray-600 text-sm">Crea uno o únete con un código de invitación</p>
            </div>
          ) : groups.map(group => (
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
