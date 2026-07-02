import { describe, it, expect } from 'vitest'
import { resolveKnockout, loserOf, KO_TREE } from './knockoutProgression.js'
import type { KoMatchRow } from './deriveBracketResults.js'

// Helper: construye un partido KO. Marcador null = aún no jugado.
const koMatch = (
  home: string,
  away: string,
  hs: number | null = null,
  as: number | null = null,
  hp: number | null = null,
  ap: number | null = null,
): KoMatchRow => ({
  stage: 'Dieciseisavos',
  home_team: home,
  away_team: away,
  home_score: hs,
  away_score: as,
  home_pen: hp,
  away_pen: ap,
})

const byCode = (entries: [number, KoMatchRow][]) => new Map(entries)

const find = (rs: ReturnType<typeof resolveKnockout>, code: number) => rs.find((r) => r.code === code)!

describe('KO_TREE', () => {
  it('cubre M89..M104 (16 nodos) con el cableado oficial', () => {
    expect(KO_TREE.map((n) => n.code)).toEqual([89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104])
    // Octavos secuenciales: M(89+k) = W(73+2k)/W(74+2k)
    expect(find(resolveKnockout(byCode([])), 89)).toMatchObject({ stage: 'Octavos' })
    const m98 = KO_TREE.find((n) => n.code === 98)!
    expect([m98.a.from, m98.b.from]).toEqual([93, 94]) // cuartos no adyacentes
    const final = KO_TREE.find((n) => n.code === 104)!
    expect(final).toMatchObject({ stage: 'Final', a: { from: 101, take: 'W' }, b: { from: 102, take: 'W' } })
    const third = KO_TREE.find((n) => n.code === 103)!
    expect(third).toMatchObject({ a: { from: 101, take: 'L' }, b: { from: 102, take: 'L' } })
  })
})

describe('loserOf', () => {
  it('devuelve el perdedor por marcador y por penales; null si indeciso', () => {
    expect(loserOf(koMatch('A', 'B', 2, 1))).toBe('B')
    expect(loserOf(koMatch('A', 'B', 1, 1, 3, 5))).toBe('A') // A pierde en penales
    expect(loserOf(koMatch('A', 'B', 1, 1))).toBeNull() // empate sin penales
    expect(loserOf(koMatch('A', 'B'))).toBeNull() // sin jugar
  })
})

describe('resolveKnockout', () => {
  it('resuelve un octavo desde los ganadores de sus dos 16avos', () => {
    const map = byCode([
      [73, koMatch('Argentina', 'Uruguay', 2, 0)],
      [74, koMatch('Alemania', 'Paraguay', 1, 1, 5, 4)], // Alemania por penales
    ])
    expect(find(resolveKnockout(map), 89)).toMatchObject({ home: 'Argentina', away: 'Alemania' })
  })

  it('deja null si algún feeder aún no tiene ganador', () => {
    const map = byCode([[73, koMatch('Argentina', 'Uruguay', 2, 0)]]) // falta M74
    expect(find(resolveKnockout(map), 89)).toMatchObject({ home: 'Argentina', away: null })
  })

  it('propaga en cadena 16avos → octavos → cuartos', () => {
    const map = byCode([
      [73, koMatch('A', 'B', 1, 0)],
      [74, koMatch('C', 'D', 1, 0)],
      [75, koMatch('E', 'F', 1, 0)],
      [76, koMatch('G', 'H', 1, 0)],
      [89, koMatch('A', 'C', 2, 1)], // ganador A → alimenta M97
      [90, koMatch('E', 'G', 0, 2)], // ganador G → alimenta M97
    ])
    const rs = resolveKnockout(map)
    expect(find(rs, 89)).toMatchObject({ home: 'A', away: 'C' })
    expect(find(rs, 90)).toMatchObject({ home: 'E', away: 'G' })
    expect(find(rs, 97)).toMatchObject({ home: 'A', away: 'G' }) // W89 vs W90
  })

  it('el 3er puesto toma los PERDEDORES de las semis', () => {
    const map = byCode([
      [101, koMatch('Brasil', 'Francia', 1, 2)], // pierde Brasil
      [102, koMatch('España', 'Inglaterra', 0, 0, 4, 2)], // pierde Inglaterra
    ])
    const rs = resolveKnockout(map)
    expect(find(rs, 103)).toMatchObject({ home: 'Brasil', away: 'Inglaterra' }) // 3er puesto
    expect(find(rs, 104)).toMatchObject({ home: 'Francia', away: 'España' }) // final
  })
})
