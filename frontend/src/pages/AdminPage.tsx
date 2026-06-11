import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import Flag from '../components/Flag'
import { LIMA_TZ } from '../utils/dates'

type Match = {
  id: string
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [selected, setSelected] = useState<string>('')
  const [score, setScore] = useState({ home: '', away: '' })
  const [loading, setLoading] = useState(false)

  async function loadMatches() {
    const d = await apiFetch('/predictions/matches')
    setMatches(d.matches)
  }

  useEffect(() => { loadMatches() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { toast.error('Selecciona un partido'); return }
    if (score.home === '' || score.away === '') { toast.error('Ingresa ambos marcadores'); return }
    setLoading(true)
    try {
      const data = await apiFetch('/predictions/admin/result', {
        method: 'POST',
        body: JSON.stringify({
          matchId: selected,
          homeScore: Number(score.home),
          awayScore: Number(score.away),
        }),
      })
      toast.success(`Resultado guardado. ${data.updated} predicciones actualizadas.`)
      setSelected('')
      setScore({ home: '', away: '' })
      loadMatches()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const pending = matches.filter(m => m.home_score === null)
  const played = matches.filter(m => m.home_score !== null)
  const selectedMatch = matches.find(m => m.id === selected)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 font-sans text-white">

      <PageHeader title="PANEL ADMIN" subtitle="Registrar resultados oficiales" icon="🔧" badge="Admin Only" />

      {/* Cargar resultado oficial */}
      <div className="relative overflow-hidden bg-panel border border-white/8 rounded-2xl fade-up mb-8">
        <div className="tri-stripe" />
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
            <h2 className="font-display text-xl text-white uppercase tracking-wide leading-none flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 text-gold flex items-center justify-center flex-shrink-0">
                <Icon name="wrench" size={15} />
              </span>
              Cargar Resultado Oficial
            </h2>
            <span className="chip text-ca border-ca/30 bg-ca/10">
              <Icon name="zap" size={11} /> Recalcula los puntos de todos los jugadores
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Selector de partido */}
            <div>
              <label className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider block mb-1.5">
                Seleccionar Partido
              </label>
              {pending.length === 0 ? (
                <div className="glass rounded-xl px-4 py-6 text-center">
                  <Icon name="check" size={22} className="text-mx mx-auto mb-2" />
                  <p className="text-gray-500 text-xs font-condensed font-bold uppercase tracking-wider">
                    No hay partidos pendientes
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 text-xs mb-2">Selecciona un partido pendiente...</p>
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {pending.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelected(m.id)}
                        aria-pressed={selected === m.id}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                          selected === m.id
                            ? 'border-gold/40 bg-gold/[0.07]'
                            : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0 text-[13px]">
                          <Flag team={m.home_team} className="h-3 flex-shrink-0" />
                          <span className="font-condensed font-bold uppercase tracking-wide truncate">{m.home_team}</span>
                          <span className="text-gray-600 text-[9px] font-condensed font-extrabold uppercase flex-shrink-0">vs</span>
                          <Flag team={m.away_team} className="h-3 flex-shrink-0" />
                          <span className="font-condensed font-bold uppercase tracking-wide truncate">{m.away_team}</span>
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-500 font-condensed font-bold uppercase tracking-wider">
                            {new Date(m.match_date).toLocaleDateString('es', { timeZone: LIMA_TZ })}
                          </span>
                          {selected === m.id && <Icon name="check" size={14} className="text-gold" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Partido seleccionado */}
            {selectedMatch && (
              <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl border border-gold/30 bg-gold/[0.06]">
                <span className="chip text-gold border-gold/30 bg-gold/10 flex-shrink-0">
                  <Icon name="ball" size={11} /> Partido seleccionado
                </span>
                <span className="flex items-center gap-2 text-sm font-condensed font-bold uppercase tracking-wide min-w-0">
                  <Flag team={selectedMatch.home_team} className="h-3.5 flex-shrink-0" />
                  <span className="truncate">{selectedMatch.home_team}</span>
                  <span className="text-gray-500 text-[10px]">vs</span>
                  <Flag team={selectedMatch.away_team} className="h-3.5 flex-shrink-0" />
                  <span className="truncate">{selectedMatch.away_team}</span>
                </span>
              </div>
            )}

            {/* Marcadores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider block mb-1.5">
                  Goles Local
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  className="scoreboard w-full border border-white/10 focus:border-gold/50 placeholder:text-gray-700 px-4 py-3 rounded-xl text-center text-2xl outline-none transition-colors"
                  value={score.home}
                  onChange={e => setScore({ ...score, home: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider block mb-1.5">
                  Goles Visitante
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  className="scoreboard w-full border border-white/10 focus:border-gold/50 placeholder:text-gray-700 px-4 py-3 rounded-xl text-center text-2xl outline-none transition-colors"
                  value={score.away}
                  onChange={e => setScore({ ...score, away: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selected || score.home === '' || score.away === ''}
              className="btn-gold text-sm mt-1"
            >
              {loading ? 'Guardando...' : <>Registrar Resultado Oficial <span className="no-invert">⚽</span></>}
            </button>
          </form>
        </div>
      </div>

      {/* Resultados registrados */}
      <div className="fade-up-1">
        <h2 className="font-display text-lg text-white uppercase tracking-wide mb-4">
          Resultados Registrados <span className="text-gold">({played.length})</span>
        </h2>

        {played.length === 0 ? (
          <div className="glass rounded-2xl text-center py-12 px-4">
            <Icon name="ball" size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-condensed font-bold uppercase tracking-wider">
              No hay resultados cargados todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {played.map(m => (
              <div key={m.id} className="ticket-card p-4 flex justify-between items-center gap-3 hover-lift">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-condensed font-bold text-white text-[13px] truncate uppercase tracking-wide">
                    <Flag team={m.home_team} className="h-3" /> {m.home_team}
                    <span className="text-gray-600 text-[9px] mx-1.5">vs</span>
                    <Flag team={m.away_team} className="h-3" /> {m.away_team}
                  </span>
                  <span className="text-[9px] text-gray-500 font-condensed font-extrabold uppercase tracking-wider mt-1">
                    {new Date(m.match_date).toLocaleDateString('es', { timeZone: LIMA_TZ })}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pr-3">
                  <span className="scoreboard px-3 py-1.5 rounded-lg text-xs border border-white/10">
                    {m.home_score} - {m.away_score}
                  </span>
                  <button
                    onClick={() => {
                      setSelected(m.id)
                      setScore({ home: String(m.home_score), away: String(m.away_score) })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="font-condensed font-extrabold uppercase tracking-wider text-[10px] text-gray-500 hover:text-gold px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-gold/30 hover:bg-white/5 transition cursor-pointer">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
