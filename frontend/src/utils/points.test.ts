import { describe, it, expect } from 'vitest'
import { getPointsBadge, projectedPoints } from './points'

describe('getPointsBadge', () => {
  it('returns "Marcador exacto" for 3 points', () => {
    expect(getPointsBadge(3)).toBe('Marcador exacto')
  })

  it('returns "Resultado correcto" for 1 point', () => {
    expect(getPointsBadge(1)).toBe('Resultado correcto')                              
  })

  it('returns "Sin puntos" for 0 points', () => {
    expect(getPointsBadge(0)).toBe('Sin puntos')
  })
})

describe('projectedPoints', () => {
  it('3 puntos por marcador exacto', () => {
    expect(projectedPoints(2, 1, 2, 1)).toBe(3)
    expect(projectedPoints(0, 0, 0, 0)).toBe(3)
  })

  it('1 punto por resultado/signo correcto', () => {
    expect(projectedPoints(2, 0, 3, 1)).toBe(1) // ambos gana local
    expect(projectedPoints(1, 2, 0, 3)).toBe(1) // ambos gana visita
    expect(projectedPoints(1, 1, 2, 2)).toBe(1) // ambos empate
  })

  it('0 puntos por resultado equivocado', () => {
    expect(projectedPoints(2, 0, 0, 1)).toBe(0) // predijo local, gana visita
    expect(projectedPoints(1, 1, 2, 0)).toBe(0) // predijo empate, gana local
  })
})