import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Spinner from '../components/Spinner'
import { getFlag } from '../utils/flags'

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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">Equipos 🌍</h1>
            <p className="text-gray-400 text-sm">{allTeams.length} selecciones del Mundial 2026</p>
          </div>
          <div className="sm:ml-auto flex gap-2">
            <button onClick={() => setView('groups')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${view === 'groups' ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Por grupos
            </button>
            <button onClick={() => setView('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${view === 'all' ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Todos
            </button>
          </div>
        </div>

        <input
          placeholder="Buscar equipo..."
          className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-2xl text-sm mb-6 outline-none focus:border-yellow-400/50 transition"
          value={search} onChange={e => setSearch(e.target.value)} />

        {filtered ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(team => <TeamCard key={team} team={team} />)}
          </div>
        ) : view === 'groups' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(teamsByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([group, teams]) => (
              <div key={group} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h2 className="font-black text-yellow-400 text-sm mb-3 uppercase tracking-wider">Grupo {group}</h2>
                <div className="flex flex-col gap-2">
                  {teams.map(team => (
                    <div key={team} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition">
                      <span className="text-2xl no-invert">{getFlag(team)}</span>
                      <span className="font-medium text-sm">{team}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {allTeams.map(team => <TeamCard key={team} team={team} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition">
      <span className="text-4xl no-invert">{getFlag(team)}</span>
      <span className="text-xs font-bold text-center leading-tight">{team}</span>
    </div>
  )
}
