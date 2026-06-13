import { describe, it, expect } from 'vitest'
import { predictMatch } from './predictMatch'

const elo = { Fuerte: 2157, Debil: 1421, ParA: 1500, ParB: 1500, Local: 1875, Visita: 1500 }

describe('predictMatch', () => {
  it('devuelve null si falta algún equipo en el Elo', () => {
    expect(predictMatch('Fuerte', 'Desconocido', { neutralVenue: true, elo })).toBeNull()
    expect(predictMatch('NoExiste', 'Debil', { neutralVenue: true, elo })).toBeNull()
  })

  it('las probabilidades 1X2 suman ~1', () => {
    const p = predictMatch('Fuerte', 'Debil', { neutralVenue: true, elo })!
    expect(p.probHome + p.probDraw + p.probAway).toBeCloseTo(1, 6)
  })

  it('el favorito claro tiene mayor probabilidad de ganar', () => {
    const p = predictMatch('Fuerte', 'Debil', { neutralVenue: true, elo })!
    expect(p.probHome).toBeGreaterThan(p.probAway)
    expect(p.probHome).toBeGreaterThan(p.probDraw)
    expect(p.lambdaHome).toBeGreaterThan(p.lambdaAway)
  })

  it('es simétrico en sede neutral al intercambiar local y visita', () => {
    const ab = predictMatch('Fuerte', 'Debil', { neutralVenue: true, elo })!
    const ba = predictMatch('Debil', 'Fuerte', { neutralVenue: true, elo })!
    expect(ab.probHome).toBeCloseTo(ba.probAway, 10)
    expect(ab.probAway).toBeCloseTo(ba.probHome, 10)
    expect(ab.probDraw).toBeCloseTo(ba.probDraw, 10)
    expect(ab.lambdaHome).toBeCloseTo(ba.lambdaAway, 10)
  })

  it('equipos iguales en sede neutral: pH == pA', () => {
    const p = predictMatch('ParA', 'ParB', { neutralVenue: true, elo })!
    expect(p.probHome).toBeCloseTo(p.probAway, 10)
    expect(p.lambdaHome).toBeCloseTo(p.lambdaAway, 10)
  })

  it('la ventaja de localía sube la probabilidad del local', () => {
    const neutral = predictMatch('Local', 'Visita', { neutralVenue: true, elo })!
    const home = predictMatch('Local', 'Visita', { neutralVenue: false, elo })!
    expect(home.probHome).toBeGreaterThan(neutral.probHome)
    expect(home.lambdaHome).toBeGreaterThan(neutral.lambdaHome)
  })

  it('topScores está ordenado desc y mostLikely es el primero', () => {
    const p = predictMatch('Fuerte', 'Debil', { neutralVenue: true, elo })!
    expect(p.topScores).toHaveLength(3)
    expect(p.topScores[0].p).toBeGreaterThanOrEqual(p.topScores[1].p)
    expect(p.topScores[1].p).toBeGreaterThanOrEqual(p.topScores[2].p)
    expect(p.mostLikely).toEqual(p.topScores[0])
  })

  // Paridad con ml/train.py (mismos coeficientes de model.json). Tolerancia 1e-3.
  it('coincide con la inferencia de referencia en Python', () => {
    const f1 = predictMatch('Fuerte', 'Debil', { neutralVenue: true, elo })!
    expect(f1.lambdaHome).toBeCloseTo(3.9904, 3)
    expect(f1.lambdaAway).toBeCloseTo(0.359, 3)
    expect(f1.probHome).toBeCloseTo(0.9494, 3)
    expect(f1.probDraw).toBeCloseTo(0.0412, 3)
    expect(f1.probAway).toBeCloseTo(0.0094, 3)

    const f2 = predictMatch('ParA', 'ParB', { neutralVenue: true, elo })!
    expect(f2.lambdaHome).toBeCloseTo(1.1969, 3)
    expect(f2.probHome).toBeCloseTo(0.3546, 3)
    expect(f2.probDraw).toBeCloseTo(0.2907, 3)

    const f3 = predictMatch('Local', 'Visita', { neutralVenue: false, elo })!
    expect(f3.lambdaHome).toBeCloseTo(3.0063, 3)
    expect(f3.lambdaAway).toBeCloseTo(0.648, 3)
    expect(f3.probHome).toBeCloseTo(0.839, 3)
    expect(f3.probDraw).toBeCloseTo(0.1122, 3)
    expect(f3.probAway).toBeCloseTo(0.0489, 3)
  })
})
