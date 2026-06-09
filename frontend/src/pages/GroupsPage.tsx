import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'

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

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    toast.success(`Código ${code} copiado`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-barlow font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
            Mis Grupos Privados 👥
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Crea mini-ligas privadas y compite de forma directa con tus amigos.
          </p>
        </div>

        {/* Create/Join Bento Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          
          {/* Create Group Card */}
          <form onSubmit={handleCreate} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group premium-glow">
            <h2 className="font-barlow font-black uppercase tracking-wider text-lg text-yellow-400 mb-1">
              Crear Nuevo Grupo
            </h2>
            <p className="text-xs text-gray-500 mb-4">Serás el administrador y podrás invitar a otros.</p>
            
            <input
              className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/55 text-white px-4 py-3 rounded-xl mb-4 text-sm outline-none transition-all placeholder-gray-600"
              placeholder="Nombre de tu grupo (ej: Oficina, Amigos, Familia)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="w-full bg-yellow-400 text-gray-950 font-bold py-2.5 rounded-xl hover:bg-yellow-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
            >
              {loading ? 'Procesando...' : 'Crear Grupo 🏆'}
            </button>
          </form>

          {/* Join Group Card */}
          <form onSubmit={handleJoin} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group premium-glow">
            <h2 className="font-barlow font-black uppercase tracking-wider text-lg text-yellow-400 mb-1">
              Unirse a un Grupo
            </h2>
            <p className="text-xs text-gray-500 mb-4">Introduce el código de 6 letras que te compartieron.</p>
            
            <input
              className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/55 text-white px-4 py-3 rounded-xl mb-4 text-sm font-bold uppercase tracking-widest text-center outline-none transition-all placeholder-gray-600"
              placeholder="CÓDIGO DE 6 LETRAS"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            
            <button
              type="submit"
              disabled={loading || joinCode.length < 6}
              className="w-full bg-gray-800 text-white font-bold py-2.5 rounded-xl hover:bg-gray-700 hover:border-gray-650 transition-all text-sm border border-gray-750 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
            >
              {loading ? 'Procesando...' : 'Unirse al Grupo 🤜🤛'}
            </button>
          </form>

        </div>

        {/* Groups List Section */}
        <div>
          <h2 className="font-barlow font-black uppercase tracking-wider text-lg text-gray-400 mb-4">
            Mis Grupos Activos
          </h2>

          <div className="flex flex-col gap-3">
            {groups.length === 0 ? (
              <div className="text-center py-16 bg-gray-900/30 border border-gray-800 rounded-3xl">
                <p className="text-5xl mb-4 no-invert">👥</p>
                <p className="text-white font-bold text-lg">Aún no estás en ningún grupo</p>
                <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                  Crea tu propia liga o únete a una existente con el código de invitación para competir.
                </p>
              </div>
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="bg-gray-900/40 hover:bg-gray-900/80 border border-gray-850 hover:border-gray-700 rounded-2xl p-5 text-left transition-all duration-200 shadow-lg flex justify-between items-center group premium-glow cursor-pointer"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <p className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors duration-150 truncate">
                      {group.name}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        👥 {group.member_count} miembro{Number(group.member_count) !== 1 ? 's' : ''}
                      </span>
                      <span className="w-px h-3 bg-gray-800" />
                      <div className="flex items-center gap-1.5">
                        <span>Código:</span>
                        <span className="font-mono font-bold text-yellow-400 bg-yellow-400/5 border border-yellow-400/10 px-2 py-0.5 rounded">
                          {group.invite_code}
                        </span>
                        <span
                          onClick={(e) => copyCode(group.invite_code, e)}
                          className="hover:text-white text-[10px] underline ml-1 cursor-pointer font-bold"
                          title="Copiar código"
                        >
                          Copiar 📋
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <span className="text-gray-650 group-hover:text-yellow-400 group-hover:translate-x-1.5 transition-all text-xl font-bold pl-4">
                    →
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
