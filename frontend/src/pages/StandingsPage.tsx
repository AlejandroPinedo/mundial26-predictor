import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Skeleton from '../components/Skeleton'
import { getFlag } from '../utils/flags'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

type Standing = {
  team: string
  played: string
  wins: string
  draws: string
  losses: string
  gf: string
  ga: string
  gd: string
  points: string
}

function GroupTable({ group }: { group: string }) {
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/predictions/standings/${group}`)
      .then(d => setStandings(d.standings))
      .finally(() => setLoading(false))
  }, [group])

  if (loading) return <Skeleton rows={4} />

  if (standings.length === 0) {
    return (
      <div className="text-center py-6 text-gray-600 text-sm">
        Sin partidos jugados aún
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-600 text-[10px] uppercase tracking-wider border-b border-gray-800">
            <th className="text-left py-2 pl-2">#</th>
            <th className="text-left py-2">Equipo</th>
            <th className="py-2 text-center">PJ</th>
            <th className="py-2 text-center">G</th>
            <th className="py-2 text-center">E</th>
            <th className="py-2 text-center">P</th>
            <th className="py-2 text-center hidden sm:table-cell">GF</th>
            <th className="py-2 text-center hidden sm:table-cell">GC</th>
            <th className="py-2 text-center">DG</th>
            <th className="py-2 text-center font-black text-yellow-400">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team}
              className={`border-b border-gray-800/50 last:border-0 ${
                i < 2 ? 'bg-green-500/5' : i === 2 ? 'bg-blue-500/5' : ''
              }`}>
              <td className="py-2.5 pl-2 text-gray-600 font-bold text-xs">{i + 1}</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{getFlag(s.team)}</span>
                  <span className="font-bold text-xs truncate max-w-[80px] sm:max-w-none">{s.team}</span>
                </div>
              </td>
              <td className="py-2.5 text-center text-gray-400 text-xs">{s.played}</td>
              <td className="py-2.5 text-center text-green-400 text-xs">{s.wins}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs">{s.draws}</td>
              <td className="py-2.5 text-center text-red-400 text-xs">{s.losses}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs hidden sm:table-cell">{s.gf}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs hidden sm:table-cell">{s.ga}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs">
                {Number(s.gd) > 0 ? `+${s.gd}` : s.gd}
              </td>
              <td className="py-2.5 text-center">
                <span className="font-black text-yellow-400">{s.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-2 px-2 text-[10px] text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/30" />Clasifican directamente</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/30" />Posible mejor 3°</span>
      </div>
    </div>
  )
}

export default function StandingsPage() {
  const [activeGroup, setActiveGroup] = useState('A')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-barlow font-black uppercase tracking-wide text-yellow-400">
            Clasificaciones 📊
          </h1>
          <p className="text-gray-500 text-sm mt-1">Tabla de posiciones por grupo. Se actualiza con cada resultado.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {GROUPS.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition flex-shrink-0 ${
                activeGroup === g ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>
              Grupo {g}
            </button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <h2 className="font-barlow font-black uppercase tracking-wider text-sm text-yellow-400 mb-4">
            Grupo {activeGroup}
          </h2>
          <GroupTable group={activeGroup} />
        </div>
      </div>
    </div>
  )
}
