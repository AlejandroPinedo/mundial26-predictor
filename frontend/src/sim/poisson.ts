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

// PMF cerrada de Poisson: P(X=k) = e^-λ · λ^k / k!.
// La usa el predictor por partido para construir la distribución de marcadores
// de forma determinista (sin muestreo). Se calcula en espacio log por estabilidad.
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 2; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}
