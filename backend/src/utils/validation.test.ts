import { describe, it, expect } from 'vitest'
import { validateUsername } from './validation'

describe('validateUsername', () => {
  it('accepts a valid username', () => {
    expect(validateUsername('herles_26')).toBeNull()
  })

  it('accepts exactly 3 and 20 characters', () => {
    expect(validateUsername('abc')).toBeNull()
    expect(validateUsername('a'.repeat(20))).toBeNull()
  })

  it('trims surrounding whitespace before validating', () => {
    expect(validateUsername('  golazo  ')).toBeNull()
  })

  it('rejects empty or missing values', () => {
    expect(validateUsername('')).toMatch(/requerido/)
    expect(validateUsername('   ')).toMatch(/requerido/)
    expect(validateUsername(undefined)).toMatch(/requerido/)
    expect(validateUsername(null)).toMatch(/requerido/)
    expect(validateUsername(42)).toMatch(/requerido/)
  })

  it('rejects usernames shorter than 3 characters', () => {
    expect(validateUsername('ab')).toMatch(/al menos 3/)
  })

  it('rejects usernames longer than 20 characters', () => {
    expect(validateUsername('a'.repeat(21))).toMatch(/superar 20/)
  })

  it('rejects spaces, accents and symbols', () => {
    expect(validateUsername('el campeon')).toMatch(/letras, números/)
    expect(validateUsername('camp€ón')).toMatch(/letras, números/)
    expect(validateUsername('user@26')).toMatch(/letras, números/)
    expect(validateUsername('⚽golazo')).toMatch(/letras, números/)
  })
})
