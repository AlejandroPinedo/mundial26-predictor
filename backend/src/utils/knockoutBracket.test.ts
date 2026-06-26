import { describe, it, expect } from 'vitest'
import { computeAllStandings, buildRoundOf32, allocateThirds, type GroupMatch } from './knockoutBracket.js'

// 12 grupos (A..L) de 4 equipos. Construimos resultados deterministas donde el
// orden de clasificación dentro de cada grupo es G1 > G2 > G3 > G4 por nombre.
const GROUPS = 'ABCDEFGHIJKL'.split('')

function groupFixtures(g: string): GroupMatch[] {
  const teams = [1, 2, 3, 4].map((n) => `${g}${n}`)
  const ms: GroupMatch[] = []
  // Round-robin: cada equipo de índice menor le gana a los de índice mayor por
  // un marcador que también ordena por diferencia de goles (4-0, 3-0, ...).
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      ms.push({
        home_team: teams[i],
        away_team: teams[j],
        group_name: g,
        home_score: 4 - i,
        away_score: 0,
      })
    }
  }
  return ms
}

const allMatches: GroupMatch[] = GROUPS.flatMap(groupFixtures)

describe('computeAllStandings', () => {
  it('ordena cada grupo G1 > G2 > G3 > G4', () => {
    const s = computeAllStandings(allMatches)
    for (const g of GROUPS) {
      expect(s[g].map((r) => r.team)).toEqual([`${g}1`, `${g}2`, `${g}3`, `${g}4`])
    }
  })
})

describe('allocateThirds', () => {
  it('asigna los 8 mejores terceros respetando las pools oficiales', () => {
    // Los 8 grupos con ganador que reciben tercero: E,I,A,L,G,D,B,K.
    const alloc = allocateThirds(['A', 'B', 'C', 'D', 'F', 'G', 'H', 'I'])
    expect(alloc).not.toBeNull()
    if (alloc) {
      for (const [winner, thirdGroup] of Object.entries(alloc)) {
        expect(winner).not.toBe(thirdGroup)
      }
      // 8 asignaciones, todas a grupos distintos.
      const targets = Object.values(alloc)
      expect(new Set(targets).size).toBe(targets.length)
    }
  })

  it('devuelve null si no hay asignación válida', () => {
    expect(allocateThirds(['A'])).toBeNull()
  })
})

describe('buildRoundOf32', () => {
  it('produce 16 cruces M73..M88, todos resueltos con grupos decididos', () => {
    const s = computeAllStandings(allMatches)
    const r32 = buildRoundOf32(s)
    expect(r32).toHaveLength(16)
    expect(r32.map((m) => m.code)).toEqual(
      Array.from({ length: 16 }, (_, i) => `M${73 + i}`),
    )
    expect(r32.every((m) => m.resolved)).toBe(true)
  })

  it('respeta los cruces oficiales fijos (no dependen de terceros)', () => {
    const s = computeAllStandings(allMatches)
    const r32 = buildRoundOf32(s)
    const byCode = Object.fromEntries(r32.map((m) => [m.code, m]))
    expect(byCode['M73']).toMatchObject({ home: 'A2', away: 'B2' }) // 2A vs 2B
    expect(byCode['M75']).toMatchObject({ home: 'F1', away: 'C2' }) // 1F vs 2C
    expect(byCode['M83']).toMatchObject({ home: 'H1', away: 'J2' }) // 1H vs 2J
    expect(byCode['M84']).toMatchObject({ home: 'K2', away: 'L2' }) // 2K vs 2L
  })

  it('marca resolved=false y usa placeholders si faltan resultados', () => {
    const r32 = buildRoundOf32({}) // sin standings
    expect(r32.every((m) => !m.resolved)).toBe(true)
    expect(r32[0].home).toContain('Segundo Grupo A')
  })
})
