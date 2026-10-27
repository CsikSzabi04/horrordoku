import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { Op, OpEnvelope } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'
import { createBoardController } from './controller'
import { nextHint } from './hints'

const p = JSON.parse(readFileSync('src/engine/fixtures/midnight-mass.json', 'utf8')) as Puzzle
const env = (op: Op, id = 'e1'): OpEnvelope => ({ id, by: 'u2', seq: 1, at: 0, op })

describe('BoardController', () => {
  it('helyi művelet sugároz; a távoli (applyRemote) NEM, és idempotens', () => {
    const c = createBoardController(p)
    const sent = vi.fn()
    c.onLocalOp(sent)
    expect(c.act({ op: 'place', char: 'vlad', cell: 'E1' })).toBeNull()
    expect(sent).toHaveBeenCalledTimes(1)
    c.applyRemote(env({ op: 'place', char: 'silas', cell: 'B2' }))
    c.applyRemote(env({ op: 'place', char: 'silas', cell: 'B2' }))
    expect(sent).toHaveBeenCalledTimes(1)
    expect(c.getState().placed).toEqual({ vlad: 'E1', silas: 'B2' })
  })
  it('érvénytelen helyi művelet hibát ad, nem sugároz', () => {
    const c = createBoardController(p)
    const sent = vi.fn()
    c.onLocalOp(sent)
    expect(c.act({ op: 'place', char: 'vlad', cell: 'A4' })).toBe('blocked_object')
    expect(sent).not.toHaveBeenCalled()
  })
  it('visszavonás és újra: az inverz is sugárzott művelet', () => {
    const c = createBoardController(p)
    const sent: Op[] = []
    c.onLocalOp((o) => sent.push(o))
    c.act({ op: 'mark', cell: 'C3', on: true })
    c.act({ op: 'place', char: 'vlad', cell: 'E1' })
    c.act({ op: 'move', char: 'vlad', to: 'D1' })
    expect(c.getState().placed.vlad).toBe('D1')
    c.undo()
    expect(c.getState().placed.vlad).toBe('E1')
    c.undo()
    expect(c.getState().placed).toEqual({})
    expect(c.view().canRedo).toBe(true)
    c.redo()
    expect(c.getState().placed.vlad).toBe('E1')
    c.act({ op: 'place', char: 'silas', cell: 'B2' })
    expect(c.view().canRedo).toBe(false)
    expect(sent.length).toBeGreaterThan(4)
  })
  it('lerakáskor a karakter betű-jegyzetei mindenhonnan lekerülnek, a visszavonás mindet visszaadja', () => {
    const c = createBoardController(p)
    c.act({ op: 'note', cell: 'B4', chars: ['vlad'] })
    c.act({ op: 'note', cell: 'C3', chars: ['vlad', 'silas'] })
    c.act({ op: 'note', cell: 'E5', chars: ['lilith'] })
    c.act({ op: 'place', char: 'vlad', cell: 'E1' })
    expect(c.getState().notes).toEqual({ C3: ['silas'], E5: ['lilith'] })
    c.undo()
    expect(c.getState().placed).toEqual({})
    expect(c.getState().notes).toEqual({ B4: ['vlad'], C3: ['vlad', 'silas'], E5: ['lilith'] })
    c.redo()
    expect(c.getState().notes).toEqual({ C3: ['silas'], E5: ['lilith'] })
  })
  it('a távoli lerakás ugyanígy lekerül a jegyzetekről (közös tábla)', () => {
    const c = createBoardController(p)
    c.act({ op: 'note', cell: 'C3', chars: ['silas', 'vlad'] })
    c.applyRemote(env({ op: 'place', char: 'silas', cell: 'B2' }, 'r1'))
    expect(c.getState().notes).toEqual({ C3: ['vlad'] })
  })
  it('teljes törlés egyetlen lépésben visszavonható', () => {
    const c = createBoardController(p)
    c.act({ op: 'place', char: 'vlad', cell: 'E1' })
    c.act({ op: 'place', char: 'silas', cell: 'B2' })
    c.act({ op: 'mark', cell: 'C5', on: true })
    c.act({ op: 'note', cell: 'D3', chars: ['lilith', 'abel'] })
    const sent: Op[] = []
    c.onLocalOp((o) => sent.push(o))
    expect(c.clearAll()).toBeNull()
    expect(c.getState()).toEqual({ placed: {}, marks: [], notes: {} })
    expect(sent).toHaveLength(4)
    c.undo()
    expect(c.getState()).toEqual({ placed: { vlad: 'E1', silas: 'B2' }, marks: ['C5'], notes: { D3: ['lilith', 'abel'] } })
    c.redo()
    expect(c.getState().placed).toEqual({})
    expect(c.clearAll()).toBeNull() // üresen nincs mit törölni
  })
  it('eltűnt tárgy: zárolt mező; szövegcsere lejár; némítás tilt', () => {
    vi.useFakeTimers()
    const c = createBoardController(p)
    c.setSelf('me')
    c.applyFx({ type: 'object_vanish', cell: 'B6', ms: 1000 })
    // csapda-mező: amíg a tárgy nincs ott, a mező szabadnak látszik — lerakható, de „trap” jelzéssel (a társak is elfogadják)
    const sent: Op[] = []
    c.onLocalOp((o) => sent.push(o))
    expect(c.act({ op: 'place', char: 'abel', cell: 'B6' })).toBeNull()
    expect(sent[0]).toEqual({ op: 'place', char: 'abel', cell: 'B6', trap: true })
    expect(c.getState().placed.abel).toBe('B6')
    vi.advanceTimersByTime(1100)
    // a visszatéréskor minden törlődik a mezőről, és a mező zárolt
    expect(c.getState().placed.abel).toBeUndefined()
    expect(c.view().locked).toEqual(['B6'])
    expect(c.act({ op: 'place', char: 'abel', cell: 'B6' })).toBe('vanished_cell')
    expect(c.act({ op: 'mark', cell: 'B6', on: true })).toBe('vanished_cell')
    c.applyFx({ type: 'clue_override', char: 'vlad', text: 'hamis', ms: 500 })
    expect(c.view().clueOverrides.vlad).toBe('hamis')
    vi.advanceTimersByTime(600)
    expect(c.view().clueOverrides.vlad).toBeUndefined()
    c.applyFx({ type: 'silenced', userId: 'me', ms: 300 })
    expect(c.act({ op: 'mark', cell: 'C5', on: true })).toBe('power_violation')
    vi.advanceTimersByTime(400)
    expect(c.act({ op: 'mark', cell: 'C5', on: true })).toBeNull()
    c.destroy()
    vi.useRealTimers()
  })
  it('tipp: 1. nyom, 2. helyiség, 3. a helyére teszi (a rossz ütköző karaktert leveszi)', () => {
    const c = createBoardController(p)
    c.act({ op: 'place', char: 'silas', cell: 'C2' }) // rossz hely, a B2 sorában
    const h1 = nextHint(p, c.getState(), 1, 'silas')!
    expect(h1.text).toContain('Silas')
    const h2 = nextHint(p, c.getState(), 2, 'silas')!
    expect(h2.room).toBe('K')
    const h3 = nextHint(p, c.getState(), 3, 'abel')!
    for (const op of h3.ops!) expect(c.act(op)).toBeNull()
    expect(c.getState().placed.abel).toBe(p.solution.abel)
  })
})
