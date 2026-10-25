import type {
  ProfileSnapshot,
  ProgressFile,
  RunRecord,
  SessionsFile,
  SessionState,
  Settings,
  StorageEvent,
  StorageExport,
  StorageService,
  SyncOp,
  UnlockKind,
  UnlocksFile,
} from '../shared/storage'
import type { IsoTime, PuzzleRef, Uuid } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'
import { browserKV } from './kv'
import type { KV } from './kv'

export { browserKV, memoryKV } from './kv'
export type { KV } from './kv'

const P = 'nd:v1:'
const MAX_RANDOM_SESSIONS = 3
const MAX_RUNS = 20
const MAX_QUEUE = 500
const EVENTS: Record<string, StorageEvent['type']> = {
  settings: 'settings', progress: 'progress', sessions: 'sessions', unlocks: 'unlocks',
  profile: 'profile', 'sync-queue': 'queue', 'cache-puzzles': 'cache',
}

export interface StorageOptions {
  now?: () => IsoTime
  uuid?: () => Uuid
  /** A `html.calm` osztály kezeléséhez (Nyugodt mód). */
  doc?: { documentElement: { classList: { toggle(c: string, on: boolean): unknown } } }
  /** Több fül szinkronja (`storage` esemény). */
  win?: { addEventListener(t: 'storage', f: (e: { key: string | null }) => void): void }
}

export function createStorage(kv: KV, o: StorageOptions = {}): StorageService {
  const now = o.now ?? (() => new Date().toISOString())
  const uuid = o.uuid ?? (() => crypto.randomUUID())
  let scope = 'guest'
  const subs = new Set<(e: StorageEvent) => void>()
  const emit = (e: StorageEvent) => subs.forEach((f) => f(e))

  const key = (name: string) => (name === 'settings' ? `${P}settings` : `${P}${scope}:${name}`)

  function read<T>(k: string, def: () => T): T {
    const raw = kv.get(k)
    if (raw != null) {
      try {
        return JSON.parse(raw) as T
      } catch {
        kv.set(`${k}:corrupt`, raw) // félreteszi, nem törli
        const bak = kv.get(`${k}:bak`)
        if (bak != null) {
          try {
            const v = JSON.parse(bak) as T
            kv.set(k, bak)
            return v
          } catch {
            /* a másolat is sérült */
          }
        }
      }
    }
    return def()
  }
  function write(k: string, v: unknown) {
    const old = kv.get(k)
    if (old != null) kv.set(`${k}:bak`, old)
    kv.set(k, JSON.stringify(v))
  }

  const defSettings = (): Settings => ({
    v: 1, language: 'hu', theme: 'dark', audio: { music: 0.6, sfx: 0.8, volumeCap: 0.8 }, jumpscare: 'off',
    photosensitive: false, screenShake: true, streamerMode: false, invisible: false, updatedAt: now(),
  })
  const getSettings_ = () => ({ ...defSettings(), ...read<Partial<Settings>>(key('settings'), () => ({})) }) as Settings
  const getProgress_ = () => read<ProgressFile>(key('progress'), () => ({ v: 1, updatedAt: now(), puzzles: {}, recentRuns: [] }))
  const getSessions_ = () => read<SessionsFile>(key('sessions'), () => ({ v: 1, sessions: {} }))
  const getUnlocks_ = () => read<UnlocksFile>(key('unlocks'), () => ({ v: 1, items: [] }))
  const getProfile_ = () =>
    read<ProfileSnapshot>(key('profile'), () => ({
      v: 1, id: null, username: 'Vendég', avatar: 'candle', xp: 0, coins: 0, streak: 0, bestStreak: 0, updatedAt: now(),
    }))
  const getQueue_ = () => read<{ v: 1; ops: SyncOp[] }>(key('sync-queue'), () => ({ v: 1, ops: [] })).ops

  function enqueue(table: SyncOp['table'], k: string, kind: SyncOp['kind'], payload?: unknown) {
    let q = getQueue_().filter((x) => !(x.table === table && x.key === k)) // egy kulcsra csak a legutolsó állapot
    q.push({ id: uuid(), table, kind, key: k, payload, at: now() })
    while (q.length > MAX_QUEUE) {
      const i = q.findIndex((x) => x.table === 'runs')
      q = i >= 0 ? q.filter((_, j) => j !== i) : q.slice(1)
    }
    write(key('sync-queue'), { v: 1, ops: q })
    emit({ type: 'queue' })
  }

  function applyCalm(on: boolean) {
    kv.set('nd_calm', on ? '1' : '0')
    o.doc?.documentElement.classList.toggle('calm', on)
  }
  if (kv.get('nd_calm') === '1') o.doc?.documentElement.classList.toggle('calm', true)

  o.win?.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(P)) return
    const name = e.key.split(':').pop() ?? ''
    if (EVENTS[name]) emit({ type: EVENTS[name]! } as StorageEvent)
  })

  const ownKeys = () => kv.keys().filter((k) => k.startsWith(P))

  return {
    async setScope(s) {
      scope = s
      emit({ type: 'scope', scope: s })
    },
    scope: () => scope,

    async getSettings() {
      return getSettings_()
    },
    async patchSettings(p) {
      const s: Settings = { ...getSettings_(), ...p, updatedAt: now() }
      write(key('settings'), s)
      if ('photosensitive' in p) applyCalm(s.photosensitive)
      enqueue('user_settings', 'self', 'upsert', s)
      emit({ type: 'settings' })
      return s
    },

    async getProgress() {
      return getProgress_()
    },
    async recordRun(run: RunRecord) {
      const pr = getProgress_()
      pr.recentRuns = [run, ...pr.recentRuns].slice(0, MAX_RUNS)
      if (run.kind === 'catalog') {
        const e = pr.puzzles[run.ref] ?? { solved: false, wrongSubmits: 0 }
        e.wrongSubmits += run.wrongSubmits
        if (run.solved) {
          if (run.ms != null && (!e.solved || e.bestMs == null || run.ms < e.bestMs)) {
            e.bestMs = run.ms
            e.hints = run.hints
          }
          e.solved = true
          e.firstSolvedAt ??= run.at
        }
        pr.puzzles[run.ref] = e
        enqueue('progress', run.ref, 'upsert', e)
      }
      pr.updatedAt = now()
      write(key('progress'), pr)
      enqueue('runs', run.id, 'upsert', run)
      emit({ type: 'progress' })
    },

    async getSessions() {
      return getSessions_()
    },
    async putSession(ref: PuzzleRef, s: SessionState) {
      const f = getSessions_()
      f.sessions[ref] = s
      const random = Object.keys(f.sessions).filter((r) => r.startsWith('gen:'))
      if (random.length > MAX_RANDOM_SESSIONS) {
        const oldest = random.sort((a, b) => f.sessions[a]!.updatedAt.localeCompare(f.sessions[b]!.updatedAt))[0]!
        delete f.sessions[oldest]
        enqueue('saves', oldest, 'delete')
      }
      write(key('sessions'), f)
      enqueue('saves', ref, 'upsert', s)
      emit({ type: 'sessions' })
    },
    async deleteSession(ref) {
      const f = getSessions_()
      if (!(ref in f.sessions)) return
      delete f.sessions[ref]
      write(key('sessions'), f)
      enqueue('saves', ref, 'delete')
      emit({ type: 'sessions' })
    },

    async getUnlocks() {
      return getUnlocks_()
    },
    async addUnlock(kind: UnlockKind, id: string) {
      const u = getUnlocks_()
      if (u.items.some((i) => i.kind === kind && i.id === id)) return
      u.items.push({ kind, id, at: now() })
      write(key('unlocks'), u)
      enqueue('unlocks', `${kind}:${id}`, 'upsert', u.items[u.items.length - 1])
      emit({ type: 'unlocks' })
    },

    async getProfile() {
      return getProfile_()
    },
    async putProfile(p) {
      write(key('profile'), p)
      enqueue('profiles', 'self', 'upsert', p)
      emit({ type: 'profile' })
    },

    async getCachedPuzzles() {
      return read<Puzzle[]>(key('cache-puzzles'), () => [])
    },
    async putCachedPuzzles(ps) {
      write(key('cache-puzzles'), ps)
      emit({ type: 'cache' })
    },
    async getSyncMeta() {
      return read(key('sync-meta'), () => ({ puzzleRevs: {} as Record<string, number> }))
    },
    async putSyncMeta(m) {
      write(key('sync-meta'), m)
    },

    async getQueue() {
      return getQueue_()
    },
    async ack(ids: Uuid[]) {
      const set = new Set(ids)
      write(key('sync-queue'), { v: 1, ops: getQueue_().filter((x) => !set.has(x.id)) })
      emit({ type: 'queue' })
    },

    /** Felhőből jött összefésült adat: NEM tesz SyncOp-ot a sorba (különben végtelen ciklus). */
    async applyMerged(patch) {
      if (patch.progress) {
        write(key('progress'), patch.progress)
        emit({ type: 'progress' })
      }
      if (patch.sessions) {
        write(key('sessions'), patch.sessions)
        emit({ type: 'sessions' })
      }
      if (patch.unlocks) {
        write(key('unlocks'), patch.unlocks)
        emit({ type: 'unlocks' })
      }
      if (patch.profile) {
        write(key('profile'), patch.profile)
        emit({ type: 'profile' })
      }
      if (patch.settings) {
        write(key('settings'), patch.settings)
        applyCalm(patch.settings.photosensitive)
        emit({ type: 'settings' })
      }
    },

    async exportData(): Promise<StorageExport> {
      const entries: Record<string, string> = {}
      for (const k of ownKeys()) if (!k.endsWith(':bak') && !k.endsWith(':corrupt')) entries[k] = kv.get(k)!
      return { v: 1, exportedAt: now(), entries }
    },
    async importData(d) {
      if (!d || d.v !== 1 || typeof d.entries !== 'object') throw new Error('invalid export')
      for (const [k, v] of Object.entries(d.entries)) if (k.startsWith(P) && typeof v === 'string') kv.set(k, v)
      Object.values(EVENTS).forEach((type) => emit({ type } as StorageEvent))
      applyCalm(getSettings_().photosensitive)
    },
    async clearAll() {
      for (const k of ownKeys()) kv.remove(k)
      applyCalm(false)
      Object.values(EVENTS).forEach((type) => emit({ type } as StorageEvent))
    },

    onChange(cb) {
      subs.add(cb)
      return () => void subs.delete(cb)
    },
    async usage() {
      return { bytes: ownKeys().reduce((n, k) => n + (k.length + (kv.get(k)?.length ?? 0)) * 2, 0) }
    },
  }
}

let instance: StorageService | null = null
/** Az app egyetlen példánya (böngésző-tároló). Késleltetve jön létre, hogy tesztben ne kelljen böngésző. */
export function getStorage(): StorageService {
  return (instance ??= createStorage(browserKV(), {
    doc: typeof document !== 'undefined' ? document : undefined,
    win: typeof window !== 'undefined' ? window : undefined,
  }))
}
