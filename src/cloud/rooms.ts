// RoomsApi (B4 + 0005): tartós szobák — létrehozás, nyitás/zárás, beállítás, törlés, követés, lista, statisztika; belépés kóddal; meghívók.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthApi } from '../shared/cloud'
import type { RoomGame, RoomInvite, RoomMode, RoomPeek, RoomStatus, RoomStats, RoomSummary, RoomsApi } from '../shared/room'
import { fromError, guard, iso, ok } from './result'
import { toRoomInfo, type RoomRow } from './roomRow'
import { openSession } from './roomSession'

interface InviteRow { room_id: string; code: string; mode: string; from_username: string }
interface SummaryRow {
  room_id: string; code: string; name: string; mode: string; puzzle_ref: string; status: string; is_open: boolean; max_players: number
  owner_id: string; owner_username: string; is_owner: boolean; is_member: boolean; member_count: number | string
  games_played: number | string; games_solved: number | string; last_played: string | null; created_at: string
}
interface PeekRow {
  room_id: string; code: string; name: string; mode: string; status: string; is_open: boolean; max_players: number
  owner_username: string; member_count: number | string; is_member: boolean
}
interface StatsRow {
  games_played: number | string; games_solved: number | string; best_ms: number | null; avg_ms: number | null
  total_ms: number | string; first_played: string | null; last_played: string | null
}
interface GameRow { started_at: string; ended_at: string | null; puzzle_ref: string; players: number; solved: boolean | null; ms: number | null }

const toInvite = (r: InviteRow): RoomInvite => ({ roomId: r.room_id, code: r.code, fromUsername: r.from_username, mode: r.mode as RoomMode })
const toSummary = (r: SummaryRow): RoomSummary => ({
  id: r.room_id, code: r.code, name: r.name, mode: r.mode as RoomMode, puzzleRef: r.puzzle_ref, status: r.status as RoomStatus, isOpen: r.is_open,
  maxPlayers: r.max_players, ownerId: r.owner_id, ownerUsername: r.owner_username, isOwner: r.is_owner, isMember: r.is_member,
  memberCount: Number(r.member_count), gamesPlayed: Number(r.games_played), gamesSolved: Number(r.games_solved),
  ...(r.last_played ? { lastPlayed: iso(r.last_played) } : {}), createdAt: iso(r.created_at),
})
const toPeek = (r: PeekRow): RoomPeek => ({
  id: r.room_id, code: r.code, name: r.name, mode: r.mode as RoomMode, status: r.status as RoomStatus, isOpen: r.is_open, maxPlayers: r.max_players,
  ownerUsername: r.owner_username, memberCount: Number(r.member_count), isMember: r.is_member,
})
const toStats = (r: StatsRow | undefined): RoomStats => ({
  gamesPlayed: Number(r?.games_played ?? 0), gamesSolved: Number(r?.games_solved ?? 0),
  ...(r?.best_ms != null ? { bestMs: r.best_ms } : {}), ...(r?.avg_ms != null ? { avgMs: r.avg_ms } : {}), totalMs: Number(r?.total_ms ?? 0),
  ...(r?.first_played ? { firstPlayed: iso(r.first_played) } : {}), ...(r?.last_played ? { lastPlayed: iso(r.last_played) } : {}),
})
const toGame = (r: GameRow): RoomGame => ({
  startedAt: iso(r.started_at), puzzleRef: r.puzzle_ref, players: r.players,
  ...(r.ended_at ? { endedAt: iso(r.ended_at) } : {}), ...(r.solved !== null ? { solved: r.solved } : {}), ...(r.ms !== null ? { ms: r.ms } : {}),
})

export function createRooms(client: SupabaseClient, auth: AuthApi): RoomsApi {
  /** Visszatérés nélküli RPC (törlés, kilépés, követés…). */
  const call = (fn: string, args: Record<string, unknown>) =>
    guard(async () => {
      const { error } = await client.rpc(fn, args)
      return error ? fromError(error) : ok(undefined)
    })
  /** Szobát visszaadó RPC → RoomInfo. */
  const room = (fn: string, args: Record<string, unknown>) =>
    guard(async () => {
      const { data, error } = await client.rpc(fn, args)
      return error ? fromError(error) : ok(toRoomInfo(data as RoomRow))
    })
  const fetchInvites = () =>
    guard(async () => {
      const { data, error } = await client.rpc('my_invites')
      return error ? fromError(error) : ok(((data ?? []) as InviteRow[]).map(toInvite))
    })

  return {
    create: (i) =>
      room('create_room', { p_mode: i.mode, p_puzzle_ref: i.puzzleRef, p_max_players: i.maxPlayers ?? 4, p_settings: i.settings ?? {}, p_name: i.name ?? '' }),
    join: (code) => room('join_room', { p_code: code.trim() }),
    invite: (roomId, userId) => call('invite_friend', { p_room: roomId, p_user: userId }),
    invites: fetchInvites,
    mine: () =>
      guard(async () => {
        const { data, error } = await client.rpc('my_rooms')
        return error ? fromError(error) : ok(((data ?? []) as SummaryRow[]).map(toSummary))
      }),
    peek: (code) =>
      guard(async () => {
        const c = code.trim()
        if (c.length < 6) return ok(null) // a kód 6 karakteres: rövidebbre nincs mit keresni
        const { data, error } = await client.rpc('room_peek', { p_code: c })
        if (error) return fromError(error)
        const row = ((data ?? []) as PeekRow[])[0]
        return ok(row ? toPeek(row) : null)
      }),
    follow: (code) => call('follow_room', { p_code: code.trim() }),
    unfollow: (roomId) => call('unfollow_room', { p_room: roomId }),
    setOpen: (roomId, open) => room('set_room_open', { p_room: roomId, p_open: open }),
    configure: (roomId, p) =>
      room('configure_room', { p_room: roomId, p_name: p.name ?? null, p_puzzle_ref: p.puzzleRef ?? null, p_max_players: p.maxPlayers ?? null, p_settings: p.settings ?? null }),
    remove: (roomId) => call('delete_room', { p_room: roomId }),
    leave: (roomId) => call('leave_room', { p_room: roomId }),
    stats: (roomId) =>
      guard(async () => {
        const { data, error } = await client.rpc('room_stats', { p_room: roomId })
        return error ? fromError(error) : ok(toStats(((data ?? []) as StatsRow[])[0]))
      }),
    recentGames: (roomId, n = 10) =>
      guard(async () => {
        const { data, error } = await client.rpc('room_recent_games', { p_room: roomId, p_n: n })
        return error ? fromError(error) : ok(((data ?? []) as GameRow[]).map(toGame))
      }),
    onInvite(cb) {
      let stop = () => undefined as void
      const bind = (me: string | null) => {
        stop()
        stop = () => undefined
        if (!me) return
        const ch = client
          .channel(`invites:${me}:${Math.random().toString(36).slice(2)}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_invites', filter: `to_user=eq.${me}` }, (p) => {
            const roomId = (p.new as { room_id?: string }).room_id
            void fetchInvites().then((r) => {
              const hit = r.ok ? r.value.find((i) => i.roomId === roomId) : undefined
              if (hit) cb(hit)
            })
          })
          .subscribe()
        stop = () => void client.removeChannel(ch)
      }
      bind(auth.current()?.id ?? null)
      const off = auth.onChange((u) => bind(u?.id ?? null)) // belépés/kilépés után újrakötünk
      return () => {
        off()
        stop()
      }
    },
    open: (roomId) => guard(() => openSession(client, roomId), 15_000),
  }
}
