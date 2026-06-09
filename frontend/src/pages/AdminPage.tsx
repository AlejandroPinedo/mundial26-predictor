import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'
import PageHeader from '../components/PageHeader'

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

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans">
        
        <PageHeader title="PANEL ADMIN" subtitle="Registrar resultados oficiales" icon="🔧" badge="Admin Only" />

        {/* Load Results Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-yellow-400" />
          <h2 className="font-displayr text-yellow-400 text-lg mb-4">
            Cargar Resultado Oficial
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1.5">Seleccionar Partido</label>
              <select
                className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 text-white px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                value={selected}
                onChange={e => setSelected(e.target.value)}
              >
                <option value="">Selecciona un partido pendiente...</option>
                {pending.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.home_team} vs {m.away_team} — {new Date(m.match_date).toLocaleDateString('es')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1.5">Goles Local</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 text-white px-4 py-3 rounded-xl text-center font-bold text-sm outline-none transition-colors"
                  value={score.home}
                  onChange={e => setScore({ ...score, home: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1.5">Goles Visitante</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="0"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 text-white px-4 py-3 rounded-xl text-center font-bold text-sm outline-none transition-colors"
                  value={score.away}
                  onChange={e => setScore({ ...score, away: e.target.value })}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !selected || score.home === '' || score.away === ''}
              className="bg-yellow-400 text-gray-950 font-bold py-3 rounded-xl hover:bg-yellow-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-sans mt-2"
            >
              {loading ? 'Guardando...' : 'Registrar Resultado Oficial ⚽'}
            </button>
          </form>
        </div>

        {/* Previous Results List */}
        <div>
          <h2 className="font-displayr text-gray-400 mb-4 text-base">
            Resultados Registrados ({played.length})
          </h2>
          
          {played.length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-gray-900/40 border border-gray-850 rounded-3xl">No hay resultados cargados todavía.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {played.map(m => (
                <div key={m.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-white text-sm truncate uppercase font-barlow tracking-wider">
                      {m.home_team} vs {m.away_team}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                      {new Date(m.match_date).toLocaleDateString('es')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl font-bold text-yellow-400 text-xs">
                      {m.home_score} - {m.away_score}
                    </span>
                    <button
                      onClick={() => {
                        setSelected(m.id)
                        setScore({ home: String(m.home_score), away: String(m.away_score) })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="text-gray-500 hover:text-yellow-400 text-xs font-bold transition px-2 py-1 rounded-lg hover:bg-gray-800">
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
