import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Skeleton from '../components/Skeleton'
import Flag from '../components/Flag'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

type Standing = {
  team: string
  played: string | number
  wins: string | number
  draws: string | number
  losses: string | number
  gf: string | number
  ga: string | number
  gd: string | number
  points: string | number
}

type Source = 'calc' | 'official'

function GroupTable({ group, source }: { group: string; source: Source }) {
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const req =
      source === 'official'
        ? apiFetch('/football/standings').then(
            d => (d.groups ?? []).find((x: { group: string }) => x.group === group)?.table ?? [],
          )
        : apiFetch(`/predictions/standings/${group}`).then(d => d.standings ?? [])
    req
      .then(setStandings)
      .catch(() => setStandings([]))
      .finally(() => setLoading(false))
  }, [group, source])

  if (loading) return <Skeleton rows={4} />

  if (standings.length === 0) {
    return (
      <div className="text-center py-10">
        <Icon name="clock" size={32} className="mx-auto text-gray-600 mb-3" />
        <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
          Sin partidos jugados aún
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="font-condensed text-gray-500 text-[10px] uppercase tracking-[0.14em] border-b border-white/8">
            <th className="text-left py-2.5 pl-3 font-extrabold">#</th>
            <th className="text-left py-2.5 font-extrabold">Equipo</th>
            <th className="py-2.5 text-center font-extrabold">PJ</th>
            <th className="py-2.5 text-center font-extrabold">G</th>
            <th className="py-2.5 text-center font-extrabold">E</th>
            <th className="py-2.5 text-center font-extrabold">P</th>
            <th className="py-2.5 text-center font-extrabold hidden sm:table-cell">GF</th>
            <th className="py-2.5 text-center font-extrabold hidden sm:table-cell">GC</th>
            <th className="py-2.5 text-center font-extrabold">DG</th>
            <th className="py-2.5 pr-2 text-center font-extrabold text-gold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team}
              className={`border-b border-white/5 last:border-0 ${
                i < 2 ? 'bg-mx/[0.04]' : i === 2 ? 'bg-us/[0.04]' : ''
              }`}>
              <td className={`py-2.5 pl-3 border-l-2 ${
                i < 2 ? 'border-mx' : i === 2 ? 'border-us' : 'border-transparent'
              }`}>
                <span className={`font-display text-sm ${
                  i < 2 ? 'text-mx' : i === 2 ? 'text-us' : 'text-gray-600'
                }`}>{i + 1}</span>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <Flag team={s.team} className="h-3 flex-shrink-0" />
                  <span className="font-condensed font-bold text-xs uppercase tracking-wide text-gray-100 truncate max-w-[80px] sm:max-w-none">{s.team}</span>
                </div>
              </td>
              <td className="py-2.5 text-center text-gray-400 text-xs">{s.played}</td>
              <td className="py-2.5 text-center text-mx text-xs font-semibold">{s.wins}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs">{s.draws}</td>
              <td className="py-2.5 text-center text-ca text-xs font-semibold">{s.losses}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs hidden sm:table-cell">{s.gf}</td>
              <td className="py-2.5 text-center text-gray-400 text-xs hidden sm:table-cell">{s.ga}</td>
              <td className="py-2.5 text-center text-gray-300 text-xs">
                {Number(s.gd) > 0 ? `+${s.gd}` : s.gd}
              </td>
              <td className="py-2.5 pr-2 text-center">
                <span className="font-display text-sm text-gold">{s.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 px-3 font-condensed font-bold text-[10px] uppercase tracking-wider text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-mx/50" />Clasifican directamente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-us/50" />Posible mejor 3°</span>
      </div>
    </div>
  )
}

export default function StandingsPage() {
  const [activeGroup, setActiveGroup] = useState('A')
  const [source, setSource] = useState<Source>('calc')

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">

        <PageHeader title="CLASIFICACIONES" subtitle="Tabla de posiciones por grupo · FIFA WC26" icon="🏅" live badge="Live" />

        {/* Fuente: calculada (resultados cargados) vs oficial (football-data) */}
        <div className="flex items-center gap-2 mb-4 fade-up-1">
          {([['calc', 'Calculada'], ['official', 'Oficial FIFA']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setSource(val)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-condensed font-extrabold uppercase tracking-wider transition flex-shrink-0 cursor-pointer ${
                source === val
                  ? 'bg-gold text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,195,0,0.5)]'
                  : 'bg-panel border border-white/8 text-gray-500 hover:text-white hover:border-white/20'
              }`}>
              {label}
            </button>
          ))}
          <span className="text-[10px] text-gray-600 font-condensed font-bold uppercase tracking-wider ml-1 hidden sm:inline">
            {source === 'official' ? 'football-data.org' : 'según resultados cargados'}
          </span>
        </div>

        {/* Selector de grupo */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide fade-up-1">
          {GROUPS.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-condensed font-extrabold uppercase tracking-wider transition flex-shrink-0 cursor-pointer ${
                activeGroup === g
                  ? 'bg-gold text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,195,0,0.5)]'
                  : 'bg-panel border border-white/8 text-gray-500 hover:text-white hover:border-white/20'
              }`}>
              Grupo {g}
            </button>
          ))}
        </div>

        {/* Tabla del grupo activo */}
        <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden fade-up-2">
          <div className="tri-stripe" />
          <div className="p-4 md:p-5">
            <header className="flex items-end justify-between gap-3 mb-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span className="font-display text-4xl leading-none text-gold uppercase">{activeGroup}</span>
                <div>
                  <p className="font-condensed font-extrabold uppercase tracking-[0.2em] text-[10px] text-gray-500 leading-none">Grupo</p>
                  <p className="font-condensed font-extrabold uppercase tracking-wider text-xs text-white mt-1">Fase de grupos</p>
                </div>
              </div>
              <span className="chip text-gray-400">WC26</span>
            </header>
            <GroupTable group={activeGroup} source={source} />
          </div>
        </div>
      </div>
    </div>
  )
}
