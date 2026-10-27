import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { boardEngine } from '../engine'
import { buildGrid } from '../engine/grid'
import type { Unsubscribe, Uuid } from '../shared/base'
import type { BoardState, Op, OpEnvelope } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'
import type { RoomMember } from '../shared/room'
import { ok } from '../cloud/result'
import { createBoardController } from './controller'
import type { GameBoard } from './controller'
import { createCoopSync, stateHash, VOTE_MS } from './coop'
import type { CoopSync } from './coop'

const puzzle = JSON.parse(readFileSync('puzzles/classic/classic-1-01-flower-store.json', 'utf8')) as Puzzle

/** Kamu szoba: a küldött üzenetek címzettenként sorban állnak, és tetszőleges sorrendben kézbesíthetők (ez a hálózat sorrend-felcserélődését és késését modellezi). */
class Hub {
  inboxes = new Map<Uuid, (() => void)[]>()
  members: RoomMember[] = []
  clients = new Map<Uuid, Client>()
  dropNext = new Set<Uuid>()
  add(id: Uuid): Client {
    const c = new Client(this, id)
    this.clients.set(id, c)
    this.inboxes.set(id, [])
    this.members.push({ userId: id, username: id, avatar: 'x', color: '#fff', online: true })
    return c
  }
  post(from: Uuid, run: (to: Client) => void) {
    for (const [id, c] of this.clients)
      if (id !== from) {
        if (this.dropNext.has(id)) {
          this.dropNext.delete(id)
          continue
        }
        this.inboxes.get(id)!.push(() => run(c))
      }
  }
  /** `rnd`: a kézbesítés sorrendjét keveri; nélküle a beérkezés sorrendjében megy. */
  flush(rnd?: () => number) {
    for (;;) {
      const pending = [...this.inboxes.values()].filter((q) => q.length > 0)
      if (pending.length === 0) return
      const q = pending[rnd ? Math.floor(rnd() * pending.length) : 0]!
      const i = rnd ? Math.floor(rnd() * q.length) : 0
      q.splice(i, 1)[0]!()
    }
  }
}

class Client {
  lamport = 0
  opCbs = new Set<(e: OpEnvelope) => void>()
  handlers = new Map<string, Set<(p: Record<string, unknown>, by: Uuid) => void>>()
  cursorCbs = new Set<(u: Uuid, c: string | null) => void>()
  saved: { rev: number; state: BoardState }[] = []
  board!: GameBoard
  sync!: CoopSync
  constructor(
    readonly hub: Hub,
    readonly id: Uuid,
  ) {}
  session = {
    members: () => this.hub.members,
    ops: {
      send: (op: Op): OpEnvelope => {
        const env: OpEnvelope = { id: `${this.id}-${++this.lamport}-${Math.random()}`, by: this.id, seq: ++this.lamportSeq, at: Date.now(), op }
        this.hub.post(this.id, (to) => {
          to.lamportSeq = Math.max(to.lamportSeq, env.seq)
          to.opCbs.forEach((cb) => cb(env))
        })
        return env
      },
      onOp: (cb: (e: OpEnvelope) => void): Unsubscribe => {
        this.opCbs.add(cb)
        return () => this.opCbs.delete(cb)
      },
      saveState: async (rev: number, state: BoardState) => {
        this.saved.push({ rev, state })
        return ok(rev + 1)
      },
      loadState: async () => ok({ rev: 0, state: { placed: {}, marks: [], notes: {} } }),
      broadcast: (type: string, payload: Record<string, unknown>) =>
        this.hub.post(this.id, (to) => to.handlers.get(type)?.forEach((cb) => cb(JSON.parse(JSON.stringify(payload)) as Record<string, unknown>, this.id))),
      onBroadcast: (type: string, cb: (p: Record<string, unknown>, by: Uuid) => void): Unsubscribe => {
        const set = this.handlers.get(type) ?? new Set()
        this.handlers.set(type, set)
        set.add(cb)
        return () => set.delete(cb)
      },
    },
    cursors: {
      send: (cell: string | null) => this.hub.post(this.id, (to) => to.cursorCbs.forEach((cb) => cb(this.id, cell))),
      onCursor: (cb: (u: Uuid, c: string | null) => void): Unsubscribe => {
        this.cursorCbs.add(cb)
        return () => this.cursorCbs.delete(cb)
      },
    },
  }
  lamportSeq = 0
  start(isHost: boolean, initial?: BoardState) {
    this.board = createBoardController(puzzle, initial)
    this.sync = createCoopSync({ session: this.session as never, board: this.board, puzzle, meId: this.id, isHost: () => isHost })
    return this
  }
}

/** Olyan kliens, amely csak a „a” hosttól fogad pillanatképet. */
const createBoth = (hub: Hub): Client => {
  const b = hub.add('b')
  b.board = createBoardController(puzzle)
  b.sync = createCoopSync({ session: b.session as never, board: b.board, puzzle, meId: 'b', isHost: () => false, hostId: () => 'a' })
  return b
}

const rng = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
const chars = puzzle.characters.map((c) => c.id)
const cells: string[] = []
for (let r = 1; r <= puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) cells.push(`${String.fromCharCode(65 + c)}${r}`)
const randomOp = (rnd: () => number): Op => {
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)]!
  const k = rnd()
  if (k < 0.45) return { op: 'place', char: pick(chars), cell: pick(cells) }
  if (k < 0.6) return { op: 'unplace', char: pick(chars) }
  if (k < 0.75) return { op: 'move', char: pick(chars), to: pick(cells) }
  if (k < 0.88) return { op: 'mark', cell: pick(cells), on: rnd() < 0.7 }
  if (k < 0.95) return { op: 'note', cell: pick(cells), chars: [pick(chars)] }
  return { op: 'erase', cell: pick(cells) }
}

afterEach(() => vi.useRealTimers())

describe('közös tábla: szinkron', () => {
  it('3 játékos egyszerre, sorrend-felcserélődéssel is ugyanarra az állapotra jut', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rnd = rng(seed)
      const hub = new Hub()
      const cs = ['a', 'b', 'c'].map((id, i) => hub.add(id).start(i === 0))
      for (let step = 0; step < 150; step++) {
        const c = cs[Math.floor(rnd() * cs.length)]!
        c.board.act(randomOp(rnd))
        if (rnd() < 0.15) c.board.undo()
        if (rnd() < 0.25) hub.flush(rnd) // időnként minden megérkezik — de közben összevissza
      }
      hub.flush(rnd)
      const hashes = cs.map((c) => stateHash(c.board.getState()))
      expect(new Set(hashes).size, `seed ${seed}`).toBe(1)
      // a közös állapot érvényes: minden karakter legfeljebb egy helyen, egy cellán egy karakter
      const placed = Object.values(cs[0]!.board.getState().placed)
      expect(new Set(placed).size).toBe(placed.length)
    }
  })

  it('közben csatlakozó játékos és a régi műveletek beolvasztása sem rontja el az egyezést', () => {
    vi.useFakeTimers()
    for (let seed = 1; seed <= 15; seed++) {
      const rnd = rng(seed * 7)
      const hub = new Hub()
      const cs = [hub.add('a').start(true), hub.add('b').start(false)]
      for (let step = 0; step < 120; step++) {
        if (step === 40) cs.push(hub.add('c').start(false)) // fél úton csatlakozik
        if (step % 30 === 29) vi.advanceTimersByTime(70_000) // a régi műveletek 3 perc után az alapba olvadnak
        const c = cs[Math.floor(rnd() * cs.length)]!
        c.board.act(randomOp(rnd))
        if (rnd() < 0.3) hub.flush(rnd)
      }
      hub.flush(rnd)
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(10_000)
        hub.flush(rnd)
      }
      expect(new Set(cs.map((c) => stateHash(c.board.getState()))).size, `seed ${seed}`).toBe(1)
    }
  })

  it('az újracsatlakozó a hosttól kap pillanatképet', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    for (const [ch, cell] of Object.entries(puzzle.solution).slice(0, 3)) a.board.act({ op: 'place', char: ch, cell })
    a.board.act({ op: 'mark', cell: 'A1', on: true })
    hub.flush()
    // c később jön, üres táblával; a „hello”-ra a host teljes állapotot küld
    const c = hub.add('c').start(false)
    hub.flush()
    expect(stateHash(c.board.getState())).toBe(stateHash(a.board.getState()))
    expect(stateHash(b.board.getState())).toBe(stateHash(a.board.getState()))
    // és ettől kezdve a közös művelet is átmegy
    c.board.act({ op: 'mark', cell: 'B2', on: true })
    hub.flush()
    expect(a.board.getState().marks).toContain('B2')
  })

  it('elveszett üzenetet a host kivonata + pillanatkép kijavítja', () => {
    vi.useFakeTimers()
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    hub.flush()
    hub.dropNext.add('b') // b nem kapja meg a következő üzenetet
    a.board.act({ op: 'mark', cell: 'C3', on: true })
    hub.flush()
    expect(b.board.getState().marks).not.toContain('C3')
    // 2 egymás utáni nyugodt kivonat-eltérés → „need” → pillanatkép
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(10_000)
      hub.flush()
    }
    expect(b.board.getState().marks).toContain('C3')
    expect(stateHash(b.board.getState())).toBe(stateHash(a.board.getState()))
  })

  it('a host a változás után 2 mp-pel menti a pillanatképet', async () => {
    vi.useFakeTimers()
    const hub = new Hub()
    const a = hub.add('a').start(true)
    hub.add('b').start(false)
    a.board.act({ op: 'mark', cell: 'D4', on: true })
    await vi.advanceTimersByTimeAsync(2100)
    expect(a.saved).toHaveLength(1)
    expect(a.saved[0]!.state.marks).toContain('D4')
  })
})

describe('közös beküldés', () => {
  const solve = (c: Client) => {
    for (const [ch, cell] of Object.entries(puzzle.solution)) c.board.act({ op: 'place', char: ch, cell })
  }
  const results = (c: Client) => {
    const r: { correct: boolean }[] = []
    let rejected = 0
    c.sync.onResult((x) => r.push(x))
    c.sync.onRejected(() => rejected++)
    return { r, rejected: () => rejected }
  }

  it('2 játékos: a másik jóváhagyására azonnal megy, a helyes megoldás „correct”', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    const ra = results(a)
    const rb = results(b)
    solve(a)
    hub.flush()
    expect(boardEngine.isComplete(puzzle, b.board.getState())).toBe(true)
    expect(a.sync.propose()).toBe(true)
    expect(a.sync.propose()).toBe(false) // egyszerre csak egy javaslat
    hub.flush()
    expect(b.sync.proposal()?.by).toBe('a')
    b.sync.vote(true)
    hub.flush()
    expect(ra.r).toEqual([{ correct: true, by: 'a' }])
    expect(rb.r).toEqual([{ correct: true, by: 'a' }])
    expect(b.sync.proposal()).toBeNull()
  })

  it('rossz megoldásnál „correct: false” mindenkinek', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    const rb = results(b)
    const sol = Object.entries(puzzle.solution)
    // két karakter helye felcserélve
    const [c1, p1] = sol[0]!
    const [c2, p2] = sol[1]!
    for (const [ch, cell] of sol.slice(2)) a.board.act({ op: 'place', char: ch, cell })
    a.board.act({ op: 'place', char: c1, cell: p2 })
    a.board.act({ op: 'place', char: c2, cell: p1 })
    hub.flush()
    if (!boardEngine.isComplete(puzzle, a.board.getState())) return // a motor a felcserélést elutasíthatta (sor/oszlop) — akkor a teszt nem érvényes ezen a pályán
    a.sync.propose()
    hub.flush()
    b.sync.vote(true)
    hub.flush()
    expect(rb.r[0]?.correct).toBe(false)
  })

  it('a másik tiltakozik → elutasítva', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    const ra = results(a)
    const rb = results(b)
    solve(a)
    hub.flush()
    a.sync.propose()
    hub.flush()
    b.sync.vote(false)
    hub.flush()
    expect(ra.r).toEqual([])
    expect(ra.rejected()).toBe(1)
    expect(rb.rejected()).toBe(1)
    expect(a.sync.proposal()).toBeNull()
  })

  it('ha senki sem tiltakozik, 10 mp után megy', () => {
    vi.useFakeTimers()
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    const rb = results(b)
    solve(a)
    hub.flush()
    a.sync.propose()
    hub.flush()
    vi.advanceTimersByTime(VOTE_MS + 50)
    hub.flush()
    expect(rb.r).toEqual([{ correct: true, by: 'a' }])
  })

  it('3 játékos: egy igen + egy hallgat → lejáratkor megy; egy nem + egy hallgat → elutasítva', () => {
    vi.useFakeTimers()
    const run = (voteB: boolean) => {
      const hub = new Hub()
      const a = hub.add('a').start(true)
      const b = hub.add('b').start(false)
      hub.add('c').start(false)
      const ra = results(a)
      solve(a)
      hub.flush()
      a.sync.propose()
      hub.flush()
      b.sync.vote(voteB)
      hub.flush()
      vi.advanceTimersByTime(VOTE_MS + 50)
      hub.flush()
      return ra
    }
    expect(run(true).r).toEqual([{ correct: true, by: 'a' }])
    const no = run(false)
    expect(no.r).toEqual([])
    expect(no.rejected()).toBe(1)
  })

  it('a tippkeret közös: játékosonként 3', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    expect(a.sync.canHint(2)).toBe(true)
    for (let i = 0; i < 6; i++) (i % 2 ? a : b).sync.noteHint()
    hub.flush()
    expect(a.sync.hintsUsed()).toBe(6)
    expect(b.sync.hintsUsed()).toBe(6)
    expect(a.sync.canHint(2)).toBe(false)
  })
})

describe('Gyilkos-mód: az Eltüntetés csapda-mezője a közös táblán', () => {
  /** A pálya egy foglalt tárgyának mezője. */
  const blockedCell = ((): string => {
    const g = buildGrid(puzzle)
    for (let r = 0; r < puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) if (g.blocked[r]![c]) return `${String.fromCharCode(65 + c)}${r + 1}`
    throw new Error('nincs foglalt mező')
  })()

  it('a visszatéréskor mindenhol törlődik a mező tartalma, és minden kliens ugyanarra jut (összevissza kézbesítéssel is)', () => {
    vi.useFakeTimers()
    for (let seed = 1; seed <= 25; seed++) {
      const rnd = rng(seed * 13)
      const hub = new Hub()
      const cs = ['a', 'b', 'c'].map((id, i) => hub.add(id).start(i === 0))
      for (const c of cs) c.board.applyFx({ type: 'object_vanish', cell: blockedCell, ms: 2000 })
      for (let step = 0; step < 60; step++) {
        const c = cs[Math.floor(rnd() * cs.length)]!
        // a tárgy nincs ott: a mezőre is rakhatnak (csapda); közben a többi mezőn is folyik a munka
        c.board.act(rnd() < 0.5 ? { op: 'place', char: chars[Math.floor(rnd() * chars.length)]!, cell: blockedCell } : randomOp(rnd))
        if (rnd() < 0.3) hub.flush(rnd)
      }
      hub.flush(rnd)
      // a csapda-mezőn volt (legalább egy) karakter, amíg a tárgy el volt tűnve
      vi.advanceTimersByTime(2100) // a tárgy visszatér: törlődik, zárolt
      hub.flush(rnd)
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(10_000)
        hub.flush(rnd)
      }
      for (const c of cs) {
        expect(c.board.view().locked, `seed ${seed}`).toEqual([blockedCell])
        expect(Object.values(c.board.getState().placed).includes(blockedCell), `seed ${seed}: a zárolt mező üres`).toBe(false)
        expect(c.board.getState().marks.includes(blockedCell)).toBe(false)
      }
      expect(new Set(cs.map((c) => stateHash(c.board.getState()))).size, `seed ${seed}`).toBe(1)
      // a visszatért mezőre többé nem lehet rakni
      expect(cs[0]!.board.act({ op: 'place', char: chars[0]!, cell: blockedCell })).toBe('vanished_cell')
    }
  })

})

describe('hálózati hamisítás ellen', () => {
  const solve = (c: Client) => {
    for (const [ch, cell] of Object.entries(puzzle.solution)) c.board.act({ op: 'place', char: ch, cell })
  }
  const results = (c: Client) => {
    const r: { correct: boolean }[] = []
    c.sync.onResult((x) => r.push(x))
    return { r }
  }

  it('hamisítás ellen: az eredményt csak a javaslattevő közölheti, a pillanatképet csak a host', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    const c = hub.add('c').start(false)
    const rb = results(b)
    solve(a)
    hub.flush()
    a.sync.propose()
    hub.flush()
    const id = b.sync.proposal()!.id
    // c hamis „helyes” eredményt küld a javaslat nevében
    c.session.ops.broadcast('result', { id, correct: true })
    hub.flush()
    expect(rb.r).toEqual([])
    expect(b.sync.proposal()?.id).toBe(id) // a javaslat érintetlen
  })

  it('hibás vagy idegen pillanatkép / kivonat nem kerül a táblára', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = createBoth(hub)
    a.board.act({ op: 'mark', cell: 'B2', on: true })
    hub.flush()
    const before = stateHash(b.board.getState())
    // rossz alakú pillanatkép (nem tömb napló, hiányzó mezők) — nem szállhat el, és nem módosít
    for (const bad of [{ to: 'b', base: 5, log: [] }, { to: 'b', base: { placed: {}, marks: 'x', notes: {} }, log: [] }, { to: 'b', base: { placed: {}, marks: [], notes: {} }, log: 'x' }, { to: 'b', base: { placed: { amir: 7 }, marks: [], notes: {} }, log: [] }])
      a.session.ops.broadcast('snap', bad as never)
    hub.flush()
    expect(stateHash(b.board.getState())).toBe(before)
    // nem hosttól érkező, jól formált pillanatkép is eldobódik (b tudja, hogy a host „a”)
    const c = hub.add('c').start(false)
    c.session.ops.broadcast('snap', { to: 'b', base: { placed: {}, marks: [], notes: {} }, log: [] })
    hub.flush()
    expect(b.board.getState().marks).toContain('B2')
  })

  it('a hamisító társ nem meríti ki a közös tippkeretet', () => {
    const hub = new Hub()
    const a = hub.add('a').start(true)
    const b = hub.add('b').start(false)
    for (let i = 0; i < 50; i++) b.sync.noteHint()
    hub.flush()
    expect(a.sync.hintsUsed()).toBe(3) // egy játékosnál legfeljebb 3 számít
  })
})

