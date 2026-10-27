import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../cloud/result'
import type { Unsubscribe } from '../shared/base'
import type { Op, OpEnvelope } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'
import type { KillerState, KillerSubmitEvent } from '../shared/room'
import { createBoardController } from './controller'
import { createKillerSync } from './killer'

const puzzle = JSON.parse(readFileSync('puzzles/classic/classic-1-01-flower-store.json', 'utf8')) as Puzzle
const ME = 'me'

/** Kamu KillerSession: a szerver-események kézzel adhatók be, a hívásokat rögzíti. */
function fakeKiller() {
  const submitCbs = new Set<(e: KillerSubmitEvent) => void>()
  const stateCbs = new Set<(s: KillerState) => void>()
  let state: KillerState | null = null
  const calls: string[] = []
  const killer = {
    state: () => state,
    onState: (cb: (s: KillerState) => void): Unsubscribe => (stateCbs.add(cb), () => stateCbs.delete(cb)),
    onSubmit: (cb: (e: KillerSubmitEvent) => void): Unsubscribe => (submitCbs.add(cb), () => submitCbs.delete(cb)),
    serverNow: () => Date.now(),
    proposeSubmit: async () => (calls.push('propose'), ok(undefined)),
    voteSubmit: async (a: boolean) => (calls.push(`vote:${a}`), ok(undefined)),
    reportSubmit: async (c: boolean) => (calls.push(`report:${c}`), ok(undefined)),
  }
  return {
    killer,
    calls,
    emit: (e: KillerSubmitEvent) => submitCbs.forEach((cb) => cb(e)),
    setState: (s: KillerState) => {
      state = s
      stateCbs.forEach((cb) => cb(s))
    },
  }
}

const session = {
  members: () => [{ userId: ME, username: 'me', avatar: 'x', color: '#fff', online: true }],
  ops: {
    send: (op: Op): OpEnvelope => ({ id: `${Math.random()}`, by: ME, seq: 1, at: Date.now(), op }),
    onOp: (): Unsubscribe => () => undefined,
    saveState: async () => ok(1),
    loadState: async () => ok({ rev: 0, state: { placed: {}, marks: [], notes: {} } }),
    broadcast: () => undefined,
    onBroadcast: (): Unsubscribe => () => undefined,
  },
  cursors: { send: () => undefined, onCursor: (): Unsubscribe => () => undefined },
}

const make = () => {
  const f = fakeKiller()
  const board = createBoardController(puzzle)
  const sync = createKillerSync({ session: session as never, board, puzzle, meId: ME, isHost: () => false, killer: f.killer as never })
  return { ...f, board, sync }
}
const flush = () => vi.advanceTimersByTimeAsync(500)

describe('Gyilkos mód: a beküldés a szerveren megy (CoopSync-felület)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('javaslat: a szerverre megy, kétszer nem; a visszhang után látszik, szavazni egyszer lehet', async () => {
    const t = make()
    const seen: (string | null)[] = []
    t.sync.onProposal((p) => seen.push(p?.id ?? null))
    expect(t.sync.propose()).toBe(true)
    expect(t.sync.propose()).toBe(false) // a visszhang előtt sem küldünk másodikat
    await flush()
    expect(t.calls).toEqual(['propose'])
    t.emit({ state: 'proposal', id: 'p1', by: 'other', endsAt: Date.now() + 15000 })
    expect(seen).toEqual(['p1'])
    expect(t.sync.proposal()?.by).toBe('other')
    t.sync.vote(true)
    t.sync.vote(false) // egy szavazat
    await flush()
    expect(t.calls).toEqual(['propose', 'vote:true'])
    expect(t.sync.hasVoted()).toBe(true)
  })

  it('ellenőrzés: minden kliens kiszámolja a tábla helyességét és jelenti — üres tábla: helytelen', async () => {
    const t = make()
    t.emit({ state: 'verify', id: 'p1', by: 'other', endsAt: Date.now() + 10000 })
    expect(t.sync.verifying()).toBe(true)
    await flush()
    expect(t.calls).toEqual(['report:false'])
    t.emit({ state: 'verify', id: 'p1', by: 'other' })
    await flush()
    expect(t.calls).toHaveLength(1) // ugyanarra a javaslatra egyszer jelent
  })

  it('ellenőrzés: a megoldott tábla „helyes”-nek számít', async () => {
    const t = make()
    for (const [char, cell] of Object.entries(puzzle.solution)) expect(t.board.act({ op: 'place', char, cell })).toBeNull()
    t.emit({ state: 'verify', id: 'p2', by: 'other' })
    await flush()
    expect(t.calls).toEqual(['report:true'])
  })

  it('az eredmény-események: helyes / helytelen → onResult, elutasítva → onRejected; a javaslat lezárul', async () => {
    const t = make()
    const results: boolean[] = []
    let rejected = 0
    t.sync.onResult((r) => results.push(r.correct))
    t.sync.onRejected(() => rejected++)
    t.emit({ state: 'proposal', id: 'a', by: 'x', endsAt: Date.now() + 1000 })
    t.emit({ state: 'wrong', id: 'a', by: 'x', livesLeft: 1 })
    t.emit({ state: 'proposal', id: 'b', by: 'x', endsAt: Date.now() + 1000 })
    t.emit({ state: 'rejected', id: 'b', by: 'x' })
    t.emit({ state: 'proposal', id: 'c', by: 'x', endsAt: Date.now() + 1000 })
    t.emit({ state: 'correct', id: 'c', by: 'x' })
    expect(results).toEqual([false, true])
    expect(rejected).toBe(1)
    expect(t.sync.proposal()).toBeNull()
    expect(t.sync.verifying()).toBe(false)
    expect(t.sync.propose()).toBe(true) // lezárult: újra lehet javasolni
  })

  it('az állapot a végső igazság: újracsatlakozáskor a függő javaslat és az ellenőrzés is helyreáll', async () => {
    const t = make()
    t.setState({ running: true, now: Date.now(), submit: { id: 's1', by: 'x', phase: 'vote', endsAt: Date.now() + 8000, voted: false } })
    expect(t.sync.proposal()?.id).toBe('s1')
    expect(t.sync.hasVoted()).toBe(false)
    t.setState({ running: true, now: Date.now(), submit: { id: 's1', by: 'x', phase: 'verify', endsAt: Date.now() + 5000, voted: false } })
    expect(t.sync.proposal()).toBeNull()
    expect(t.sync.verifying()).toBe(true)
    await flush()
    expect(t.calls).toEqual(['report:false']) // még nem jelentettem → jelentek
    t.setState({ running: true, now: Date.now(), submit: null })
    expect(t.sync.verifying()).toBe(false)
  })

  it('ha a jelentésemet a szerver már megkapta (voted), nem küldöm újra', async () => {
    const t = make()
    t.setState({ running: true, now: Date.now(), submit: { id: 's2', by: 'x', phase: 'verify', endsAt: Date.now() + 5000, voted: true } })
    await flush()
    expect(t.calls).toEqual([])
  })

  it('a szerver hibája eljut a felülethez (pl. hűtés), és újra lehet próbálni', async () => {
    const t = make()
    t.killer.proposeSubmit = async () => ({ ok: false as const, code: 'invalid' as const, message: 'cooldown' })
    const errors: string[] = []
    t.sync.onError((m) => errors.push(m))
    expect(t.sync.propose()).toBe(true)
    await flush()
    expect(errors).toEqual(['cooldown'])
    expect(t.sync.propose()).toBe(true) // a hiba után nem ragad be
  })

  it('a tipp-keret és a tábla-szinkron az Együtt módé marad', () => {
    const t = make()
    expect(t.sync.canHint(2)).toBe(true)
    t.sync.noteHint()
    expect(t.sync.hintsUsed()).toBe(1)
    expect(t.sync.placers?.()).toEqual({})
  })
})
