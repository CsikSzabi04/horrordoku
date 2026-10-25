# NIGHTDOKU — közös szerződések

> `CONTRACT_VERSION = 1` · Dátum: 2026-10-25
> Ez a fájl a **két AI közti határ**. Amit itt nem látsz, az nem szerződés — kérdezz a HANDOFF-ban.
> A kód-alakja a `src/shared/**` alatt él (A hozza létre az A1 feladatban, **szó szerint ezekből a blokkokból**). Eltérés esetén ez a dokumentum a mérvadó.
> Változtatás: AI_SPLIT.md 7. fejezet.

Tartalom: 1 Alapok · 2 Pálya · 3 Tábla-állapot és műveletek · 4 Helyi tároló · 5 (Későbbi) asztali híd · 6 CloudService · 7 Szoba és co-op · 8 Hatások (képességek) · 9 Leképezés az adatbázisra · 10 Tartalom (karakterek, pályák)

---

## 1. Alapok

```ts
// src/shared/base.ts
export const CONTRACT_VERSION = 1

export type Uuid = string          // UUID v4, kisbetűvel
export type IsoTime = string       // ISO 8601, UTC: "2026-10-25T21:19:44Z"
export type CharId = string        // kebab-case, globálisan egyedi: "vlad", "leon-kennedy". A portré: assets/portraits/<CharId>.png
export type CellId = string        // oszlop betű + sor szám: "A1" … "J10"
export type PuzzleRef = string     // katalógus-azonosító ("classic-01-midnight-mass") | "gen:<verzió>:<nehézség>:<seed>" ("gen:1:2:7F3K92")
export type Unsubscribe = () => void

export type ErrorCode =
  | 'offline' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict'
  | 'invalid' | 'rate_limited' | 'server' | 'unknown'

/** Várható hibák NEM dobnak kivételt, hanem Result-ot adnak. Kivétel csak programozói hiba esetén. */
export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string }
```

**Szabályok:** minden időbélyeg UTC ISO; minden azonosító kis/nagybetű-helyes; a játékos által látott szöveg **nem** a szerződés része (az i18n-kulcsokból jön); a `PuzzleRef` szerkezete a GDD 19.3 szerinti.

---

## 2. Pálya (`Puzzle`) — GDD 20.1 véglegesítve

```ts
// src/shared/puzzle.ts
export type Difficulty = 1 | 2 | 3 | 4 | 5                       // Gyertyafény … Pokol kapuja
export type PuzzleMode = 'classic' | 'event' | 'bonus' | 'community' | 'generated'
export type Race = 'human' | 'vampire' | 'ghost' | 'demon' | 'werewolf' | 'witch' | 'ghoul' | 'shapeshifter'

export interface ObjectDef {
  type: string                    // "bench", "coffin", "bell", … (a UI ikon- és névtáblája A-é)
  at: CellId | CellId[]
  blocking?: boolean              // foglalt: senki nem állhat rá (kivéve szellem)
}

/** Nyom. A `kind` szerinti unió; új fajta csak szerződés-bővítéssel (visszafelé kompatibilisen) kerülhet be. */
export type Clue =
  | { kind: 'on'; object: string; room?: string }                  // "X egy [tárgyon] volt (a [helyiségben])"
  | { kind: 'onlyOn'; object: string }                             // "X volt az egyetlen [tárgyon]"
  | { kind: 'in'; room: string }                                   // "X a [helyiségben] volt"
  | { kind: 'notIn'; room: string }
  | { kind: 'beside'; object: string; room?: string }              // "X [tárgy] mellett volt" (ugyanabban a helyiségben, 4 irányban)
  | { kind: 'besideAny'; objects: string[] }                       // "X vagy A vagy B mellett volt"
  | { kind: 'besideChar'; char: CharId }
  | { kind: 'sameRoom'; with: CharId }
  | { kind: 'leftOf'; of: CharId }
  | { kind: 'diagonal'; of: CharId }                               // átlósan Y mellett (közepestől)
  | { kind: 'corner' }
  | { kind: 'distance'; fromObject: string; cells: number }        // szakértő szint / Alien-szabály
  | { kind: 'aloneWithKiller'; room: string }                      // az ÁLDOZAT kártyája
  | { kind: 'roomAlone' }                                          // "a helyiségében senki más nem volt"
  | { kind: 'liar' }                                               // Démon: egy másik nyom hazudik (a pálya `liarOf`-ban jelöli)

export interface PuzzleCharacter {
  id: CharId
  name: string                    // megjelenített név (nem fordítandó)
  race: Race
  victim?: boolean
  source?: { game?: string; film?: string }   // Esemény-pályáknál a forrás-játék
  clues: Clue[]                   // 1 db; Alakváltónál 2 (a játékosnak kell kitalálnia, melyik az igaz)
  clueText: string[]              // ugyanannyi, mint a `clues` — a kártyán látott magyar szöveg (kézzel írt vagy sablonból generált)
}

export interface Puzzle {
  v: 1
  id: PuzzleRef
  mode: PuzzleMode
  world: string                   // "hollowmere" | "fnaf" | "poppy-playtime" | … | "mix"
  chapter?: number                // Klasszikus: 1–3
  title: string
  story?: string                  // bevezető szöveg (Klasszikus/Esemény)
  size: number                    // 5..10
  difficulty: Difficulty
  rooms: Record<string, string>   // betű → név: { K: "Kripta" }
  layout: string[]                // size db sor, size db betű — helyiség-betűk
  objects: ObjectDef[]
  characters: PuzzleCharacter[]   // pontosan `size` db: size−1 gyanúsított + 1 áldozat
  activePowers: Race[]            // a pályán aktív Erő-szabályok
  worldRule?: string              // az Esemény-világ saját szabálya ("cameras", "vacuum", …)
  liarOf?: CharId                 // Démon-szabálynál: melyik karakter nyoma hazudik (a megoldásba tartozik, a játékos nem látja)
  solution: Record<CharId, CellId>
  murderer: CharId
  rev: number                     // javításkor nő; a Supabase `puzzles.rev` tükre
}
```

**Garanciák (A-nak teljesítenie kell):** `layout` mérete = `size`; pontosan egy áldozat; a `solution` permutáció (soronként/oszloponként egy); a megoldó **pontosan 1** megoldást talál; minden `clueText` magyar és a `clues`-szal egyező hosszú. A katalógus-pályákat build-időben `npm run validate:puzzles` ellenőrzi.

**`mode: 'classic'` (sima Murdoku):** `activePowers = []`, nincs `worldRule`, és a nyomok csak a Murdoku-fajták: `on`, `onlyOn`, `in`, `beside`, `besideAny`, `aloneWithKiller`. A többi `Clue`-fajta és az Erő/világ-szabályok csak `event` / `generated` pályán fordulhatnak elő.

---

## 3. Tábla-állapot és műveletek (a motor és a co-op közös nyelve)

```ts
// src/shared/board.ts
export interface BoardState {
  placed: Record<CharId, CellId>             // lerakott karakterek
  marks: CellId[]                            // kézi X-ek (a sor/oszlop szerinti automatikus X-ek NEM tárolódnak: számolt érték)
  notes: Record<CellId, CharId[]>            // ceruzás jegyzetek
}

export type Op =
  | { op: 'place';   char: CharId; cell: CellId }
  | { op: 'unplace'; char: CharId }
  | { op: 'move';    char: CharId; to: CellId }      // co-op: a másik lerakását is el lehet vinni
  | { op: 'mark';    cell: CellId; on: boolean }
  | { op: 'note';    cell: CellId; chars: CharId[] }
  | { op: 'erase';   cell: CellId }

export type OpError =
  | 'unknown_char' | 'unknown_cell' | 'blocked_object' | 'cell_occupied'
  | 'row_col_conflict' | 'power_violation' | 'vanished_cell'   // vanished_cell: a Gyilkos-mód „Eltüntetés" zárolta

/** Tiszta függvények (src/engine/ — A írja, B a co-op-hoz használja). */
export interface BoardEngine {
  empty(): BoardState
  apply(puzzle: Puzzle, state: BoardState, op: Op): { ok: true; state: BoardState } | { ok: false; error: OpError }
  autoMarks(puzzle: Puzzle, state: BoardState): CellId[]       // sor/oszlop szerinti számolt X-ek
  isComplete(puzzle: Puzzle, state: BoardState): boolean        // mindenki le van rakva
  check(puzzle: Puzzle, state: BoardState): { correct: boolean; wrongChars: CharId[] }
}

/** Co-op: egy művelet a hálózaton. */
export interface OpEnvelope {
  id: Uuid                 // idempotencia
  by: Uuid                 // a küldő felhasználó
  seq: number              // Lamport-számláló: max(látott seq)+1 küldéskor
  at: number               // epoch ms (csak naplózásra)
  op: Op
}
```

**Konfliktus-szabály (B valósítja meg):** ugyanazt a cellát/karaktert érintő műveletek közül a **nagyobb `seq`** győz, azonos `seq`-nél a kisebb `by` (lexikografikusan). Egy művelet, amit a `BoardEngine.apply` elutasít, a fogadó oldalon *eldobódik* (nem hiba).

---

## 4. Helyi tároló (`StorageService`) — GDD 17

Az adatok a **böngésző tárolójában** vannak (localStorage), a kulcsok: `nd:v1:<scope>:<név>` (`scope` = `guest` | `u_<user-id első 8 jegye>`; a gépfüggő beállítások: `nd:v1:settings`). Az alábbi `*.json` megnevezések a kulcsok nevei (`progress`, `sessions`, `profile`, `unlocks`, `sync-queue`, `cache-puzzles`). **A írja a megvalósítást** (A2), **B csak ezen az interfészen át olvas/ír.**

```ts
// src/shared/storage.ts
export type JumpscareMode = 'on' | 'soundOnly' | 'imageOnly' | 'soft' | 'off'

export interface Settings {                       // kulcs settings — gépfüggő (a user_settings.data tükre)
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

export interface ProgressFile {                   // kulcs <scope>:progress
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
  meta?: { title: string; difficulty: Difficulty; size: number; world: string; startedAt: IsoTime }
  updatedAt: IsoTime
}
export interface SessionsFile { v: 1; sessions: Record<PuzzleRef, SessionState> }   // legfeljebb 3 random + a megkezdett katalógus-pályák

export interface ProfileSnapshot {                // kulcs <scope>:profile — a felhő tükre
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

/** Feltöltésre váró változás (kulcs <scope>:sync-queue). A tároló állítja elő, B üríti. */
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

  /** Új/frissített katalógus-pályák (a Supabase-ből; `kulcs <scope>:cache-puzzles`). */
  getCachedPuzzles(): Promise<Puzzle[]>
  putCachedPuzzles(ps: Puzzle[]): Promise<void>
  getSyncMeta(): Promise<{ lastPullAt?: IsoTime; puzzleRevs: Record<string, number> }>
  putSyncMeta(m: { lastPullAt?: IsoTime; puzzleRevs: Record<string, number> }): Promise<void>

  getQueue(): Promise<SyncOp[]>
  ack(ids: Uuid[]): Promise<void>                                 // a feltöltött SyncOp-ok törlése

  /** Összefésülés a felhőből jött adattal — a szabályok: GDD 17.5. A megvalósítást B adja a `src/cloud/merge.ts`-ben, A hívja ezeket: */
  applyMerged(patch: Partial<{ progress: ProgressFile; sessions: SessionsFile; unlocks: UnlocksFile; profile: ProfileSnapshot; settings: Settings }>): Promise<void>

  onChange(cb: (e: StorageEvent) => void): Unsubscribe
  usage(): Promise<{ bytes: number }>                             // a méretkeret ellenőrzéséhez (17.2)
}
```

**Megállapodások.** Minden írás atomikus (ideiglenes fájl → átnevezés, előzőből `.bak`), minden fájl `v` mezővel. Az `applyMerged` **nem** tesz SyncOp-ot a sorba (különben végtelen ciklus). A `recordRun`/`putSession`/`addUnlock`/`patchSettings` tesz.

---

## 5. (Későbbi) asztali híd — jelenleg NINCS

A játék **web először** (v0.4). Az Electron-híd (`window.nightdoku`: `memory` mappa, titkosított tokentár, ablak-vezérlés) az **asztali csomagban** jön, külön fázisban (GDD 16.5); a szerződése akkor kerül ide. Webes verzióban a helyi tároló a `StorageService` (4. fejezet), a belépési tokent a Supabase-kliens alapértelmezett (localStorage) tárolója őrzi. *(Az első, Electron-os változat a git-történetben van: `1d4abda`.)*

---

## 6. `CloudService` — GDD 18

**B írja** (`src/cloud/`). **A csak az interfészt importálja** (`src/cloud/index.ts` exportálja a példányt és a `NullCloud`-ot). Vendég/offline módban `NullCloud` az alapértelmezett: minden hívás `{ ok:false, code:'offline' }`, az `auth.current()` pedig `null`.

```ts
// src/shared/cloud.ts
export type CloudStatus = 'guest' | 'offline' | 'idle' | 'syncing' | 'error'
export interface CloudUser { id: Uuid; email: string; username: string }

export interface Profile {
  id: Uuid; username: string; avatar: CharId
  xp: number; coins: number; streak: number; bestStreak: number; lastDaily?: string
  createdAt: IsoTime
}
export interface ProfileStats {                    // a `profile_stats` nézet
  solvedTotal: number; solvedNoHints: number; jumpscares: number; playTimeMs: number
  coopGames: number; winsAsKiller: number; winsAsDetective: number
}

export interface AuthApi {
  current(): CloudUser | null
  onChange(cb: (u: CloudUser | null) => void): Unsubscribe
  signUp(i: { email: string; password: string; username: string }): Promise<Result<CloudUser>>   // előtte usernameAvailable
  signIn(i: { email: string; password: string }): Promise<Result<CloudUser>>
  signOut(): Promise<Result<void>>
  sendPasswordReset(email: string): Promise<Result<void>>
  usernameAvailable(name: string): Promise<Result<boolean>>
}
export interface ProfileApi {
  get(): Promise<Result<Profile>>
  update(p: Partial<Pick<Profile, 'username' | 'avatar'>>): Promise<Result<Profile>>
  stats(): Promise<Result<ProfileStats>>
  exportData(): Promise<Result<object>>            // az összes saját sor egy JSON-ban (18.5)
  deleteAccount(): Promise<Result<void>>           // edge function
}
export interface SyncApi {
  start(): void                                    // háttér-szinkron: a StorageService.onChange-et figyeli, a sort üríti
  stop(): void
  flush(): Promise<Result<{ pushed: number; pulled: number }>>      // kilépés előtt / kézzel
  onStatus(cb: (s: CloudStatus) => void): Unsubscribe
}
export interface CatalogApi {
  refresh(): Promise<Result<{ added: number; updated: number }>>    // új/javított pályák → StorageService.putCachedPuzzles
}
export interface LeaderboardApi {
  submit(board: string, ms: number, hints: number): Promise<Result<void>>          // board: "daily:2026-10-25"
  top(board: string, n: number): Promise<Result<{ username: string; avatar: CharId; ms: number }[]>>
}

export interface FriendRow { id: Uuid; username: string; avatar: CharId; xp: number; status: 'pending' | 'accepted'; requestedByMe: boolean }
export interface FriendsApi {
  search(prefix: string): Promise<Result<{ id: Uuid; username: string; avatar: CharId; xp: number }[]>>   // min. 2 karakter, max. 20 találat
  list(): Promise<Result<FriendRow[]>>
  request(userId: Uuid): Promise<Result<void>>
  respond(userId: Uuid, accept: boolean): Promise<Result<void>>
  remove(userId: Uuid): Promise<Result<void>>
  onChange(cb: () => void): Unsubscribe            // Realtime
}

export interface CloudService {
  status(): CloudStatus
  onStatus(cb: (s: CloudStatus) => void): Unsubscribe
  auth: AuthApi
  profile: ProfileApi
  sync: SyncApi
  catalog: CatalogApi
  leaderboard: LeaderboardApi
  friends: FriendsApi
  rooms: RoomsApi                                  // 7. fejezet
}
```

**Megállapodások.** A `CloudService` *soha* nem blokkolja a játékot: minden hívás időkorlátos (≤ 10 mp), a hiba `Result`. A belépés/kilépés `StorageService.setScope()`-ot hív (a `u_<id8>` ↔ `guest` váltás), és a vendég-adatok átvitele a 17.5 szabályai szerint történik.

---

## 7. Szoba és co-op — GDD 22, 23

```ts
// src/shared/room.ts
export type RoomMode = 'together' | 'killer'
export type RoomStatus = 'lobby' | 'playing' | 'finished' | 'closed'
export interface RoomInfo {
  id: Uuid; code: string; hostId: Uuid; mode: RoomMode; puzzleRef: PuzzleRef
  status: RoomStatus; maxPlayers: number; settings: RoomSettings
  stateRev: number; startedAt?: IsoTime
}
export interface RoomSettings {                     // GDD 22.3 beállítás-tábla; mindegyik opcionális, az alap a GDD-ben
  timeLimit?: number | null                         // másodperc; null = nincs
  lives?: number; killerCount?: number
  abilities?: { timeWarp: boolean; textSwap: boolean; vanish: boolean }
  cooldownScale?: number; showPlacers?: boolean; telltale?: boolean
  meetings?: number; sniffPerDetective?: number
}
export interface RoomMember { userId: Uuid; username: string; avatar: CharId; color: string; online: boolean }
export interface ChatMessage { id: number; userId: Uuid; username: string; body: string; at: IsoTime; system?: boolean }

export interface RoomsApi {
  create(i: { mode: RoomMode; puzzleRef: PuzzleRef; maxPlayers?: number; settings?: RoomSettings }): Promise<Result<RoomInfo>>
  join(code: string): Promise<Result<RoomInfo>>
  invite(roomId: Uuid, userId: Uuid): Promise<Result<void>>
  onInvite(cb: (i: { roomId: Uuid; code: string; fromUsername: string; mode: RoomMode }) => void): Unsubscribe
  /** Megnyit egy élő munkamenetet (Realtime-csatornák, tagok, chat). */
  open(roomId: Uuid): Promise<Result<RoomSession>>
}

export interface RoomSession {
  info(): RoomInfo
  members(): RoomMember[]
  onMembers(cb: (m: RoomMember[]) => void): Unsubscribe
  onInfo(cb: (i: RoomInfo) => void): Unsubscribe                      // státusz-váltás (lobby → playing)
  start(): Promise<Result<RoomInfo>>                                  // csak a host
  leave(): Promise<Result<void>>
  chat: { send(body: string): Promise<Result<void>>; history(): ChatMessage[]; onMessage(cb: (m: ChatMessage) => void): Unsubscribe }
  /** A közös tábla műveletei (Broadcast `room:<id>`). */
  ops: { send(op: Op): void; onOp(cb: (e: OpEnvelope) => void): Unsubscribe; saveState(rev: number, state: BoardState): Promise<Result<number>>; loadState(): Promise<Result<{ rev: number; state: BoardState }>> }
  cursors: { send(cell: CellId | null): void; onCursor(cb: (userId: Uuid, cell: CellId | null) => void): Unsubscribe }
  /** Csak Gyilkos-módban. */
  killer?: KillerSession
  submit: { propose(): void; vote(approve: boolean): void; onProposal(cb: (p: { byUserId: Uuid; deadlineAt: number }) => void): Unsubscribe; onResult(cb: (r: { correct: boolean; livesLeft: number }) => void): Unsubscribe }
  finish(result: { solved: boolean; ms: number }): Promise<Result<void>>   // lezárja a szobát, a RunRecord-ot a hívó menti
}

export interface KillerSession {
  myRole(): 'killer' | 'detective'                                    // csak a saját szerep; a többi játékosé sosem érhető el
  useAbility(a: 'timeWarp' | 'textSwap' | 'vanish', target?: { char?: CharId; cell?: CellId; text?: string }): Promise<Result<void>>
  cooldowns(): Record<'timeWarp' | 'textSwap' | 'vanish', number>     // hátralévő ms
  sniff(): Promise<Result<{ used: boolean }>>                         // Szimat (nyomozó)
  callMeeting(): Promise<Result<void>>
  vote(userId: Uuid): Promise<Result<void>>
  onMeeting(cb: (m: { phase: 'discuss' | 'vote' | 'result'; endsAt: number; ejected?: Uuid; killerExposed?: boolean }) => void): Unsubscribe
  onEpilogue(cb: (e: { endsAt: number }) => void): Unsubscribe
  epilogueVote(userId: Uuid): Promise<Result<void>>
  onEnd(cb: (r: { outcome: 'detectives' | 'killer' | 'draw'; killerId: Uuid; abilityLog: { ability: string; at: number }[] }) => void): Unsubscribe
  onFx(cb: (fx: Fx) => void): Unsubscribe                             // 8. fejezet
}
```

**Csatornák** (GDD 23.5): `postgres_changes` a `rooms`, `room_members`, `room_messages`, `room_invites`, `friendships` táblákon · privát Broadcast `room:<id>` (játék-műveletek, kurzorok, ping) · privát Broadcast `room:<id>:fx` (csak a szerver ír, `realtime.send`).

---

## 8. Hatások (a gyilkos képességei) és a `BoardController`

```ts
// src/shared/fx.ts
export type Fx =
  | { type: 'time_penalty'; seconds: number; serverTime: number }                 // Időcsavar (lopás)
  | { type: 'time_speed'; factor: number; ms: number; serverTime: number }        // Időcsavar (gyorsítás)
  | { type: 'clue_override'; char: CharId; text: string; ms: number }             // Szövegcsere — NINCS feladó, NINCS értesítés
  | { type: 'object_vanish'; cell: CellId; ms: number }                           // Eltüntetés: a visszatéréskor a cella törlődik és zárolt
  | { type: 'exposed' }                                                           // a gyilkos leleplezve (képességek letiltva)
  | { type: 'silenced'; userId: Uuid; ms: number }                                // rossz szavazás: a játékos némán nem rakhat
  | { type: 'meeting'; phase: 'discuss' | 'vote' | 'result'; endsAt: number }
```
**Szabály:** egy `Fx` sosem tartalmazza a kiváltó azonosítóját; a kliens csak *megjeleníti*.

```ts
// src/shared/boardController.ts — A valósítja meg a játékképernyőben (A4), B csatlakoztatja a co-op-hoz
export interface Peer { userId: Uuid; username: string; color: string }
export interface BoardController {
  getState(): BoardState
  /** Másik játékos művelete: alkalmazd (a motoron át), de NE sugározd újra. */
  applyRemote(e: OpEnvelope): void
  /** Mindig, amikor a HELYI játékos érvényes műveletet hajt végre. B ezt sugározza. */
  onLocalOp(cb: (op: Op) => void): Unsubscribe
  /** Teljes állapot betöltése (újracsatlakozás, pillanatkép). */
  setState(s: BoardState): void
  setPeers(p: Peer[]): void
  setPeerCursor(userId: Uuid, cell: CellId | null): void
  onLocalCursor(cb: (cell: CellId | null) => void): Unsubscribe
  /** Gyilkos-mód hatások megjelenítése (óra, kártya-szöveg, eltűnő tárgy, zárolt cella, némítás). */
  applyFx(fx: Fx): void
  /** A közös óra és az életek megjelenítése (a szerver számolja, a kliens csak mutatja). */
  setClock(c: { endsAt: number | null; speed: number }): void
  setLives(n: number): void
  /** Beküldés-kérés a felületről (a kliens jelzi B-nek, hogy javaslatot tegyen). */
  onSubmitRequest(cb: () => void): Unsubscribe
  showSubmitResult(r: { correct: boolean }): void       // a jumpscare-t is ez indítja (A beállítása szerint)
}
```

---

## 9. Leképezés az adatbázisra (a `supabase/migrations/` az igazság)

| Szerződés | Tábla.oszlop |
|---|---|
| `RunRecord.id / ref / kind / roomId / role / won / difficulty / size / solved / ms / hints / wrongSubmits / at` | `runs.id / puzzle_ref / kind / room_id / role / won / difficulty / size / solved / time_ms / hints_used / wrong_submits / played_at` |
| `ProgressEntry.solved / bestMs / hints / wrongSubmits / firstSolvedAt` | `progress.solved / best_time_ms / hints_used / wrong_submits / first_solved_at` (kulcs: `puzzle_id` = `ref`) |
| `SessionState` → | `saves.state` = `{ board, wrongSubmits }` · `saves.meta` = `meta` · `saves.elapsed_ms` = `elapsedMs` · `saves.hints_used` = `hintsUsed` (kulcs: `puzzle_ref`) |
| `Settings` | `user_settings.data` |
| `ProfileSnapshot` | `profiles` (`username, avatar, xp, coins, streak, best_streak, last_daily`) |
| `UnlocksFile.items` | `unlocks (kind, item_id, unlocked_at)` |
| `Puzzle` | `puzzles.data` (+ az oszlopok: `id, mode, world, chapter, title, difficulty, size, rev, published`) |
| `RoomInfo` | `rooms (id, code, host_id, mode, puzzle_ref, status, max_players, settings, state, state_rev, started_at)` |
| `ChatMessage` | `room_messages (id, user_id, body, created_at)` |

**Az `updatedAt` mezőket a kliens állítja** (az összefésülés ezeken múlik, GDD 17.5).

---

## 10. Tartalom — karakterek és pályák (A adja, B olvassa)

A **Gyűjtemény** képernyő (B10) és a **Profil** a karakterekről és a pályákról ezen az interfészen át tud, nem a pálya-JSON-okból. **A írja** (`src/content/index.ts`; az A1-ben a 6 Hollowmere-szereplővel indul, az A5/A8 bővíti).

```ts
// src/shared/content.ts
export interface CharacterInfo {
  id: CharId
  name: string
  race: Race
  world: string                       // "hollowmere" | "fnaf" | … | "mix"
  emoji?: string                      // amíg nincs portré (public/portraits/<id>.png)
  source?: { game?: string; film?: string }
  bio?: string                        // magyar leírás a Gyűjteményhez
}

export interface ContentApi {
  /** Minden ismert karakter. A Gyűjtemény ebből és a `StorageService.getUnlocks()`-ból épül: amit még nem szereztél meg, az „ismeretlen". */
  characters(): CharacterInfo[]
  /** Pályák listája (csomagolt + cache), módra szűrhető. */
  puzzles(mode?: PuzzleMode): Promise<Puzzle[]>
}
```
