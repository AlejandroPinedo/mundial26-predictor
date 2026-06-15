import { describe, it, expect } from 'vitest'
import { buildBracket, saveOracleBracket, type TeamRoundProbs } from './bracket.js'

// Genera N equipos con probabilidades monótonas decrecientes por índice.
function descendingTeams(n: number): TeamRoundProbs[] {
  return Array.from({ length: n }, (_, i) => {
    const p = (n - i) / n
    return { team: `T${String(i).padStart(2, '0')}`, r16: p, qf: p * 0.8, sf: p * 0.6, final: p * 0.4, champion: p * 0.2 }
  })
}

describe('buildBracket', () => {
  it('devuelve los tamaños correctos por ronda (16/8/4/2/1)', () => {
    const b = buildBracket(descendingTeams(24))
    expect(b.round16).toHaveLength(16)
    expect(b.quarter).toHaveLength(8)
    expect(b.semi).toHaveLength(4)
    expect(b.finalist).toHaveLength(2)
    expect(b.champion).toHaveLength(1)
  })

  it('cada ronda es subconjunto de la anterior (cuadro coherente)', () => {
    const b = buildBracket(descendingTeams(24))
    const subset = (a: string[], of: string[]) => a.every((t) => of.includes(t))
    expect(subset(b.quarter, b.round16)).toBe(true)
    expect(subset(b.semi, b.quarter)).toBe(true)
    expect(subset(b.finalist, b.semi)).toBe(true)
    expect(subset(b.champion, b.finalist)).toBe(true)
  })

  it('el campeón es el mejor equipo', () => {
    const b = buildBracket(descendingTeams(24))
    expect(b.champion[0]).toBe('T00')
  })

  it('NO promueve a una ronda a un equipo ausente de la ronda previa, aunque su prob suelta sea alta', () => {
    // 16 equipos, todos llegan a octavos. 'T15' tiene final altísimo pero qf=0:
    // al no entrar en cuartos, no puede ser finalista (anidamiento estricto).
    const teams: TeamRoundProbs[] = Array.from({ length: 16 }, (_, i) => ({
      team: `T${String(i).padStart(2, '0')}`,
      r16: 1,
      qf: i < 8 ? 1 - i / 100 : 0,
      sf: i < 4 ? 1 - i / 100 : 0,
      final: i < 2 ? 1 - i / 100 : 0,
      champion: i === 0 ? 1 : 0,
    }))
    teams[15] = { team: 'T15', r16: 1, qf: 0, sf: 0, final: 0.99, champion: 0.99 }
    const b = buildBracket(teams)
    expect(b.quarter).not.toContain('T15')
    expect(b.finalist).not.toContain('T15')
    expect(b.champion).not.toContain('T15')
  })
})

// Doble de BD para saveOracleBracket: rastrea filas y conteo.
function makeBracketDb(initial: { round: string; team: string }[] = []) {
  const stored = [...initial]
  return {
    stored,
    query: async (text: string, params?: unknown[]) => {
      if (text.includes('CREATE TABLE')) return { rows: [] }
      if (text.includes('COUNT(*)')) return { rows: [{ n: stored.length }] }
      if (text.includes('DELETE FROM oracle_bracket')) {
        stored.length = 0
        return { rows: [] }
      }
      if (text.includes('INSERT INTO oracle_bracket')) {
        const [round, team] = params as [string, string]
        stored.push({ round, team })
        return { rows: [] }
      }
      return { rows: [] }
    },
  }
}

describe('saveOracleBracket', () => {
  const bracket = buildBracket(descendingTeams(24))

  it('escribe las 31 filas cuando no hay bracket previo', async () => {
    const db = makeBracketDb()
    const n = await saveOracleBracket(db, bracket)
    expect(n).toBe(31) // 16+8+4+2+1
    expect(db.stored).toHaveLength(31)
  })

  it('no sobreescribe un bracket existente (lock-once)', async () => {
    const db = makeBracketDb([{ round: 'champion', team: 'T00' }])
    const n = await saveOracleBracket(db, bracket)
    expect(n).toBe(-1)
    expect(db.stored).toHaveLength(1)
  })

  it('con force=true regenera el bracket', async () => {
    const db = makeBracketDb([{ round: 'champion', team: 'Viejo' }])
    const n = await saveOracleBracket(db, bracket, { force: true })
    expect(n).toBe(31)
    expect(db.stored.some((r) => r.team === 'Viejo')).toBe(false)
  })
})
