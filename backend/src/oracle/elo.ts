// Elo en vivo: parte del snapshot de ratings.ts y pliega los resultados ya
// jugados usando la MISMA fórmula que frontend/src/predict/elo.ts y ml/elo.py.
// ESPEJO de frontend/src/predict/elo.ts — mantener sincronizado.
import { ELO_RATINGS, getElo, HOST_NATIONS } from './ratings.js'

export const HOME_ADVANTAGE = 100
const WORLD_CUP_K = 60 // índice de peso K para Copa del Mundo (eloratings.net)

// Expectativa de resultado del local (1=victoria, .5=empate) con ventaja de localía.
export function expectedHome(eloHome: number, eloAway: number, neutral: boolean): number {
  const dr = eloHome + (neutral ? 0 : HOME_ADVANTAGE) - eloAway
  return 1 / (Math.pow(10, -dr / 400) + 1)
}

// Multiplicador por margen de victoria (number-of-goals index de eloratings.net).
export function movMultiplier(goalDiff: number): number {
  const g = Math.abs(goalDiff)
  if (g <= 1) return 1
  if (g === 2) return 1.5
  if (g === 3) return 1.75
  return 1.75 + (g - 3) / 8
}

// Actualiza el Elo de ambos equipos tras un partido. Devuelve [eloLocal', eloVisita'].
export function updateElo(
  eloHome: number,
  eloAway: number,
  homeGoals: number,
  awayGoals: number,
  opts: { neutral: boolean; k?: number },
): [number, number] {
  const k = opts.k ?? WORLD_CUP_K
  const we = expectedHome(eloHome, eloAway, opts.neutral)
  const w = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0
  const change = k * movMultiplier(homeGoals - awayGoals) * (w - we)
  return [eloHome + change, eloAway - change]
}

export type EloMatch = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string
}

// Elo actual de cada selección: snapshot ratings.ts + partidos ya jugados (en orden
// cronológico). Un partido es neutral salvo que el local sea anfitrión (MX/USA/CAN).
export function currentElo(matches: EloMatch[]): Record<string, number> {
  const elo: Record<string, number> = { ...ELO_RATINGS }
  const played = matches
    .filter((m) => m.home_score !== null && m.away_score !== null)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  for (const m of played) {
    const eh = elo[m.home_team] ?? getElo(m.home_team)
    const ea = elo[m.away_team] ?? getElo(m.away_team)
    const neutral = !HOST_NATIONS.has(m.home_team)
    const [nh, na] = updateElo(eh, ea, m.home_score!, m.away_score!, { neutral })
    elo[m.home_team] = nh
    elo[m.away_team] = na
  }
  return elo
}
