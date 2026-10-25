// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { IsoTime, PuzzleRef, Unsubscribe, Uuid } from './base'
import type { Difficulty, Puzzle } from './puzzle'
import type { BoardState } from './board'

export type JumpscareMode = 'on' | 'soundOnly' | 'imageOnly' | 'soft' | 'off'

export interface Settings {                       // memory/settings.json — gépfüggő (a user_settings.data tükre)
  v: 1
  language: 'hu' | 'en'
  theme: 'dark' | 'bloodmoon'
  audio: { music: number; sfx: number; volumeCap: number }      // 0..1
  jumpscare: JumpscareMode                        // alap: 'off'
  photosensitive: boolean                         // nyugodt mód
  screenShake: boolean
  streamerMode: boolean
  invisible: boolean                              // „Láthatatlan mód" (online-állapot elrejtése)
  updatedAt: IsoTime
}

export interface ProgressEntry {
  solved: boolean
  bestMs?: number
  hints?: number                                  // a legjobb futásban
  wrongSubmits: number                            // összes
  firstSolvedAt?: IsoTime
}

export interface RunRecord {                      // egy befejezett vagy feladott futás — a `runs` tábla egy sora
  id: Uuid                                        // a KLIENS generálja (idempotens feltöltés)
  ref: PuzzleRef
  kind: 'catalog' | 'daily' | 'random' | 'together' | 'killer'
  roomId?: Uuid
  role?: 'detective' | 'killer'
  won?: boolean | null                            // killer módban; döntetlen = null
  difficulty?: Difficulty
  size?: number
  solved: boolean
  ms?: number
  hints: number
  wrongSubmits: number
  at: IsoTime
}

export interface ProgressFile {                   // memory/<scope>/progress.json
  v: 1
  updatedAt: IsoTime
  puzzles: Record<PuzzleRef, ProgressEntry>       // csak katalógus-pályák
  recentRuns: RunRecord[]                         // legfeljebb 20 (a teljes napló a felhőben van)
}

export interface SessionState {                   // egy félbehagyott játék — a `saves` tábla egy sora
  elapsedMs: number
  hintsUsed: number
  wrongSubmits: number
  board: BoardState
  meta?: { title: string; difficulty: Difficulty; size: number; world: string; startedAt: IsoTime; fp?: string }
  updatedAt: IsoTime
}
export interface SessionsFile { v: 1; sessions: Record<PuzzleRef, SessionState> }   // legfeljebb 3 random + a megkezdett katalógus-pályák

export interface ProfileSnapshot {                // memory/<scope>/profile.json — a felhő tükre
  v: 1
  id: Uuid | null                                 // null = vendég
  username: string
  avatar: string                                  // CharId
  xp: number; coins: number; streak: number; bestStreak: number
  lastDaily?: string                              // "YYYY-MM-DD"
  updatedAt: IsoTime
}

export type UnlockKind = 'character' | 'journal' | 'jumpscare' | 'skin' | 'badge'
export interface UnlocksFile { v: 1; items: { kind: UnlockKind; id: string; at: IsoTime }[] }

/** Feltöltésre váró változás (memory/<scope>/sync-queue.json). A tároló állítja elő, B üríti. */
export interface SyncOp {
  id: Uuid
  table: 'progress' | 'saves' | 'runs' | 'unlocks' | 'user_settings' | 'profiles'
  kind: 'upsert' | 'delete'
  key: string                                     // progress/saves: PuzzleRef · runs: run.id · unlocks: "kind:id" · settings/profiles: "self"
  payload?: unknown                               // a megfelelő *File-beli bejegyzés
  at: IsoTime
}

export type StorageEvent =
  | { type: 'settings' } | { type: 'progress' } | { type: 'sessions' } | { type: 'unlocks' }
  | { type: 'profile' } | { type: 'queue' } | { type: 'cache' } | { type: 'scope'; scope: string }

/** Teljes mentés-mentés (Beállítások → Adatok): a nyers kulcs-érték párok. */
export interface StorageExport {
  v: 1
  exportedAt: IsoTime
  entries: Record<string, string>
}

export interface StorageService {
  /** Melyik felhasználó adatai az aktívak: 'guest' vagy 'u_xxxxxxxx'. A váltás előtt minden írás lezárul. */
  setScope(scope: string): Promise<void>
  scope(): string

  getSettings(): Promise<Settings>
  patchSettings(p: Partial<Omit<Settings, 'v' | 'updatedAt'>>): Promise<Settings>

  getProgress(): Promise<ProgressFile>
  /** Elmenti a futást: frissíti a ProgressEntry-t (legjobb idő stb.), a recentRuns-t, és SyncOp-ot tesz a sorba. */
  recordRun(run: RunRecord): Promise<void>

  getSessions(): Promise<SessionsFile>
  putSession(ref: PuzzleRef, s: SessionState): Promise<void>      // 3 mp-es késleltetéssel író automatikus mentést A végzi (debounce)
  deleteSession(ref: PuzzleRef): Promise<void>

  getUnlocks(): Promise<UnlocksFile>
  addUnlock(kind: UnlockKind, id: string): Promise<void>

  getProfile(): Promise<ProfileSnapshot>
  putProfile(p: ProfileSnapshot): Promise<void>

  /** Új/frissített katalógus-pályák (a Supabase-ből; `memory/<scope>/cache/puzzles.json`). */
  getCachedPuzzles(): Promise<Puzzle[]>
  putCachedPuzzles(ps: Puzzle[]): Promise<void>
  getSyncMeta(): Promise<{ lastPullAt?: IsoTime; puzzleRevs: Record<string, number> }>
  putSyncMeta(m: { lastPullAt?: IsoTime; puzzleRevs: Record<string, number> }): Promise<void>

  getQueue(): Promise<SyncOp[]>
  ack(ids: Uuid[]): Promise<void>                                 // a feltöltött SyncOp-ok törlése

  /** Összefésülés a felhőből jött adattal — a szabályok: GDD 17.5. A megvalósítást B adja a `src/cloud/merge.ts`-ben, A hívja ezeket: */
  applyMerged(patch: Partial<{ progress: ProgressFile; sessions: SessionsFile; unlocks: UnlocksFile; profile: ProfileSnapshot; settings: Settings }>): Promise<void>

  /** [bővítés, A2] Beállítások → Adatok: mentés exportálása / betöltése / törlése (GDD 17.4). */
  exportData(): Promise<StorageExport>
  importData(d: StorageExport): Promise<void>      // érvénytelen → kivétel; nem tesz SyncOp-ot a sorba
  clearAll(): Promise<void>

  onChange(cb: (e: StorageEvent) => void): Unsubscribe
  usage(): Promise<{ bytes: number }>                             // a méretkeret ellenőrzéséhez (17.2)
}
