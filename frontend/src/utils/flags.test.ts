import { describe, it, expect } from 'vitest'
import { getFlag, getFlagCode, getAllTeams } from './flags'

// Archivos reales en public/flags/, resueltos por Vite en build-time
const flagFiles = import.meta.glob('../../public/flags/*.png')
const availableCodes = new Set(
  Object.keys(flagFiles).map(p => p.split('/').pop()!.replace('.png', ''))
)

describe('FLAG_CODES', () => {
  it('every team with emoji also has a ISO code (Windows usa imágenes)', () => {
    for (const team of getAllTeams()) {
      expect(getFlagCode(team), `sin código ISO para "${team}"`).not.toBeNull()
    }
  })

  it('every ISO code has its PNG in public/flags/', () => {
    for (const team of getAllTeams()) {
      const code = getFlagCode(team)!
      expect(availableCodes.has(code), `falta public/flags/${code}.png para "${team}"`).toBe(true)
    }
  })

  it('getFlagCode returns null for unknown teams (fallback a emoji)', () => {
    expect(getFlagCode('Equipo Inventado')).toBeNull()
    expect(getFlag('Equipo Inventado')).toBe('🏳️')
  })

  it('England and Scotland use flagcdn subdivision codes', () => {
    expect(getFlagCode('Inglaterra')).toBe('gb-eng')
    expect(getFlagCode('Escocia')).toBe('gb-sct')
  })
})
