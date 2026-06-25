// Autocompletado y "favorito por cruce" del bracket usando el modelo ML (Elo + Poisson).
// Reusa predict/predictMatch. Las eliminatorias se juegan en sede neutral.
import { predictMatch } from '../predict/predictMatch'
import { R32_TO_R16_SLOT } from './bracketStructure'

export type TieOdds = { favorite: string | null; favPct: number }

type Pair = { home: string | null; away: string | null }
export type BracketPrediction = {
  round16: (string | null)[]
  quarter: (string | null)[]
  semi: (string | null)[]
  finalist: (string | null)[]
  champion: (string | null)[]
}

/**
 * Probabilidad de AVANZAR de cada lado en una llave a doble cara (el empate se
 * reparte por verosimilitud → P(avanza) = pGana / (pGanaLocal + pGanaVisita)).
 * Devuelve el favorito y su probabilidad de pasar.
 */
export function tieOdds(home: string | null, away: string | null, elo: Record<string, number>): TieOdds {
  if (!home || !away) return { favorite: null, favPct: 0 }
  const p = predictMatch(home, away, { neutralVenue: true, elo })
  if (!p) return { favorite: null, favPct: 0 }
  const denom = p.probHome + p.probAway || 1
  const hAdv = p.probHome / denom // P(local avanza) repartiendo el empate
  return hAdv >= 0.5 ? { favorite: home, favPct: hAdv } : { favorite: away, favPct: 1 - hAdv }
}

/** Rellena el bracket completo avanzando al favorito de cada cruce. */
export function autoFillFavorites(r32: Pair[], elo: Record<string, number>): BracketPrediction {
  const round16 = Array<string | null>(16).fill(null)
  r32.forEach((mu, idx) => {
    const slot = R32_TO_R16_SLOT[idx]
    if (slot !== undefined) round16[slot] = tieOdds(mu.home, mu.away, elo).favorite
  })
  const advance = (prev: (string | null)[], n: number): (string | null)[] => {
    const next = Array<string | null>(n).fill(null)
    for (let k = 0; k < n; k++) next[k] = tieOdds(prev[2 * k], prev[2 * k + 1], elo).favorite
    return next
  }
  const quarter = advance(round16, 8)
  const semi = advance(quarter, 4)
  const finalist = advance(semi, 2)
  const champion = [tieOdds(finalist[0], finalist[1], elo).favorite]
  return { round16, quarter, semi, finalist, champion }
}
