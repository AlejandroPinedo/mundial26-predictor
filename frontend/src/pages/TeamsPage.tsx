import { useState } from 'react'
import { getFlag } from '../utils/flags'

const TEAMS_BY_GROUP: Record<string, string[]> = {
  'A': ['Estados Unidos', 'Panamá', 'Uruguay', 'Bolivia'],
  'B': ['Argentina', 'Perú', 'Chile', 'Venezuela'],
  'C': ['México', 'Ecuador', 'Colombia', 'Honduras'],
  'D': ['Brasil', 'Japón', 'Paraguay', 'Nigeria'],
  'E': ['Francia', 'Marruecos', 'Senegal', 'Australia'],
  'F': ['España', 'Países Bajos', 'Corea del Sur', 'Jamaica'],
  'G': ['Alemania', 'Portugal', 'Arabia Saudí', 'Costa Rica'],
  'H': ['Inglaterra', 'Argelia', 'Suiza', 'Kenia'],
}

const ALL_TEAMS = Object.values(TEAMS_BY_GROUP).flat()

export default function TeamsPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'groups' | 'all'>('groups')

  const filtered = search
    ? ALL_TEAMS.filter(t => t.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">Equipos 🌍</h1>
            <p className="text-gray-500 text-sm">48 selecciones del Mundial 2026</p>
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
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(TEAMS_BY_GROUP).map(([group, teams]) => (
              <div key={group} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h2 className="font-black text-yellow-400 text-sm mb-3 uppercase tracking-wider">Grupo {group}</h2>
                <div className="flex flex-col gap-2">
                  {teams.map(team => (
                    <div key={team} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition">
                      <span className="text-2xl">{getFlag(team)}</span>
                      <span className="font-medium text-sm">{team}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ALL_TEAMS.sort().map(team => <TeamCard key={team} team={team} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition">
      <span className="text-4xl">{getFlag(team)}</span>
      <span className="text-xs font-bold text-center leading-tight">{team}</span>
    </div>
  )
}
