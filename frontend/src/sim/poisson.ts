import type { RNG } from './rng'

// Muestreo Poisson por el método de Knuth: válido para las lambdas pequeñas (< ~10)
// que produce el modelo de goles.
export function samplePoisson(lambda: number, rng: RNG): number {
  if (lambda <= 0) return 0
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > limit)
  return k - 1
}
