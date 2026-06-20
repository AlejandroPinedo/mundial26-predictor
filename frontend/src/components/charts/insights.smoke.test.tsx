import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ShotInsights carga sus datos vía apiFetch; el resto recibe props puras.
vi.mock('../../api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '../../api/client'
import ShotInsights from './ShotInsights'
import OracleInsights, { type Match, type CrowdFavorite } from './OracleInsights'
import PoolInsights, { type PoolData } from './PoolInsights'

// ── Datos simulados ───────────────────────────────────────────────────────────
function mockShots() {
  const shots = []
  const teams = ['Argentina', 'Brasil']
  for (let i = 0; i < 24; i++) {
    const team = teams[i % 2]
    const dist = (i % 6) * 6 + 3
    shots.push({
      x: 80 + (i % 10),
      y: 30 + (i % 40),
      goal: i % 4 === 0,
      pen: i % 11 === 0,
      inBox: dist < 16,
      dist,
      team,
      player: `Jugador ${i}`,
      minute: String((i * 7) % 95 || 5),
      stage: 'Fase de grupos',
    })
  }
  return { updatedAt: '2026-06-18T12:00:00Z', matches: 6, shots }
}

const matches: Match[] = [
  { id: '1', home_team: 'Argentina', away_team: 'Brasil', home_score: 2, away_score: 1, match_date: '2026-06-12T18:00:00Z', stage: 'Fase de grupos' },
  { id: '2', home_team: 'España', away_team: 'Francia', home_score: 0, away_score: 3, match_date: '2026-06-13T18:00:00Z', stage: 'Fase de grupos' },
  { id: '3', home_team: 'México', away_team: 'Inglaterra', home_score: 1, away_score: 1, match_date: '2026-06-14T18:00:00Z', stage: 'Fase de grupos' },
  { id: '4', home_team: 'Brasil', away_team: 'España', home_score: null, away_score: null, match_date: '2026-06-25T18:00:00Z', stage: 'Octavos' },
  { id: '5', home_team: 'Argentina', away_team: 'Francia', home_score: null, away_score: null, match_date: '2026-06-26T18:00:00Z', stage: 'Octavos' },
]

const crowdFavorites: CrowdFavorite[] = [
  { match_id: '1', home_team: 'Argentina', away_team: 'Brasil', stage: 'Fase de grupos', home_score: 2, away_score: 1, crowd_home: 2, crowd_away: 1, votes: 12, total_votes: 30 },
  { match_id: '2', home_team: 'España', away_team: 'Francia', stage: 'Fase de grupos', home_score: 0, away_score: 3, crowd_home: 2, crowd_away: 1, votes: 9, total_votes: 28 },
]

const poolData: PoolData = {
  pointsDistribution: [
    { points: 0, count: 50 },
    { points: 1, count: 30 },
    { points: 3, count: 12 },
  ],
  predictedGoalsDistribution: [
    { goals: 0, count: 20 },
    { goals: 1, count: 60 },
    { goals: 2, count: 70 },
    { goals: 3, count: 30 },
    { goals: 4, count: 8 },
  ],
  bracketRounds: [
    { round: 'round16', picks: 80, distinct_teams: 16 },
    { round: 'quarter', picks: 40, distinct_teams: 10 },
    { round: 'semi', picks: 20, distinct_teams: 6 },
    { round: 'finalist', picks: 10, distinct_teams: 4 },
    { round: 'champion', picks: 5, distinct_teams: 3 },
  ],
  activity: {
    byHour: [{ hour: 9, count: 5 }, { hour: 20, count: 40 }, { hour: 22, count: 18 }],
    byDow: [{ dow: 1, count: 12 }, { dow: 5, count: 25 }, { dow: 6, count: 30 }],
  },
}

describe('charts de estadísticas (smoke)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ShotInsights renderiza todos los gráficos del shot map con datos', async () => {
    vi.mocked(apiFetch).mockResolvedValue(mockShots())
    render(<ShotInsights />)
    expect(await screen.findByText('Conversión por distancia')).toBeTruthy()
    expect(screen.getByText('¿Cuándo caen los goles?')).toBeTruthy()
    expect(screen.getByText('Eficacia goleadora')).toBeTruthy()
    expect(screen.getByText('Dentro vs fuera del área')).toBeTruthy()
    expect(screen.getByText('Zonas de remate')).toBeTruthy()
    // hay selecciones con remates suficientes → no debe verse el vacío
    expect(screen.queryByText(/no hay selecciones con remates/i)).toBeNull()
  })

  it('ShotInsights muestra estado vacío cuando el endpoint no trae datos', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ updatedAt: '', matches: 0, shots: [] })
    render(<ShotInsights />)
    expect(await screen.findByText(/aún no hay datos disponibles/i)).toBeTruthy()
  })

  it('OracleInsights calcula el modelo y renderiza sin reventar', () => {
    render(<OracleInsights matches={matches} crowdFavorites={crowdFavorites} />)
    expect(screen.getByText('Goles por fase')).toBeTruthy()
    expect(screen.getByText('Calibración del Pez Oráculo')).toBeTruthy()
    expect(screen.getByText('Pronóstico del Oráculo')).toBeTruthy()
    expect(screen.getByText('Termómetro de sorpresas')).toBeTruthy()
    expect(screen.getByText('La masa vs el Oráculo vs la realidad')).toBeTruthy()
    // con 3 jugados, la calibración no debe estar vacía
    expect(screen.queryByText(/no hay partidos jugados para evaluar/i)).toBeNull()
    // España 0-3 Francia es una sorpresa → la tabla y el termómetro tienen contenido
    expect(screen.getAllByText('0-3').length).toBeGreaterThan(0)
  })

  it('OracleInsights tolera lista de partidos vacía (estados vacíos)', () => {
    render(<OracleInsights matches={[]} crowdFavorites={[]} />)
    expect(screen.getByText('Goles por fase')).toBeTruthy()
    expect(screen.getAllByText(/aún no hay/i).length).toBeGreaterThan(0)
  })

  it('PoolInsights renderiza las 4 agregaciones del pool', () => {
    render(<PoolInsights data={poolData} matches={matches} />)
    expect(screen.getByText('¿Qué tan difícil es acertar?')).toBeTruthy()
    expect(screen.getByText('Lo que la gente predice vs lo que pasa')).toBeTruthy()
    expect(screen.getByText('Embudo del bracket')).toBeTruthy()
    expect(screen.getByText('Cuándo pronostica la comunidad')).toBeTruthy()
    // distribución de puntos: 50/30/12 → total 92, 0 = 54%
    expect(screen.getByText('Marcador exacto')).toBeTruthy()
  })
})
