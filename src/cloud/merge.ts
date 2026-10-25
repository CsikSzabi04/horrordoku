// Összefésülés (GDD 17.5) — TISZTA függvények, hogy kommutatívak / idempotensek / asszociatívak legyenek (tulajdonság-tesztek: merge.test.ts).
// A kimenet nem függ az argumentumok sorrendjétől: egyenlő időbélyegnél determinisztikus döntés (JSON-összevetés) dönt.
import type { IsoTime } from '../shared/base'
import type { ProfileSnapshot, ProgressEntry, ProgressFile, RunRecord, SessionState, SessionsFile, Settings, UnlocksFile } from '../shared/storage'

const ts = (s: IsoTime) => {
  const n = Date.parse(s)
  return Number.isNaN(n) ? 0 : n
}
const laterOf = (a: IsoTime, b: IsoTime) => {
  const d = ts(a) - ts(b)
  return d > 0 ? a : d < 0 ? b : a >= b ? a : b
}
const minDef = (a: number | undefined, b: number | undefined) => (a === undefined ? b : b === undefined ? a : Math.min(a, b))
const earliest = (a: IsoTime | undefined, b: IsoTime | undefined) => (a === undefined ? b : b === undefined ? a : ts(a) < ts(b) ? a : ts(b) < ts(a) ? b : a < b ? a : b)

/** Az újabb `updatedAt` nyer; egyenlőségnél a JSON-ja szerint nagyobb (determinisztikus, sorrendfüggetlen). */
function newer<T extends { updatedAt: IsoTime }>(a: T, b: T): T {
  const d = ts(a.updatedAt) - ts(b.updatedAt)
  if (d !== 0) return d > 0 ? a : b
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b
}

/** Egy katalógus-pálya haladása: solved=VAGY, bestMs=MIN, hints a legjobb idejű futásé, wrongSubmits=MAX. */
export function mergeEntry(a: ProgressEntry, b: ProgressEntry): ProgressEntry {
  let bestMs: number | undefined
  let hints: number | undefined
  if (a.bestMs !== undefined && b.bestMs !== undefined) {
    bestMs = Math.min(a.bestMs, b.bestMs)
    hints = a.bestMs < b.bestMs ? a.hints : b.bestMs < a.bestMs ? b.hints : minDef(a.hints, b.hints)
  } else if (a.bestMs !== undefined || b.bestMs !== undefined) {
    const s = a.bestMs !== undefined ? a : b
    bestMs = s.bestMs
    hints = s.hints
  } else {
    hints = minDef(a.hints, b.hints)
  }
  const first = earliest(a.firstSolvedAt, b.firstSolvedAt)
  return {
    solved: a.solved || b.solved,
    ...(bestMs !== undefined ? { bestMs } : {}),
    ...(hints !== undefined ? { hints } : {}),
    wrongSubmits: Math.max(a.wrongSubmits, b.wrongSubmits),
    ...(first !== undefined ? { firstSolvedAt: first } : {}),
  }
}

const runOrder = (x: RunRecord, y: RunRecord) => ts(y.at) - ts(x.at) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0)

export function mergeProgress(a: ProgressFile, b: ProgressFile): ProgressFile {
  const puzzles: ProgressFile['puzzles'] = {}
  for (const ref of new Set([...Object.keys(a.puzzles), ...Object.keys(b.puzzles)])) {
    const x = a.puzzles[ref]
    const y = b.puzzles[ref]
    puzzles[ref] = x && y ? mergeEntry(x, y) : (x ?? y)!
  }
  const byId = new Map<string, RunRecord>()
  for (const r of [...a.recentRuns, ...b.recentRuns]) if (!byId.has(r.id)) byId.set(r.id, r)
  return { v: 1, updatedAt: laterOf(a.updatedAt, b.updatedAt), puzzles, recentRuns: [...byId.values()].sort(runOrder).slice(0, 20) }
}

/** Félbehagyott játék: amelyik `updatedAt`-je újabb. */
export function mergeSessions(a: SessionsFile, b: SessionsFile): SessionsFile {
  const sessions: Record<string, SessionState> = {}
  for (const ref of new Set([...Object.keys(a.sessions), ...Object.keys(b.sessions)])) {
    const x = a.sessions[ref]
    const y = b.sessions[ref]
    sessions[ref] = x && y ? newer(x, y) : (x ?? y)!
  }
  return { v: 1, sessions }
}

/** Feloldások: a két halmaz egyesítése (azonos elemnél a korábbi időbélyeg marad). */
export function mergeUnlocks(a: UnlocksFile, b: UnlocksFile): UnlocksFile {
  const map = new Map<string, UnlocksFile['items'][number]>()
  for (const it of [...a.items, ...b.items]) {
    const k = `${it.kind}:${it.id}`
    const cur = map.get(k)
    if (!cur || ts(it.at) < ts(cur.at) || (ts(it.at) === ts(cur.at) && it.at < cur.at)) map.set(k, it)
  }
  const items = [...map.entries()].sort(([ka, a2], [kb, b2]) => ts(a2.at) - ts(b2.at) || (ka < kb ? -1 : ka > kb ? 1 : 0)).map(([, v]) => v)
  return { v: 1, items }
}

/** Beállítások / profil (XP, érme, széria, becenév, avatár): az újabb `updatedAt` nyer. */
export const mergeSettings = (a: Settings, b: Settings): Settings => newer(a, b)
export const mergeProfile = (a: ProfileSnapshot, b: ProfileSnapshot): ProfileSnapshot => newer(a, b)

/**
 * Vendég → fiók: a vendég „a másik gép" (17.5/5.), DE a vendég-profil üres nevű és 0-ról indul, ezért a puszta „újabb nyer" a fiók XP-jét
 * eltörölhetné. Ezért itt: becenév/avatár/id a fiókból; xp, érme és rekord-széria a NAGYOBB; a széria és az utolsó napi ügy az újabbé.
 * (A GDD-től való eltérés — lásd docs/handoff/B.md.)
 */
export function mergeGuestProfile(guest: ProfileSnapshot, account: ProfileSnapshot): ProfileSnapshot {
  const n = newer(guest, account)
  return {
    ...account,
    xp: Math.max(guest.xp, account.xp),
    coins: Math.max(guest.coins, account.coins),
    bestStreak: Math.max(guest.bestStreak, account.bestStreak),
    streak: n.streak,
    ...(n.lastDaily !== undefined ? { lastDaily: n.lastDaily } : {}),
    updatedAt: laterOf(guest.updatedAt, account.updatedAt),
  }
}
