import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import Skeleton from '../components/Skeleton'
import Flag from '../components/Flag'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

type Scorer = {
  player: string
  team: string
  tla: string
  goals: number
  assists: number | null
  penalties: number | null
}

export default function ScorersPage() {
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch('/football/scorers')
      .then(d => setScorers(d.scorers || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        <PageHeader title="GOLEADORES" subtitle="Botín de Oro · datos oficiales FIFA WC26" icon="👟" />

        <div className="relative bg-panel border border-white/8 rounded-2xl overflow-hidden fade-up-1">
          <div className="tri-stripe" />
          <div className="p-4 md:p-5">
            {loading ? (
              <Skeleton rows={6} />
            ) : error || scorers.length === 0 ? (
              <div className="text-center py-10">
                <Icon name="ball" size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="font-condensed font-extrabold uppercase tracking-wider text-sm text-gray-500">
                  {error ? 'No se pudieron cargar los goleadores' : 'Aún no hay goles registrados'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-condensed text-gray-500 text-[10px] uppercase tracking-[0.14em] border-b border-white/8">
                      <th className="text-left py-2.5 pl-3 font-extrabold">#</th>
                      <th className="text-left py-2.5 font-extrabold">Jugador</th>
                      <th className="text-left py-2.5 font-extrabold hidden sm:table-cell">Selección</th>
                      <th className="py-2.5 pr-3 text-center font-extrabold text-gold">Goles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorers.map((s, i) => (
                      <tr key={`${s.player}-${i}`} className="border-b border-white/5 last:border-0">
                        <td className={`py-2.5 pl-3 border-l-2 ${i === 0 ? 'border-gold' : 'border-transparent'}`}>
                          <span className={`font-display text-sm ${i === 0 ? 'text-gold' : 'text-gray-600'}`}>{i + 1}</span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Flag team={s.team} className="h-3 flex-shrink-0 sm:hidden" />
                            <span className="font-condensed font-bold text-xs sm:text-sm text-gray-100 truncate max-w-[140px] sm:max-w-none">
                              {s.player}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Flag team={s.team} className="h-3 flex-shrink-0" />
                            <span className="font-condensed font-bold text-xs uppercase tracking-wide text-gray-400 truncate">{s.team}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <span className="font-display text-base text-gold">{s.goals}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 px-3 font-condensed font-bold text-[10px] uppercase tracking-wider text-gray-600">
                  Fuente: football-data.org · top {scorers.length}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
