import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { apiFetch } from '../api/client'


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
    <div className="min-h-screen bg-gray-950 text-white">
      
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">Panel de Admin</h1>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="font-bold mb-4">Cargar resultado</h2>
          <select
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg mb-4"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">Selecciona un partido...</option>
            {pending.map(m => (
              <option key={m.id} value={m.id}>
                {m.home_team} vs {m.away_team} — {new Date(m.match_date).toLocaleDateString('es')}
              </option>
            ))}
          </select>
          <div className="flex gap-4 mb-4">
            <input type="number" min="0" placeholder="Local"
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg text-center"
              value={score.home}
              onChange={e => setScore({ ...score, home: e.target.value })} />
            <span className="text-gray-500 self-center text-xl">—</span>
            <input type="number" min="0" placeholder="Visitante"
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg text-center"
              value={score.away}
              onChange={e => setScore({ ...score, away: e.target.value })} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg hover:bg-yellow-300 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar resultado'}
          </button>
        </form>

        <h2 className="font-bold mb-3 text-gray-400">Resultados cargados ({played.length})</h2>
        {played.length === 0 ? (
          <p className="text-gray-600 text-center py-6">No hay resultados cargados todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {played.map(m => (
              <div key={m.id} className="bg-gray-900 rounded-lg px-4 py-3 flex justify-between">
                <span>{m.home_team} {m.home_score} — {m.away_score} {m.away_team}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
