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
