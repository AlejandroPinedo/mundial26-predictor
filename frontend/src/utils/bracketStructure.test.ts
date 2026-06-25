import { describe, it, expect } from 'vitest'
import { R32_TO_R16_SLOT } from './bracketStructure'

// Mitades oficiales FIFA 2026: slots 0–7 → semifinal M101 (izquierda),
// slots 8–15 → semifinal M102 (derecha). Los cuartos NO emparejan octavos
// adyacentes, así que el grupo de M76 cae en M102 y el de M81 en M101.
describe('R32_TO_R16_SLOT — mitades oficiales del bracket', () => {
  const isLeft = (i: number) => R32_TO_R16_SLOT[i] < 8 // mitad M101

  it('el grupo de M76 (R32 idx 3,5,6,7) va a la mitad derecha (M102)', () => {
    for (const i of [3, 5, 6, 7]) expect(isLeft(i)).toBe(false)
  })

  it('el grupo de M81 (R32 idx 8,9,10,11) va a la mitad izquierda (M101)', () => {
    for (const i of [8, 9, 10, 11]) expect(isLeft(i)).toBe(true)
  })

  it('reparte las 16 llaves de 16avos en las mitades oficiales', () => {
    const left = R32_TO_R16_SLOT.map((s, i) => (s < 8 ? i : -1)).filter((i) => i >= 0).sort((a, b) => a - b)
    const right = R32_TO_R16_SLOT.map((s, i) => (s >= 8 ? i : -1)).filter((i) => i >= 0).sort((a, b) => a - b)
    expect(left).toEqual([0, 1, 2, 4, 8, 9, 10, 11]) // M73,M74,M75,M77 + M81,M82,M83,M84
    expect(right).toEqual([3, 5, 6, 7, 12, 13, 14, 15]) // M76,M78,M79,M80 + M85,M86,M87,M88
  })

  it('cada slot de 0 a 15 se usa exactamente una vez (biyección)', () => {
    expect([...R32_TO_R16_SLOT].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i))
  })
})
