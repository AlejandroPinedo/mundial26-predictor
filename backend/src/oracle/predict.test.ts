import { describe, it, expect } from 'vitest'
import { predictMatch } from './predict.js'
import { MODEL } from './model.js'
import { ELO_RATINGS } from './ratings.js'

describe('predictMatch (espejo del modelo del frontend)', () => {
  it('mantiene la versión del modelo en sync con model.json v1', () => {
    expect(MODEL.version).toBe(1)
    expect(MODEL.coef.eloDiff).toBeCloseTo(0.6544379626335952, 12)
    expect(MODEL.maxGoals).toBe(10)
  })

  it('las probabilidades 1X2 suman 1', () => {
    const p = predictMatch('España', 'Catar', { neutralVenue: true, elo: ELO_RATINGS })!
    expect(p).not.toBeNull()
    expect(p.probHome + p.probDraw + p.probAway).toBeCloseTo(1, 6)
  })

  it('favorece al equipo con mucho más Elo', () => {
    const p = predictMatch('España', 'Catar', { neutralVenue: true, elo: ELO_RATINGS })!
    expect(p.probHome).toBeGreaterThan(p.probAway)
    expect(p.probHome).toBeGreaterThan(0.6)
    expect(p.mostLikely.home).toBeGreaterThanOrEqual(p.mostLikely.away)
  })

  it('es simétrico con Elo iguales en sede neutral', () => {
    const elo = { A: 1800, B: 1800 }
    const p = predictMatch('A', 'B', { neutralVenue: true, elo })!
    expect(p.probHome).toBeCloseTo(p.probAway, 6)
  })

  it('es determinista: misma entrada → misma salida', () => {
    const a = predictMatch('Brasil', 'Argentina', { neutralVenue: true, elo: ELO_RATINGS })!
    const b = predictMatch('Brasil', 'Argentina', { neutralVenue: true, elo: ELO_RATINGS })!
    expect(a.mostLikely).toEqual(b.mostLikely)
  })

  it('devuelve null si falta el Elo de algún equipo', () => {
    expect(predictMatch('España', 'Atlantis', { neutralVenue: true, elo: ELO_RATINGS })).toBeNull()
  })
})
