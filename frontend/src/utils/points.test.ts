import { describe, it, expect } from 'vitest'
import { getPointsBadge } from './points'

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