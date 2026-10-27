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
  | { kind: 'aloneWithKiller'; room?: string }                     // az ÁLDOZAT kártyája; `room` nélkül (Murdoku) a helyiség a lerakás helyétől függ
  | { kind: 'roomAlone' }                                          // "a helyiségében senki más nem volt"
  | { kind: 'liar' }                                               // Démon: egy másik nyom hazudik (a pálya `liarOf`-ban jelöli)
  | { kind: 'lit' }                                                 // Alan Wake: fényes mezőn állt (villanyoszlop / töltő körül)
  | { kind: 'dark' }                                                // Alan Wake: sötét mezőn állt (a Birtokoltak)
  | { kind: 'col'; n: number }                                      // Murdoku: „A 2. oszlopban volt." (1 = balról az első)
  | { kind: 'row'; n: number }                                      // Murdoku: „A 3. sorban volt." (1 = fentről az első)
  | { kind: 'northOf'; of: CharId; rows: number }                   // Murdoku: „Pontosan egy sorral X-től északra volt." (északra = feljebb)
  | { kind: 'southOf'; of: CharId; rows: number }                   // …délre (lejjebb)
  | { kind: 'aloneWith'; with: CharId }                             // Murdoku: „Egyedül volt Marával." (a helyiségben csak ők ketten)
  | { kind: 'dir'; of: CharId; dir: 'N' | 'E' | 'S' | 'W' }          // „X-től északra volt": szigorúan feljebb (N) / jobbra (E) / lejjebb (S) / balra (W)
  | { kind: 'notBeside'; object: string }                           // „Nem volt medve mellett."
  | { kind: 'besideCat'; cat: string }                              // „Egy állat mellett volt." (kategória: `CATEGORIES`)
  | { kind: 'notBesideCat'; cat: string }                           // „Nem volt állat mellett."
  | { kind: 'terrain'; style: string; not?: boolean }               // „Vízben / mocsárban / fűben volt." — a helyiség padlója (`Puzzle.floors`)
  | { kind: 'line'; axis: 'row' | 'col'; op: 'lt' | 'gt' | 'ne'; n: number } // „Az 5. sor fölött / az 2. oszloptól balra / nem a 3. sorban volt."
  | { kind: 'onlyGender'; gender: 'm' | 'f'; room?: string }        // „(A Konyhában) ő volt az egyetlen férfi.” (a helyiségében rajta kívül senki ilyen nemű; a nemének egyeznie kell a sajátjával)
  | { kind: 'withGender'; gender: 'm' | 'f' }                       // „A helyiségében volt egy férfi." (rajta kívül legalább egy ilyen nemű)
  | { kind: 'notSameRoom'; with: CharId }                           // „Nem volt egy helyiségben Marával."
  | { kind: 'edge'; inner?: boolean }                               // „A pálya szélén volt." / `inner`: nem a szélén
  | { kind: 'roomCount'; n: number }                                // „A helyiségében hárman voltak." (vele együtt, az áldozatot is beleértve)

export interface PuzzleCharacter {
  id: CharId
  name: string                    // megjelenített név (nem fordítandó)
  race: Race
  victim?: boolean
  source?: { game?: string; film?: string }   // Esemény-pályáknál a forrás-játék
  clues: Clue[]                   // 1 db; Alakváltónál 2 (a játékosnak kell kitalálnia, melyik az igaz)
  clueText: string[]              // ugyanannyi, mint a `clues` — a kártyán látott magyar szöveg (kézzel írt vagy sablonból generált)
  gender?: 'm' | 'f'              // arckép / ♂♀ jelvény (Klasszikus: hétköznapi nevek)
  armored?: boolean               // Dead Space (`vacuumRooms`): csak páncélos állhat nyomásmentes helyiségben
  hidden?: number[]               // Until Dawn: a `clues` itt felsorolt indexű elemei zároltak, amíg a karakter totem mellé nem kerül
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
  vacuumRooms?: string[]          // Dead Space: a nyomásmentes helyiségek betűi
  floors?: Record<string, string> // helyiség-betű → padló-osztály (water, swamp, grass, sand, ice, stone, dirt, wood, carpet, checker, brick, tile): a `terrain` nyomokhoz
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
  | { op: 'place';   char: CharId; cell: CellId; trap?: true }   // trap: a Gyilkos „Eltüntetés” csapda-mezőjére (épp eltűnt tárgy) — a motor ilyenkor a foglalt mezőt is elfogadja
  | { op: 'unplace'; char: CharId }
  | { op: 'move';    char: CharId; to: CellId; trap?: true }      // co-op: a másik lerakását is el lehet vinni
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
  meta?: { title: string; difficulty: Difficulty; size: number; world: string; startedAt: IsoTime; fp?: string }   // fp = a pálya ujjlenyomata (game/fingerprint.ts): eltérő pályához nem töltjük vissza a mentést
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

  /** Új/frissített katalógus-pályák (a Supabase-ből; `kulcs <scope>:cache-puzzles`). */
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
export interface PublicProfile {                    // 0004 public_profile: biztonságos statisztika másoknak
  id: Uuid; username: string; avatar: CharId; xp: number; bestStreak: number
  solvedTotal: number; solvedNoHints: number; coopGames: number; winsAsDetective: number; winsAsKiller: number
}
export interface ProfileApi {
  get(): Promise<Result<Profile>>
  update(p: Partial<Pick<Profile, 'username' | 'avatar'>>): Promise<Result<Profile>>
  stats(): Promise<Result<ProfileStats>>
  exportData(): Promise<Result<object>>            // az összes saját sor egy JSON-ban (18.5)
  deleteAccount(): Promise<Result<void>>           // edge function
  /** [bővítés, B7] Más játékos nyilvános profilja; `null`, ha nem látható (nem kereshető és nem barát). */
  publicProfile(userId: Uuid): Promise<Result<PublicProfile | null>>
}
export interface SyncApi {
  start(): void                                    // háttér-szinkron: a StorageService.onChange-et figyeli, a sort üríti
  stop(): void
  flush(): Promise<Result<{ pushed: number; pulled: number }>>      // kilépés előtt / kézzel
  onStatus(cb: (s: CloudStatus) => void): Unsubscribe
  /** [bővítés, B2] Van-e a böngészőben vendégként szerzett haladás, amit érdemes a fiókba átvinni? */
  guestData(): Promise<boolean>
  /** [bővítés, B2] A vendég-adatok összefésülése a belépett fiókba (a vendég „a másik gép") és feltöltése; a vendég-adat megmarad. */
  transferGuest(): Promise<Result<void>>
}
export interface CatalogApi {
  refresh(): Promise<Result<{ added: number; updated: number }>>    // új/javított pályák → StorageService.putCachedPuzzles
}
export interface LeaderboardApi {
  submit(board: string, ms: number, hints: number): Promise<Result<void>>          // board: "daily:2026-10-25"
  top(board: string, n: number): Promise<Result<{ username: string; avatar: CharId; ms: number }[]>>
}

export interface FriendRow { id: Uuid; username: string; avatar: CharId; xp: number; status: 'pending' | 'accepted'; requestedByMe: boolean; online?: boolean }
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
  name: string; isOpen: boolean                    // [0005] tartós szoba: neve, és hogy a tulajdonos megnyitotta-e az ajtót
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

/** [0005, B4] A szobáim listájának egy eleme: saját (tulajdonos), tag, vagy követett — zárt ajtónál is látszik. */
export interface RoomSummary {
  id: Uuid; code: string; name: string; mode: RoomMode; puzzleRef: PuzzleRef; status: RoomStatus; isOpen: boolean; maxPlayers: number
  ownerId: Uuid; ownerUsername: string; isOwner: boolean; isMember: boolean; memberCount: number
  gamesPlayed: number; gamesSolved: number; lastPlayed?: IsoTime; createdAt: IsoTime
}
/** [0005] Egy szoba „kukucskálása" kóddal: létezik-e, nyitott-e — belépés nélkül. */
export interface RoomPeek {
  id: Uuid; code: string; name: string; mode: RoomMode; status: RoomStatus; isOpen: boolean; maxPlayers: number
  ownerUsername: string; memberCount: number; isMember: boolean
}
export interface RoomStats { gamesPlayed: number; gamesSolved: number; bestMs?: number; avgMs?: number; totalMs: number; firstPlayed?: IsoTime; lastPlayed?: IsoTime }
export interface RoomGame { startedAt: IsoTime; endedAt?: IsoTime; puzzleRef: PuzzleRef; players: number; solved?: boolean; ms?: number }

export interface RoomInvite { roomId: Uuid; code: string; fromUsername: string; mode: RoomMode }

export interface RoomsApi {
  create(i: { mode: RoomMode; puzzleRef: PuzzleRef; name?: string; maxPlayers?: number; settings?: RoomSettings }): Promise<Result<RoomInfo>>   // az ajtó ZÁRVA indul, legfeljebb 5 saját szoba
  join(code: string): Promise<Result<RoomInfo>>
  invite(roomId: Uuid, userId: Uuid): Promise<Result<void>>
  onInvite(cb: (i: RoomInvite) => void): Unsubscribe
  /** A nekem szóló, még lobby-állapotú szobák meghívói (0003 `my_invites`). Additív bővítés (B4). */
  invites(): Promise<Result<RoomInvite[]>>
  /** [0005, B4] A szobáim: saját, tag, követett — zárt ajtónál is látszanak (a lista nem ad hozzáférést a szobához). */
  mine(): Promise<Result<RoomSummary[]>>
  /** [0005] Kóddal: `null`, ha nincs ilyen szoba; különben látszik, hogy nyitott-e. */
  peek(code: string): Promise<Result<RoomPeek | null>>
  follow(code: string): Promise<Result<void>>        // zárt szoba követése: a `mine()`-ban látszik, amíg meg nem nyílik
  unfollow(roomId: Uuid): Promise<Result<void>>
  setOpen(roomId: Uuid, open: boolean): Promise<Result<RoomInfo>>   // csak a tulajdonos; játék közben nem zárható
  configure(roomId: Uuid, p: { name?: string; puzzleRef?: PuzzleRef; maxPlayers?: number; settings?: RoomSettings }): Promise<Result<RoomInfo>>   // csak lobbyban
  remove(roomId: Uuid): Promise<Result<void>>        // a tulajdonos törli (tagok, chat, napló is)
  leave(roomId: Uuid): Promise<Result<void>>         // végleges kilépés tagként (a tulajdonos nem léphet ki)
  stats(roomId: Uuid): Promise<Result<RoomStats>>
  recentGames(roomId: Uuid, n?: number): Promise<Result<RoomGame[]>>
  /** Megnyit egy élő munkamenetet (Realtime-csatornák, tagok, chat). */
  open(roomId: Uuid): Promise<Result<RoomSession>>
}

export interface RoomSession {
  info(): RoomInfo
  members(): RoomMember[]
  onMembers(cb: (m: RoomMember[]) => void): Unsubscribe
  onInfo(cb: (i: RoomInfo) => void): Unsubscribe                      // státusz-váltás (lobby → playing)
  start(): Promise<Result<RoomInfo>>                                  // csak a host
  leave(): Promise<Result<void>>                                      // VÉGLEGES kilépés a szoba tagjai közül (tulajdonos nem)
  close(): void                                                       // [0005] csak a Realtime-kapcsolatot zárja le, a tagság marad
  chat: { send(body: string): Promise<Result<void>>; history(): ChatMessage[]; onMessage(cb: (m: ChatMessage) => void): Unsubscribe; report(messageId: number, reason?: string): Promise<Result<void>>; mute(userId: Uuid): Promise<Result<void>>
    /** [additív] A némítás feloldása: a játékos korábbi üzenetei visszatérnek a `history()`-ba. */
    unmute(userId: Uuid): Promise<Result<void>>
    /** [additív] A (ebben a munkamenetben ismert) némított játékosok — a némítás fiókhoz kötött, minden szobában érvényes. */
    muted(): Uuid[] }
  /** A közös tábla műveletei (Broadcast `room:<id>`). */
  ops: {
    /** A saját műveletet sugározza; visszaadja a borítékot (id, seq), hogy a hívó a saját naplójába is felvehesse. [B5: void → OpEnvelope, visszafelé kompatibilis] */
    send(op: Op): OpEnvelope
    onOp(cb: (e: OpEnvelope) => void): Unsubscribe                     // csak a MÁSOK műveletei
    saveState(rev: number, state: BoardState): Promise<Result<number>>
    loadState(): Promise<Result<{ rev: number; state: BoardState }>>
    /** [B5, additív] Alkalmazás-szintű üzenetek ugyanazon a csatornán (pillanatkép, kivonat, tipp, beküldés-szavazás…). */
    broadcast(type: string, payload: Record<string, unknown>): void
    onBroadcast(type: string, cb: (payload: Record<string, unknown>, by: Uuid) => void): Unsubscribe
  }
  cursors: { send(cell: CellId | null): void; onCursor(cb: (userId: Uuid, cell: CellId | null) => void): Unsubscribe }
  /** Csak Gyilkos-módban. */
  killer?: KillerSession
  submit: { propose(): void; vote(approve: boolean): void; onProposal(cb: (p: { byUserId: Uuid; deadlineAt: number }) => void): Unsubscribe; onResult(cb: (r: { correct: boolean; livesLeft: number }) => void): Unsubscribe }
  finish(result: { solved: boolean; ms: number }): Promise<Result<void>>   // lezárja a szobát, a RunRecord-ot a hívó menti
}

export type KillerAbility = 'timeWarp' | 'textSwap' | 'vanish'
export type KillerOutcome = 'detectives' | 'killer' | 'draw' | 'aborted'
/** [0007, B6] A szerver állapot-pillanatképe (`killer_state`): a nyilvános rész mindenkinek, a SAJÁT titkos rész (szerep, hűtés, Szimat-keret) a hívónak. Idők: a SZERVER epoch ms-ban (`now` = a pillanatkép ideje). */
export interface KillerState {
  running: boolean; now: number
  gameId?: number; startedAt?: number; phase?: 'play' | 'epilogue' | 'over'
  role?: 'killer' | 'detective'
  lives?: number; maxLives?: number
  timeLimitMs?: number | null; penaltyMs?: number; speed?: { from: number; until: number; factor: number }[]; seals?: { cell: CellId; from: number; until: number }[]   // hátralévő = határidő − büntetés − eltelt − gyorsítási többlet (game/killerClock.ts)
  meeting?: { phase: 'discuss' | 'vote' | 'result'; endsAt: number; by?: Uuid; voted?: boolean; ejected?: Uuid | null; killerExposed?: boolean } | null
  meetingsLeft?: number
  submit?: { id: string; by: Uuid; phase: 'vote' | 'verify'; endsAt: number; voted: boolean } | null
  epilogue?: { endsAt: number; voted: boolean } | null
  players?: number; showPlacers?: boolean; telltale?: boolean
  exposedKillers?: Uuid[]                                              // leleplezett gyilkosok (kettő játékosnál a gyilkos eleve nyilvános)
  exposed?: boolean; sniffsLeft?: number; canCallMeeting?: boolean; silencedMs?: number
  cooldowns?: Record<KillerAbility, number>; abilities?: { timeWarp: boolean; textSwap: boolean; vanish: boolean }   // csak a gyilkosnak
  busyMs?: number; killerGone?: boolean                                // csak a gyilkosnak
}
export interface KillerResult { gameId: number; outcome: KillerOutcome; reason: string; lives: number; elapsedMs: number; killerIds: Uuid[]; roles: Record<Uuid, 'killer' | 'detective'>; abilityLog: { ability: string; at: number }[] }
/** A közös beküldés eseményei (szerver-oldali szavazás + ellenőrzés). */
export interface KillerSubmitEvent { state: 'proposal' | 'verify' | 'rejected' | 'correct' | 'wrong'; id: string; by: Uuid; endsAt?: number; livesLeft?: number }

export interface KillerSession {
  myRole(): 'killer' | 'detective'                                    // csak a saját szerep; a többi játékosé sosem érhető el
  /** timeWarp: `mode` = 'steal' (20 mp lopás, alap) | 'speed' (10 mp háromszoros sebesség); textSwap: `char` + `text`; vanish: `cell`. */
  useAbility(a: KillerAbility, target?: { char?: CharId; cell?: CellId; text?: string; mode?: 'steal' | 'speed' }): Promise<Result<void>>
  cooldowns(): Record<KillerAbility, number>                          // hátralévő ms
  sniff(): Promise<Result<{ used: boolean }>>                         // Szimat (nyomozó)
  callMeeting(): Promise<Result<void>>
  vote(userId: Uuid | null): Promise<Result<void>>                    // null = tartózkodás
  onMeeting(cb: (m: { phase: 'discuss' | 'vote' | 'result'; endsAt: number; by?: Uuid; ejected?: Uuid | null; killerExposed?: boolean }) => void): Unsubscribe
  onEpilogue(cb: (e: { endsAt: number }) => void): Unsubscribe
  epilogueVote(userId: Uuid): Promise<Result<void>>
  onEnd(cb: (r: { outcome: KillerOutcome; killerId: Uuid; killerIds: Uuid[]; reason: string; elapsedMs: number; abilityLog: { ability: string; at: number }[] }) => void): Unsubscribe
  onFx(cb: (fx: Fx) => void): Unsubscribe                             // 8. fejezet
  /** [B6, additív] A szerver-állapot pillanatképe (szívveréssel / eseményekkel frissül) és a szerver-óra. */
  state(): KillerState | null
  onState(cb: (s: KillerState) => void): Unsubscribe
  refresh(): Promise<Result<KillerState>>
  serverNow(): number
  /** [B6, additív] Közös beküldés a szerveren: javaslat → az aktív játékosok többsége jóváhagyja (mindenki szavazata egyformán számít) → a kliensek jelentik, helyes-e → a jelentések többsége dönt → eredmény. */
  proposeSubmit(): Promise<Result<void>>
  voteSubmit(approve: boolean): Promise<Result<void>>
  reportSubmit(correct: boolean): Promise<Result<void>>
  onSubmit(cb: (e: KillerSubmitEvent) => void): Unsubscribe
  onSniff(cb: (r: { used: boolean }) => void): Unsubscribe
  result(): Promise<Result<KillerResult | null>>
}
```

**Csatornák** (GDD 23.5): `postgres_changes` a `rooms`, `room_members`, `room_messages`, `room_invites`, `friendships` táblákon · privát Broadcast `room:<id>` (játék-műveletek, kurzorok, ping) · a Gyilkos-mód hatásai a `room_events` táblán át (a szoba tagjai olvashatják, csak a szerver-függvények írják; `postgres_changes` INSERT) — a GDD 23.5 `room:<id>:fx` privát csatornája helyett (0007).

---

## 8. Hatások (a gyilkos képességei) és a `BoardController`

```ts
// src/shared/fx.ts
export type Fx =
  | { type: 'time_penalty'; seconds: number; serverTime: number }                 // Időcsavar (lopás)
  | { type: 'time_speed'; factor: number; ms: number; serverTime: number }        // Időcsavar (gyorsítás)
  | { type: 'clue_override'; char: CharId; text: string; ms: number; telltale?: boolean }   // Szövegcsere — NINCS feladó, NINCS értesítés (telltale: a lobby-opció „Árulkodó jel”)
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
