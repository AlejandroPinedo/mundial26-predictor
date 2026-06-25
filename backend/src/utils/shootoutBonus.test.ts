import { describe, it, expect } from 'vitest'
import { shootoutBonus, type ShootoutTie } from './shootoutBonus.js'

const t = (round: string, a: string, b: string): ShootoutTie => ({ round, teamA: a, teamB: b })

describe('shootoutBonus', () => {
  it('+1 por cada tanda acertada (par + ronda), sin importar el orden de equipos', () => {
    const picks = [t('quarter', 'Brasil', 'Francia'), t('semi', 'Argentina', 'España')]
    const real = [t('quarter', 'Francia', 'Brasil'), t('semi', 'Argentina', 'España')]
    expect(shootoutBonus(picks, real)).toBe(2)
  })

  it('no premia si la llave real no fue a penales', () => {
    const picks = [t('quarter', 'Brasil', 'Francia')]
    const real = [t('semi', 'Argentina', 'España')]
    expect(shootoutBonus(picks, real)).toBe(0)
  })

  it('la misma ronda pero distinto par no cuenta', () => {
    const picks = [t('quarter', 'Brasil', 'Inglaterra')]
    const real = [t('quarter', 'Brasil', 'Francia')]
    expect(shootoutBonus(picks, real)).toBe(0)
  })

  it('no duplica si hay picks repetidos', () => {
    const picks = [t('quarter', 'Brasil', 'Francia'), t('quarter', 'Francia', 'Brasil')]
    const real = [t('quarter', 'Brasil', 'Francia')]
    expect(shootoutBonus(picks, real)).toBe(1)
  })

  it('sin picks o sin reales → 0', () => {
    expect(shootoutBonus([], [t('quarter', 'A', 'B')])).toBe(0)
    expect(shootoutBonus([t('quarter', 'A', 'B')], [])).toBe(0)
  })
})
