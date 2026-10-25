// A `rooms` tábla sora → RoomInfo (rooms.ts és roomSession.ts közös leképezése).
import type { PuzzleRef } from '../shared/base'
import type { RoomInfo, RoomMode, RoomSettings, RoomStatus } from '../shared/room'
import { iso } from './result'

export interface RoomRow {
  id: string; code: string; host_id: string; mode: string; puzzle_ref: PuzzleRef; status: string
  max_players: number; settings: unknown; state_rev: number; started_at: string | null; name: string; is_open: boolean
}

export const toRoomInfo = (r: RoomRow): RoomInfo => ({
  id: r.id, code: r.code, hostId: r.host_id, mode: r.mode as RoomMode, puzzleRef: r.puzzle_ref, status: r.status as RoomStatus,
  maxPlayers: r.max_players, settings: (r.settings ?? {}) as RoomSettings, stateRev: r.state_rev, name: r.name ?? '', isOpen: !!r.is_open,
  ...(r.started_at ? { startedAt: iso(r.started_at) } : {}),
})
