import { describe, it, expect } from 'vitest'
import { R32_TO_R16_SLOT } from './bracketStructure'

// Estructura oficial FIFA 2026 (Wikipedia, WC2026 knockout stage):
// slots 0–7 → semifinal M101 (izquierda), slots 8–15 → semifinal M102 (derecha).
// Octavos: M89=W73/W74, M90=W75/W76, M93=W81/W82, M94=W83/W84 (mitad izq);
//          M91=W77/W78, M92=W79/W80, M95=W85/W86, M96=W87/W88 (mitad der).
describe('R32_TO_R16_SLOT — árbol oficial del bracket', () => {
  const isLeft = (i: number) => R32_TO_R16_SLOT[i] < 8 // mitad M101

  it('mapea cada 32avo a su slot oficial de octavos', () => {
    expect([...R32_TO_R16_SLOT]).toEqual([2, 0, 3, 8, 1, 9, 10, 11, 6, 7, 4, 5, 14, 12, 15, 13])
  })

  it('las llaves de M73, M74, M75, M77 van a la mitad izquierda (M101)', () => {
    for (const i of [0, 1, 2, 4]) expect(isLeft(i)).toBe(true)
  })

  it('las llaves de M76, M78, M79, M80 van a la mitad derecha (M102)', () => {
    for (const i of [3, 5, 6, 7]) expect(isLeft(i)).toBe(false)
  })

  it('las llaves de M81–M84 (idx 8–11) van a la mitad izquierda (M101)', () => {
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
