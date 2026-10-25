import { boardEngine } from '../engine'
import type { CellId, CharId, Unsubscribe, Uuid } from '../shared/base'
import type { BoardState, Op, OpEnvelope, OpError } from '../shared/board'
import type { BoardController, Peer } from '../shared/boardController'
import type { Fx } from '../shared/fx'
import type { Puzzle } from '../shared/puzzle'

/** Amit a felület lát (megváltoztathatatlan pillanatkép; minden változásnál új objektum). */
export interface BoardView {
  state: BoardState
  peers: Peer[]
  cursors: Record<Uuid, CellId | null>
  clueOverrides: Record<CharId, string>
  vanished: CellId[] // épp eltűnt tárgyak
  locked: CellId[] // visszatért, de zárolt cellák
  exposed: boolean
  silenced: boolean
  clock: { endsAt: number | null; speed: number }
  lives: number | null
  meeting: { phase: 'discuss' | 'vote' | 'result'; endsAt: number } | null
  lastFx: { fx: Fx; n: number } | null
  submitResult: { correct: boolean; n: number } | null
  canUndo: boolean
  canRedo: boolean
}

export interface GameBoard extends BoardController {
  readonly puzzle: Puzzle
  subscribe(cb: () => void): Unsubscribe
  view(): BoardView
  /** Helyi játékos művelete: ellenőrzi, alkalmazza, sugározza (`onLocalOp`), visszavonhatóvá teszi. */
  act(op: Op): OpError | null
  /** Több művelet egy visszavonási lépésként (pl. teljes törlés). */
  actMany(ops: Op[]): OpError | null
  /** Teljes törlés: minden lerakott karakter, kizárás és jegyzet — egyetlen lépésben visszavonható. */
  clearAll(): OpError | null
  undo(): void
  redo(): void
  /** A saját felhasználó (a némítás ellen). */
  setSelf(id: Uuid | null): void
  requestSubmit(): void
  /** A helyi kurzor (kijelölt mező) jelzése a társaknak (`onLocalCursor`). */
  moveCursor(cell: CellId | null): void
  destroy(): void
}

interface Entry {
  inv: Op[] // a visszavonás lépései (már fordított sorrendben)
  fwd: Op[]
}

/** A művelet inverze a MŰVELET ELŐTTI állapotból — így a visszavonás is sima, sugározható műveletekből áll. */
function inverse(before: BoardState, op: Op): Op[] {
  const restoreCell = (cell: CellId): Op[] => [
    ...(before.marks.includes(cell) ? [{ op: 'mark', cell, on: true } as Op] : []),
    ...(before.notes[cell] ? [{ op: 'note', cell, chars: before.notes[cell]! } as Op] : []),
  ]
  switch (op.op) {
    case 'place':
    case 'move': {
      const cell = op.op === 'place' ? op.cell : op.to
      const prev = before.placed[op.char]
      return [prev ? { op: 'place', char: op.char, cell: prev } : { op: 'unplace', char: op.char }, ...restoreCell(cell)]
    }
    case 'unplace':
      return before.placed[op.char] ? [{ op: 'place', char: op.char, cell: before.placed[op.char]! }] : []
    case 'mark':
      return [{ op: 'mark', cell: op.cell, on: before.marks.includes(op.cell) }]
    case 'note':
      return [{ op: 'note', cell: op.cell, chars: before.notes[op.cell] ?? [] }]
    case 'erase':
      return [
        ...Object.entries(before.placed)
          .filter(([, c]) => c === op.cell)
          .map(([char, cell]) => ({ op: 'place', char, cell }) as Op),
        ...restoreCell(op.cell),
      ]
  }
}

export function createBoardController(puzzle: Puzzle, initial?: BoardState): GameBoard {
  let state = initial ?? boardEngine.empty()
  let self: Uuid | null = null
  let n = 0
  const seen = new Set<Uuid>()
  const listeners = new Set<() => void>()
  const opCbs = new Set<(op: Op) => void>()
  const cursorCbs = new Set<(c: CellId | null) => void>()
  const submitCbs = new Set<() => void>()
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const undoStack: Entry[] = []
  const redoStack: Entry[] = []
  let v: BoardView = {
    state, peers: [], cursors: {}, clueOverrides: {}, vanished: [], locked: [], exposed: false, silenced: false,
    clock: { endsAt: null, speed: 1 }, lives: null, meeting: null, lastFx: null, submitResult: null, canUndo: false, canRedo: false,
  }
  const publish = (patch: Partial<BoardView> = {}) => {
    v = { ...v, ...patch, state, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
    listeners.forEach((cb) => cb())
  }
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const blocked = (cell: CellId) => v.vanished.includes(cell) || v.locked.includes(cell)
  const cellOf = (op: Op): CellId | null => (op.op === 'place' || op.op === 'mark' || op.op === 'note' || op.op === 'erase' ? op.cell : op.op === 'move' ? op.to : null)

  const run = (op: Op): OpError | null => {
    const c = cellOf(op)
    if (c && blocked(c)) return 'vanished_cell'
    if (v.silenced) return 'power_violation'
    const r = boardEngine.apply(puzzle, state, op)
    if (!r.ok) return r.error
    state = r.state
    return null
  }

  return {
    puzzle,
    getState: () => state,
    view: () => v,
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    act(op) {
      return this.actMany([op])
    },
    actMany(ops) {
      const invs: Op[][] = []
      const done: Op[] = []
      for (const op of ops) {
        const before = state
        const err = run(op)
        if (err) {
          if (done.length === 0) return err
          continue
        }
        invs.push(inverse(before, op))
        done.push(op)
      }
      if (done.length === 0) return null
      undoStack.push({ inv: invs.reverse().flat(), fwd: done })
      redoStack.length = 0
      publish()
      done.forEach((op) => opCbs.forEach((cb) => cb(op)))
      return null
    },
    clearAll() {
      const ops: Op[] = [
        ...Object.keys(state.placed).map((char) => ({ op: 'unplace', char }) as Op),
        ...state.marks.map((cell) => ({ op: 'mark', cell, on: false }) as Op),
        ...Object.keys(state.notes).map((cell) => ({ op: 'note', cell, chars: [] }) as Op),
      ]
      return ops.length ? this.actMany(ops) : null
    },
    undo() {
      const e = undoStack.pop()
      if (!e) return
      for (const op of e.inv) if (!run(op)) opCbs.forEach((cb) => cb(op))
      redoStack.push(e)
      publish()
    },
    redo() {
      const e = redoStack.pop()
      if (!e) return
      for (const op of e.fwd) if (!run(op)) opCbs.forEach((cb) => cb(op))
      undoStack.push(e)
      publish()
    },
    applyRemote(e: OpEnvelope) {
      if (seen.has(e.id)) return
      seen.add(e.id)
      const r = boardEngine.apply(puzzle, state, e.op)
      if (r.ok) {
        state = r.state
        publish()
      }
    },
    onLocalOp(cb) {
      opCbs.add(cb)
      return () => opCbs.delete(cb)
    },
    setState(s) {
      state = s
      undoStack.length = 0
      redoStack.length = 0
      publish()
    },
    setPeers: (peers) => publish({ peers }),
    setPeerCursor: (userId, cell) => publish({ cursors: { ...v.cursors, [userId]: cell } }),
    onLocalCursor(cb) {
      cursorCbs.add(cb)
      return () => cursorCbs.delete(cb)
    },
    applyFx(fx) {
      n++
      const base = { lastFx: { fx, n } }
      switch (fx.type) {
        case 'clue_override':
          publish({ ...base, clueOverrides: { ...v.clueOverrides, [fx.char]: fx.text } })
          later(fx.ms, () => {
            const rest = { ...v.clueOverrides }
            delete rest[fx.char]
            publish({ clueOverrides: rest })
          })
          return
        case 'object_vanish':
          publish({ ...base, vanished: [...v.vanished, fx.cell] })
          later(fx.ms, () => {
            for (const [id, at] of Object.entries(state.placed)) {
              const r = at === fx.cell ? boardEngine.apply(puzzle, state, { op: 'unplace', char: id }) : null
              if (r?.ok) state = r.state
            }
            publish({ vanished: v.vanished.filter((c) => c !== fx.cell), locked: [...v.locked, fx.cell] })
          })
          return
        case 'exposed':
          return publish({ ...base, exposed: true })
        case 'silenced':
          if (fx.userId !== self) return publish(base)
          publish({ ...base, silenced: true })
          later(fx.ms, () => publish({ silenced: false }))
          return
        case 'meeting':
          return publish({ ...base, meeting: { phase: fx.phase, endsAt: fx.endsAt } })
        default:
          return publish(base)
      }
    },
    setClock: (clock) => publish({ clock }),
    setLives: (lives) => publish({ lives }),
    onSubmitRequest(cb) {
      submitCbs.add(cb)
      return () => submitCbs.delete(cb)
    },
    requestSubmit: () => submitCbs.forEach((cb) => cb()),
    moveCursor: (cell) => cursorCbs.forEach((cb) => cb(cell)),
    showSubmitResult: (r) => {
      n++
      publish({ submitResult: { correct: r.correct, n } })
    },
    setSelf: (id) => {
      self = id
    },
    destroy() {
      timers.forEach(clearTimeout)
      timers.clear()
      listeners.clear()
      opCbs.clear()
      cursorCbs.clear()
      submitCbs.clear()
    },
  }
}
