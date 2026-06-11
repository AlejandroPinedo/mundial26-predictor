import type { RNG } from './rng'
import { samplePoisson } from './poisson'

// Promedio histórico de goles por partido en mundiales ≈ 2.6 → 1.3 por equipo.
export const BASE_LAMBDA = 1.3

// Probabilidad de victoria por Elo con temperatura.
// tau = 1 → Elo puro; tau alto aplana hacia 0.5 (más sorpresas).
export function winExpectancy(eloDiff: number, tau: number): number {
  return 1 / (1 + Math.pow(10, -eloDiff / (400 * tau)))
}

// Convierte la expectativa de victoria en goles esperados de cada lado,
// conservando el total de goles del partido (2 * BASE_LAMBDA).
export function eloToLambdas(eloHome: number, eloAway: number, tau: number): [number, number] {
  const pH = winExpectancy(eloHome - eloAway, tau)
  return [BASE_LAMBDA * 2 * pH, BASE_LAMBDA * 2 * (1 - pH)]
}

export function simulateScore(eloHome: number, eloAway: number, tau: number, rng: RNG): [number, number] {
  const [lambdaHome, lambdaAway] = eloToLambdas(eloHome, eloAway, tau)
  return [samplePoisson(lambdaHome, rng), samplePoisson(lambdaAway, rng)]
}

// Penales: casi moneda al aire con leve sesgo al favorito, acotado a [0.4, 0.6].
export function resolveShootout(eloHome: number, eloAway: number, tau: number, rng: RNG): 'home' | 'away' {
  const pH = winExpectancy(eloHome - eloAway, tau)
  const pPenHome = 0.5 + 0.2 * (pH - 0.5)
  return rng() < pPenHome ? 'home' : 'away'
}
