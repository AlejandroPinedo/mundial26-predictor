import { describe, it, expect } from 'vitest'
import { decideResult } from './syncFromFootballData.js'

const EMPTY = { home: null, away: null, status: null }

describe('decideResult (scoring de consistencia eventual)', () => {
  it('pending cuando ninguna fuente tiene final', () => {
    expect(decideResult(null, null, EMPTY)).toEqual({ action: 'pending' })
  })

  it('solo Varzesh3 → escribe PROVISIONAL', () => {
    expect(decideResult(null, { h: 2, a: 1 }, EMPTY)).toEqual({
      action: 'write',
      target: { h: 2, a: 1 },
      status: 'provisional',
    })
  })

  it('football-data presente → escribe CONFIRMED (prioridad sobre Varzesh3)', () => {
    expect(decideResult({ h: 2, a: 1 }, { h: 9, a: 9 }, EMPTY)).toEqual({
      action: 'write',
      target: { h: 2, a: 1 },
      status: 'confirmed',
    })
  })

  it('provisional ya escrito con mismo marcador → alreadyOk', () => {
    expect(decideResult(null, { h: 2, a: 1 }, { home: 2, away: 1, status: 'provisional' })).toEqual({
      action: 'alreadyOk',
    })
  })

  it('provisional en BD + football-data confirma mismo marcador → confirm (flip de estado)', () => {
    expect(decideResult({ h: 2, a: 1 }, { h: 2, a: 1 }, { home: 2, away: 1, status: 'provisional' })).toEqual({
      action: 'confirm',
      status: 'confirmed',
    })
  })

  it('provisional en BD + football-data DIFIERE → reescribe CONFIRMED (corrección)', () => {
    expect(decideResult({ h: 3, a: 1 }, { h: 2, a: 1 }, { home: 2, away: 1, status: 'provisional' })).toEqual({
      action: 'write',
      target: { h: 3, a: 1 },
      status: 'confirmed',
    })
  })

  it('no degrada un confirmado: mismo marcador ya confirmado → alreadyOk', () => {
    expect(decideResult(null, { h: 2, a: 1 }, { home: 2, away: 1, status: 'confirmed' })).toEqual({
      action: 'alreadyOk',
    })
  })
})
