// Együtt mód (B5, GDD 22.1–22.2): a közös tábla szinkronja és a közös beküldés. Hálózat nélkül tesztelhető: a `RoomSession` ops-részét használja.
//
// Szinkron: minden művelet boríték (id, by, seq = Lamport-számláló). A naplót (seq, by, id) szerinti TELJES SORRENDBEN tartjuk;
// ha egy művelet sorrenden kívül érkezik, a táblát az alap-állapotból újrajátsszuk — így mindenki ugyanarra az állapotra jut,
// akármilyen sorrendben érkeznek az üzenetek (a motor elutasított műveleteit mindenhol ugyanúgy dobjuk el).
// Pillanatkép = (alap-állapot + a teljes napló): a sorrendet is átadja, ezért a későn érkező is pontosan ugyanarra jut. A régi (3 percnél
// idősebb) műveleteket az alap-állapotba olvasztjuk. Biztonsági háló: a host időnként kivonatot küld, az eltérő kliens teljes pillanatképet kér;
// a host (2 mp tétlenség után) a `save_room_state`-tel menti az állapotot (újrabelépéshez).
import { boardEngine } from '../engine'
import type { CellId, CharId, Unsubscribe, Uuid } from '../shared/base'
import type { BoardState, Op, OpEnvelope } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'
import type { RoomSession } from '../shared/room'
import type { GameBoard } from './controller'
import { isBoardState, isEnvelopeLog } from './validate'

export const VOTE_MS = 10_000
export const HINTS_PER_PLAYER = 3
const SAVE_DELAY_MS = 2000
const DIGEST_MS = 10_000
const QUIET_MS = 1500
const FOLD_MS = 180_000
const FRESH_MS = 30_000
const MAX_SNAP_BYTES = 180_000

export interface Proposal {
  id: string
  by: Uuid
  deadlineAt: number
}
export interface CoopResult {
  correct: boolean
  by: Uuid
}

export interface CoopOptions {
  session: Pick<RoomSession, 'ops' | 'cursors' | 'members'>
  board: GameBoard
  puzzle: Puzzle
  meId: Uuid
  isHost: () => boolean
  /** A host azonosítója: a pillanatképet és a kivonatot csak tőle fogadjuk el (nélküle bárkitől — csak tesztben). */
  hostId?: () => Uuid | null
  /** A betöltött pillanatkép verziója (a mentéshez). */
  rev?: number
  now?: () => number
}

export interface CoopSync {
  /** Közös beküldés kezdeményezése. `false`, ha már van függő javaslat. */
  propose(): boolean
  vote(approve: boolean): void
  hasVoted(): boolean
  proposal(): Proposal | null
  onProposal(cb: (p: Proposal | null) => void): Unsubscribe
  onResult(cb: (r: CoopResult) => void): Unsubscribe
  onRejected(cb: () => void): Unsubscribe
  hintsUsed(): number
  canHint(members: number): boolean
  noteHint(): void
  onHints(cb: (used: number, by: Uuid | null) => void): Unsubscribe
  /** Ki rakta le utoljára az egyes karaktereket (a Gyilkos-mód „Névvel mutatott lerakások” opciójához). */
  placers?(): Record<CharId, Uuid>
  destroy(): void
}

const cmp = (a: OpEnvelope, b: OpEnvelope): number => a.seq - b.seq || (a.by < b.by ? -1 : a.by > b.by ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Az állapot rövid, sorrendfüggetlen kivonata (a host és a kliensek összevetéséhez). */
export function stateHash(s: BoardState): string {
  const canon = JSON.stringify([
    Object.entries(s.placed).sort(([a], [b]) => (a < b ? -1 : 1)),
    [...s.marks].sort(),
    Object.entries(s.notes)
      .map(([c, ch]) => [c, [...ch].sort()] as const)
      .filter(([, ch]) => ch.length > 0)
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  ])
  let h = 0x811c9dc5
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export function createCoopSync(o: CoopOptions): CoopSync {
  const { session, board, puzzle, meId } = o
  const now = o.now ?? Date.now
  const offs: Unsubscribe[] = []
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
    return t
  }

  // ---------- a tábla: teljes sorrendű napló + újrajátszás
  let base: BoardState = board.getState()
  let log: OpEnvelope[] = []
  const ids = new Set<string>()
  let lastActivity = 0
  let rev = o.rev ?? 0

  /** A visszatért (zárolt) Eltüntetés-mezők tartalma mindenhonnan törlődik — az újrajátszás is ugyanarra jut, mint a helyi tábla. */
  const purgeSealed = (st: BoardState): BoardState => {
    let out = st
    for (const cell of board.view().locked) {
      const r = boardEngine.apply(puzzle, out, { op: 'erase', cell })
      if (r.ok) out = r.state
    }
    return out
  }
  const replay = (): BoardState => {
    let st = base
    for (const e of log) {
      const r = boardEngine.apply(puzzle, st, e.op)
      if (r.ok) st = r.state
    }
    return purgeSealed(st)
  }
  const insert = (env: OpEnvelope): boolean => {
    // igaz, ha a napló végére került (nem kell újrajátszani)
    let i = log.length
    while (i > 0 && cmp(log[i - 1]!, env) > 0) i--
    log.splice(i, 0, env)
    return i === log.length - 1
  }

  // ki rakta le utoljára (a művelet beérkezésének sorrendjében; a táblán nem látható karakterek kiesnek)
  const placedBy = new Map<CharId, Uuid>()
  const track = (op: Op, by: Uuid) => {
    if (op.op === 'place' || op.op === 'move') placedBy.set(op.char, by)
    else if (op.op === 'unplace') placedBy.delete(op.char)
  }

  offs.push(
    board.onLocalOp((op: Op) => {
      const env = session.ops.send(op)
      track(op, meId)
      if (ids.has(env.id)) return
      ids.add(env.id)
      if (!insert(env)) board.syncState(replay()) // azonos seq-nél a kisebb `by` megelőzheti
      activity()
    }),
  )
  offs.push(
    session.ops.onOp((env) => {
      if (ids.has(env.id)) return
      ids.add(env.id)
      track(env.op, env.by)
      const atEnd = insert(env)
      if (atEnd) board.applyRemote(env)
      else board.syncState(replay())
      activity()
    }),
  )

  // ---------- kurzorok és tagok
  offs.push(session.cursors.onCursor((userId, cell: CellId | null) => board.setPeerCursor(userId, cell)))
  offs.push(board.onLocalCursor((cell) => session.cursors.send(cell)))

  // ---------- pillanatkép: kérés, adás, mentés
  const adopt = (snapBase: BoardState, snapLog: OpEnvelope[]) => {
    const inSnap = new Set(snapLog.map((e) => e.id))
    // a saját, még friss műveleteim, amelyek a hostnál (még) nincsenek meg, nem veszhetnek el
    const mine = log.filter((e) => !inSnap.has(e.id) && now() - e.at < FRESH_MS)
    base = snapBase
    log = [...snapLog, ...mine].sort(cmp)
    for (const e of snapLog) ids.add(e.id)
    board.syncState(replay())
  }
  const sendSnap = (to: Uuid) => {
    let payload: Record<string, unknown> = { to, base: base as unknown as Record<string, unknown>, log: log as unknown as Record<string, unknown> }
    // túl hosszú napló esetén a teljes jelenlegi állapotot küldjük alapként (extrém hosszú játék): a sorrend-információ ilyenkor elvész
    if (JSON.stringify(payload).length > MAX_SNAP_BYTES) payload = { to, base: board.getState() as unknown as Record<string, unknown>, log: [] }
    session.ops.broadcast('snap', payload)
  }
  /** A 3 percnél régebbi, teljesen sorba rendezett műveleteket az alap-állapotba olvasztjuk (a napló ne nőjön végtelenül). */
  const fold = () => {
    const cut = now() - FOLD_MS
    let n = 0
    while (n < log.length && log[n]!.at < cut) n++
    if (n === 0) return
    let st = base
    for (const e of log.slice(0, n)) {
      const r = boardEngine.apply(puzzle, st, e.op)
      if (r.ok) st = r.state
    }
    base = st
    log = log.slice(n)
  }
  /** Igaz, ha az üzenet a hosttól jön (vagy nincs megadva host-azonosító — tesztben). */
  const fromHost = (by: Uuid): boolean => {
    const h = o.hostId?.()
    return h === undefined || h === by
  }
  offs.push(
    session.ops.onBroadcast('hello', (_p, by) => {
      if (o.isHost()) sendSnap(by)
    }),
    session.ops.onBroadcast('need', (_p, by) => {
      if (o.isHost()) sendSnap(by)
    }),
    session.ops.onBroadcast('snap', (p, by) => {
      if (p.to !== meId || !fromHost(by)) return
      // idegen adat: alak- és méret-ellenőrzés, hamis / hibás pillanatképet nem fogadunk el
      if (!isBoardState(p.base) || !isEnvelopeLog(p.log ?? [])) return
      adopt(p.base, (p.log as OpEnvelope[] | undefined) ?? [])
    }),
  )
  let mismatches = 0
  offs.push(
    session.ops.onBroadcast('dig', (p, by) => {
      if (o.isHost() || !fromHost(by) || typeof p.h !== 'string') return
      if (stateHash(board.getState()) === p.h) {
        mismatches = 0
        return
      }
      // úton lévő művelet miatti eltérést nem javítunk: csak két egymás utáni, nyugodt kivonat-eltérésnél kérünk teljes állapotot
      if (now() - lastActivity < QUIET_MS) return
      if (++mismatches >= 2) {
        mismatches = 0
        session.ops.broadcast('need', {})
      }
    }),
  )
  const digestTimer = setInterval(() => {
    fold()
    if (o.isHost()) session.ops.broadcast('dig', { h: stateHash(board.getState()) })
  }, DIGEST_MS)

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  function activity() {
    lastActivity = now()
    if (!o.isHost()) return
    clearTimeout(saveTimer)
    saveTimer = later(SAVE_DELAY_MS, () => {
      void (async () => {
        const st = board.getState()
        let r = await session.ops.saveState(rev, st)
        if (!r.ok) {
          // verzió-ütközés (pl. host-váltás után): a mentett verzió lekérése, majd egyszeri újrapróbálás
          const cur = await session.ops.loadState()
          if (cur.ok) {
            rev = cur.value.rev
            r = await session.ops.saveState(rev, st)
          }
        }
        if (r.ok) rev = r.value
      })()
    })
  }

  // ---------- tippek: a szobának közös tippkerete van (játékosonként 3)
  let hints = 0
  const hintsBy = new Map<Uuid, number>()
  const hintCbs = new Set<(used: number, by: Uuid | null) => void>()
  offs.push(
    session.ops.onBroadcast('hint', (_p, by) => {
      // játékosonként legfeljebb 3 tipp számít (egy hamisító társ ne tudja kimeríteni a közös keretet)
      const n = (hintsBy.get(by) ?? 0) + 1
      if (n > HINTS_PER_PLAYER) return
      hintsBy.set(by, n)
      hints++
      hintCbs.forEach((cb) => cb(hints, by))
    }),
  )

  // ---------- közös beküldés: javaslat → szavazás (10 mp) → a javaslattevő kliense ellenőrzi és közli az eredményt
  let current: Proposal | null = null
  let tally: { yes: Set<Uuid>; no: Set<Uuid> } | null = null
  let voted = false
  let finalTimer: ReturnType<typeof setTimeout> | undefined
  const propCbs = new Set<(p: Proposal | null) => void>()
  const resultCbs = new Set<(r: CoopResult) => void>()
  const rejectCbs = new Set<() => void>()
  const setProposal = (p: Proposal | null) => {
    current = p
    voted = false
    propCbs.forEach((cb) => cb(p))
  }
  const online = () => Math.max(1, session.members().filter((m) => m.online).length)

  function settle(approved: boolean) {
    if (!current || current.by !== meId) return
    const id = current.id
    clearTimeout(finalTimer)
    tally = null
    setProposal(null)
    if (!approved) {
      session.ops.broadcast('result', { id, rejected: true })
      rejectCbs.forEach((cb) => cb())
      return
    }
    const st = board.getState()
    const correct = boardEngine.isComplete(puzzle, st) && boardEngine.check(puzzle, st).correct
    session.ops.broadcast('result', { id, correct })
    resultCbs.forEach((cb) => cb({ correct, by: meId }))
  }
  function evaluate(final: boolean) {
    if (!tally || !current || current.by !== meId) return
    const n = online()
    const yes = tally.yes.size
    const no = tally.no.size
    if (yes * 2 > n) return settle(true) // többség a javaslat mellett
    if ((n - no) * 2 <= n) return settle(false) // a többség már nem jöhet össze
    if (final) settle(yes > no) // lejárt az idő: ha senki sem tiltakozik (vagy többen vannak mellette), megy
  }
  offs.push(
    session.ops.onBroadcast('propose', (p, by) => {
      const id = String(p.id)
      const deadlineAt = Number(p.deadlineAt)
      // érvénytelen azonosító / határidő, vagy már van függő javaslat: a másik javaslatát nem írjuk felül
      if (id.length === 0 || id.length > 64 || !Number.isFinite(deadlineAt) || deadlineAt > now() + VOTE_MS + 5000 || deadlineAt < now() - 5000) return
      if (current && current.deadlineAt + 2000 > now()) return
      setProposal({ id, by, deadlineAt })
      // ha a javaslattevő eltűnik, a javaslat magától lejár
      later(Math.max(0, deadlineAt - now()) + 2000, () => {
        if (current?.id === id) setProposal(null)
      })
    }),
    session.ops.onBroadcast('vote', (p, by) => {
      if (!tally || !current || current.id !== p.id || typeof p.approve !== 'boolean') return
      tally.yes.delete(by)
      tally.no.delete(by)
      ;(p.approve ? tally.yes : tally.no).add(by)
      evaluate(false)
    }),
    session.ops.onBroadcast('result', (p, by) => {
      // az eredményt csak a javaslattevő közölheti (különben bármelyik társ „helyesnek" hamisíthatná a beküldést)
      if (!current || current.id !== p.id || current.by !== by) return
      setProposal(null)
      if (p.rejected) rejectCbs.forEach((cb) => cb())
      else resultCbs.forEach((cb) => cb({ correct: p.correct === true, by }))
    }),
  )

  session.ops.broadcast('hello', {}) // csatlakozás: a host a friss állapotot küldi vissza

  return {
    propose() {
      if (current) return false
      const id = crypto.randomUUID()
      const deadlineAt = now() + VOTE_MS
      tally = { yes: new Set([meId]), no: new Set() }
      setProposal({ id, by: meId, deadlineAt })
      session.ops.broadcast('propose', { id, deadlineAt })
      finalTimer = later(VOTE_MS, () => evaluate(true))
      evaluate(false)
      return true
    },
    vote(approve) {
      if (!current || current.by === meId || voted) return
      voted = true
      session.ops.broadcast('vote', { id: current.id, approve })
      propCbs.forEach((cb) => cb(current))
    },
    hasVoted: () => voted,
    proposal: () => current,
    onProposal(cb) {
      propCbs.add(cb)
      return () => propCbs.delete(cb)
    },
    onResult(cb) {
      resultCbs.add(cb)
      return () => resultCbs.delete(cb)
    },
    onRejected(cb) {
      rejectCbs.add(cb)
      return () => rejectCbs.delete(cb)
    },
    placers: () => Object.fromEntries([...placedBy].filter(([ch]) => board.getState().placed[ch] !== undefined)),
    hintsUsed: () => hints,
    canHint: (members) => hints < members * HINTS_PER_PLAYER,
    noteHint() {
      hints++
      session.ops.broadcast('hint', {})
      hintCbs.forEach((cb) => cb(hints, null))
    },
    onHints(cb) {
      hintCbs.add(cb)
      return () => hintCbs.delete(cb)
    },
    destroy() {
      offs.forEach((off) => off())
      clearInterval(digestTimer)
      timers.forEach(clearTimeout)
      timers.clear()
      clearTimeout(finalTimer)
    },
  }
}

/** Belépéskor: a mentett pillanatkép betöltése a táblához, majd „hello” a társaknak (a host a friss állapotot küldi vissza). */
export async function loadCoopBase(session: Pick<RoomSession, 'ops'>): Promise<{ state: BoardState | undefined; rev: number }> {
  const r = await session.ops.loadState()
  if (!r.ok) return { state: undefined, rev: 0 }
  const st = r.value.state
  const valid = st && typeof st === 'object' && st.placed && typeof st.placed === 'object' && Array.isArray(st.marks)
  return { state: valid ? st : undefined, rev: r.value.rev }
}
