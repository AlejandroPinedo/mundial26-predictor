import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

type Match = {
  home_team: string
  away_team: string
  group_name: string
}

export default function TeamsPage() {
  const [teamsByGroup, setTeamsByGroup] = useState<Record<string, string[]>>({})
  const [allTeams, setAllTeams] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'groups' | 'all'>('groups')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/predictions/matches')
      .then((data: { matches: Match[] }) => {
        const groups: Record<string, Set<string>> = {}
        const uniqueTeams = new Set<string>()

        for (const match of data.matches) {
          if (!groups[match.group_name]) {
            groups[match.group_name] = new Set()
          }
          groups[match.group_name].add(match.home_team)
          groups[match.group_name].add(match.away_team)
          uniqueTeams.add(match.home_team)
          uniqueTeams.add(match.away_team)
        }

        const formattedGroups: Record<string, string[]> = {}
        for (const [group, teamsSet] of Object.entries(groups)) {
          formattedGroups[group] = Array.from(teamsSet).sort()
        }

        setTeamsByGroup(formattedGroups)
        setAllTeams(Array.from(uniqueTeams).sort())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? allTeams.filter(t => t.toLowerCase().includes(search.toLowerCase()))
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 text-white flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 font-sans">

        <PageHeader title="EQUIPOS" subtitle="48 selecciones · Copa Mundial FIFA 2026" icon="🌍" />

        {/* Búsqueda + selector de vista */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 fade-up-1">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              placeholder="Buscar por nombre de país..."
              className="w-full bg-panel border border-white/8 text-white pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-gold/40 transition-colors placeholder:text-gray-600"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex glass p-1 rounded-2xl self-start sm:self-auto select-none">
            <button
              onClick={() => setView('groups')}
              className={`px-4 py-2 rounded-xl text-[11px] font-condensed font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                view === 'groups'
                  ? 'bg-gold text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,195,0,0.5)]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Fase de Grupos
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-xl text-[11px] font-condensed font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                view === 'all'
                  ? 'bg-gold text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,195,0,0.5)]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Todos los Equipos
            </button>
          </div>
        </div>

        {filtered ? (
          filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 fade-up-2">
              {filtered.map(team => <TeamCard key={team} team={team} />)}
            </div>
          ) : (
            <div className="bg-panel border border-white/8 rounded-2xl py-14 text-center fade-up-2">
              <Icon name="search" size={36} className="mx-auto text-gray-600 mb-3" />
              <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-400">Sin resultados</p>
              <p className="text-xs text-gray-600 mt-1">Prueba con otro nombre de país.</p>
            </div>
          )
        ) : view === 'groups' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 fade-up-2">
            {Object.entries(teamsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => (
              <section key={group} className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden">
                <div className="tri-stripe" />
                <div className="p-5">
                  <header className="flex items-end justify-between gap-3 mb-4 pb-3 border-b border-white/8">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-4xl leading-none text-gold uppercase">{group}</span>
                      <div>
                        <p className="font-condensed font-extrabold uppercase tracking-[0.2em] text-[10px] text-gray-500 leading-none">Grupo</p>
                        <p className="font-condensed font-extrabold uppercase tracking-wider text-xs text-white mt-1">{teams.length} selecciones</p>
                      </div>
                    </div>
                    <span className="chip text-gray-400">FIFA 2026</span>
                  </header>
                  <div className="flex flex-col gap-1">
                    {teams.map(team => (
                      <div key={team} className="flex items-center gap-3 px-2.5 py-2 rounded-xl border border-transparent hover:bg-white/[0.04] hover:border-white/8 transition duration-150">
                        <span className="text-3xl leading-none no-invert flex-shrink-0">{getFlag(team)}</span>
                        <span className="font-condensed font-bold text-sm text-gray-200 uppercase tracking-wide">{team}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 fade-up-2">
            {allTeams.map(team => <TeamCard key={team} team={team} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: string }) {
  return (
    <div className="bg-panel border border-white/8 rounded-2xl p-5 flex flex-col items-center gap-3 hover-lift group overflow-hidden">
      <span className="text-5xl leading-none no-invert select-none group-hover:scale-110 transition-transform duration-300">{getFlag(team)}</span>
      <span className="font-condensed font-extrabold text-xs text-center text-gray-200 uppercase tracking-wider truncate w-full">{team}</span>
    </div>
  )
}
