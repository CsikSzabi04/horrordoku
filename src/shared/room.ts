// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CellId, CharId, IsoTime, PuzzleRef, Result, Unsubscribe, Uuid } from './base'
import type { BoardState, Op, OpEnvelope } from './board'
import type { Fx } from './fx'

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
  chat: { send(body: string): Promise<Result<void>>; history(): ChatMessage[]; onMessage(cb: (m: ChatMessage) => void): Unsubscribe; report(messageId: number, reason?: string): Promise<Result<void>>; mute(userId: Uuid): Promise<Result<void>> }
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
