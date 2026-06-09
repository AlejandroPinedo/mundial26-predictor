import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'
import PageHeader from '../components/PageHeader'

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
      <div className="min-h-screen bg-[#020817] text-white flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans">
        
        <PageHeader title="EQUIPOS" subtitle="48 selecciones · Copa Mundial FIFA 2026" icon="🌍" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div />

          {/* View Switcher Tabs */}
          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-2xl self-start sm:self-auto select-none">
            <button
              onClick={() => setView('groups')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                view === 'groups'
                  ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                  : 'text-gray-450 hover:text-white'
              }`}
            >
              Fase de Grupos
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                view === 'all'
                  ? 'bg-yellow-400 text-gray-950 shadow-md shadow-yellow-500/10'
                  : 'text-gray-450 hover:text-white'
              }`}
            >
              Todos los Equipos
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-8">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm no-invert">🔍</span>
          <input
            placeholder="Buscar por nombre de país..."
            className="w-full bg-gray-900/50 border border-gray-800/85 text-white pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none focus:border-yellow-400/50 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(team => <TeamCard key={team} team={team} />)}
          </div>
        ) : view === 'groups' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(teamsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => (
              <div key={group} className="bg-gray-900/30 border border-gray-800 rounded-3xl p-5 shadow-lg">
                <h2 className="font-barlow font-black text-lg text-yellow-400 mb-4 uppercase tracking-wider border-b border-gray-800/80 pb-2 flex items-center justify-between">
                  <span>Grupo {group}</span>
                  <span className="text-[10px] bg-yellow-450/10 text-yellow-400 px-2 py-0.5 rounded font-sans font-bold">FIFA 2026</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {teams.map(team => (
                    <div key={team} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-900/60 border border-transparent hover:border-gray-800/40 transition duration-150">
                      <span className="text-3xl leading-none no-invert flex-shrink-0">{getFlag(team)}</span>
                      <span className="font-bold text-sm text-gray-200 uppercase tracking-wide font-sans">{team}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allTeams.map(team => <TeamCard key={team} team={team} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: string }) {
  return (
    <div className="ticket-card rounded-2xl p-5 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-300 shadow-lg relative group overflow-hidden">
      <span className="text-5xl leading-none no-invert select-none group-hover:scale-105 transition-transform duration-300">{getFlag(team)}</span>
      <span className="font-display text-sm text-center text-white uppercase tracking-wider truncate w-full">{team}</span>
    </div>
  )
}
