import { describe, expect, it } from 'vitest'
import { isBoardState, isEnvelope, isEnvelopeLog, isOp } from './validate'

const env = { id: 'e1', by: 'u1', seq: 3, at: 1, op: { op: 'place', char: 'amir', cell: 'A1' } }

describe('hálózati adat ellenőrzése', () => {
  it('érvényes műveletek és borítékok átmennek', () => {
    expect(isOp({ op: 'mark', cell: 'B2', on: true })).toBe(true)
    expect(isOp({ op: 'note', cell: 'B2', chars: ['a'] })).toBe(true)
    expect(isEnvelope(env)).toBe(true)
    expect(isEnvelopeLog([env, { ...env, id: 'e2' }])).toBe(true)
    expect(isBoardState({ placed: { amir: 'A1' }, marks: ['B2'], notes: { C3: ['a'] } })).toBe(true)
  })
  it('hibás / veszélyes alakok kiszűrődnek', () => {
    for (const bad of [null, 5, 'x', [], {}, { op: 'place' }, { op: 'place', char: 1, cell: 'A1' }, { op: 'hack', cell: 'A1' }, { op: 'mark', cell: 'A1', on: 'igen' }, { op: 'note', cell: 'A1', chars: 'x' }]) expect(isOp(bad), JSON.stringify(bad)).toBe(false)
    for (const bad of [{ ...env, seq: -1 }, { ...env, seq: 1.5 }, { ...env, seq: 1e12 }, { ...env, id: '' }, { ...env, id: 'x'.repeat(200) }, { ...env, at: NaN }, { ...env, op: null }, { ...env, by: 7 }]) expect(isEnvelope(bad), JSON.stringify(bad)).toBe(false)
    expect(isEnvelopeLog('x')).toBe(false)
    expect(isEnvelopeLog(Array.from({ length: 7000 }, () => env))).toBe(false) // túl hosszú
    expect(isBoardState({ placed: [], marks: [], notes: {} })).toBe(false)
    expect(isBoardState({ placed: { a: 3 }, marks: [], notes: {} })).toBe(false)
    expect(isBoardState({ placed: {}, marks: [1], notes: {} })).toBe(false)
    expect(isBoardState({ placed: {}, marks: [], notes: { A1: 'x' } })).toBe(false)
    expect(isBoardState({ placed: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`c${i}`, 'A1'])), marks: [], notes: {} })).toBe(false)
  })
})
