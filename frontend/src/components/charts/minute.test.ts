import { describe, it, expect } from 'vitest'
import { effectiveMinute } from './minute'

describe('effectiveMinute', () => {
  it('tiempo añadido de la 2ª parte cuenta como post-90 (bug 90+X → 90)', () => {
    expect(effectiveMinute("90'+8'")).toBe(98)
    expect(effectiveMinute("90'+3'")).toBe(93)
    expect(effectiveMinute("90'+7'")).toBe(97) // Xhaka (pen) vs Bosnia
    expect(effectiveMinute("90'+12'")).toBe(102)
    expect(effectiveMinute('90+7')).toBe(97) // formato sin apóstrofes
  })

  it('tiempo añadido de la 1ª parte se queda en ≤45 (no salta al 2º tiempo)', () => {
    expect(effectiveMinute("45'+5'")).toBe(45)
    expect(effectiveMinute("45'+3'")).toBe(45)
  })

  it('minutos normales', () => {
    expect(effectiveMinute("12'")).toBe(12)
    expect(effectiveMinute("90'")).toBe(90)
    expect(effectiveMinute('73')).toBe(73)
  })

  it('extra time (prórroga) cae por encima de 90', () => {
    expect(effectiveMinute("105'+2'")).toBe(107)
    expect(effectiveMinute("120'+1'")).toBe(121)
  })

  it('valores vacíos o no numéricos → null', () => {
    expect(effectiveMinute('')).toBeNull()
    expect(effectiveMinute('abc')).toBeNull()
  })
})
