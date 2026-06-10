import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

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
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 font-sans">

      <PageHeader title="MIS GRUPOS" subtitle="Ligas privadas · Compite con tus amigos" icon="👥" />

      {/* Create/Join Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">

        {/* Create Group Card */}
        <form onSubmit={handleCreate} className="ticket-card p-6 fade-up-1">
          <div className="pl-1.5">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="plus" size={16} className="text-gold" strokeWidth={2.6} />
              <h2 className="font-display text-lg md:text-xl text-white uppercase tracking-wide leading-none">
                Crear Nuevo Grupo
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Serás el administrador y podrás invitar a otros.</p>

            <input
              className="w-full bg-ink-950 border border-white/10 focus:border-gold/50 text-white px-4 py-3 rounded-xl mb-4 text-sm outline-none transition-all placeholder-gray-600"
              placeholder="Nombre de tu grupo (ej: Oficina, Amigos, Familia)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="btn-gold w-full text-xs"
            >
              <Icon name="trophy" size={14} />
              {loading ? 'Procesando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>

        {/* Join Group Card */}
        <form onSubmit={handleJoin} className="ticket-card p-6 fade-up-2">
          <div className="pl-1.5">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="users" size={16} className="text-gold" strokeWidth={2.4} />
              <h2 className="font-display text-lg md:text-xl text-white uppercase tracking-wide leading-none">
                Unirse a un Grupo
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Introduce el código de 6 letras que te compartieron.</p>

            <input
              className="w-full bg-ink-950 border border-white/10 focus:border-gold/50 text-gold font-condensed font-extrabold px-4 py-3 rounded-xl mb-4 text-base uppercase tracking-[0.35em] text-center outline-none transition-all placeholder-gray-600 placeholder:text-xs placeholder:tracking-[0.18em]"
              placeholder="CÓDIGO DE 6 LETRAS"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />

            <button
              type="submit"
              disabled={loading || joinCode.length < 6}
              className="btn-gold w-full text-xs"
            >
              <Icon name="check" size={14} strokeWidth={2.6} />
              {loading ? 'Procesando...' : 'Unirse al Grupo'}
            </button>
          </div>
        </form>

      </div>

      {/* Groups List Section */}
      <div className="fade-up-3">
        <h2 className="flex items-center gap-2 text-sm font-condensed font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-4">
          <Icon name="users" size={15} className="text-mx" />
          Mis Grupos Activos
        </h2>

        <div className="flex flex-col gap-3">
          {groups.length === 0 ? (
            <div className="text-center py-16 bg-panel border border-white/8 rounded-2xl">
              <Icon name="users" size={44} className="mx-auto text-gray-600 mb-4" />
              <p className="text-white font-condensed font-extrabold uppercase tracking-wide text-base">Aún no estás en ningún grupo</p>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                Crea tu propia liga o únete a una existente con el código de invitación para competir.
              </p>
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="ticket-card hover-lift w-full p-5 text-left flex justify-between items-center group cursor-pointer"
              >
                <div className="flex flex-col gap-2 min-w-0 flex-1 pl-1.5">
                  <p className="font-display text-base md:text-lg text-white uppercase group-hover:text-gold transition-colors duration-150 truncate leading-none">
                    {group.name}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                    <span className="chip text-gray-300">
                      <Icon name="users" size={11} />
                      {group.member_count} miembro{Number(group.member_count) !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-condensed font-extrabold uppercase tracking-[0.15em] text-gray-500">Código</span>
                      <span className="scoreboard px-2.5 py-1 rounded-lg text-xs tracking-[0.25em]">
                        {group.invite_code}
                      </span>
                      <span
                        onClick={(e) => copyCode(group.invite_code, e)}
                        role="button"
                        className="inline-flex items-center gap-1 text-[10px] font-condensed font-extrabold uppercase tracking-wider text-gray-400 hover:text-gold cursor-pointer transition-colors"
                        title="Copiar código"
                      >
                        <Icon name="copy" size={11} />
                        Copiar
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-gray-600 group-hover:text-gold group-hover:translate-x-1 transition-all pl-4 flex-shrink-0">
                  <Icon name="chevronRight" size={20} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
