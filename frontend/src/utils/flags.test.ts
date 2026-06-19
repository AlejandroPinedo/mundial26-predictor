import { describe, it, expect } from 'vitest'
import { getFlag, getFlagCode, getFifaCode, getAllTeams } from './flags'

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

describe('FIFA_CODES', () => {
  it('every team has a 3-letter FIFA code', () => {
    for (const team of getAllTeams()) {
      const code = getFifaCode(team)
      expect(code, `sin código FIFA para "${team}"`).not.toBeNull()
      expect(code, `código FIFA mal formado para "${team}": ${code}`).toMatch(/^[A-Z]{3}$/)
    }
  })

  it('getFifaCode returns null for unknown teams', () => {
    expect(getFifaCode('Equipo Inventado')).toBeNull()
  })
})
