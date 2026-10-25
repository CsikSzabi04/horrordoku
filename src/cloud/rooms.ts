// RoomsApi (B4): szoba létrehozása / belépés kóddal / meghívás (0002 függvényei) + a nekem szóló meghívók (0003 `my_invites`).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthApi } from '../shared/cloud'
import type { RoomInvite, RoomMode, RoomsApi } from '../shared/room'
import { fromError, guard, ok } from './result'
import { toRoomInfo, type RoomRow } from './roomRow'
import { openSession } from './roomSession'

interface InviteRow { room_id: string; code: string; mode: string; from_username: string }

const toInvite = (r: InviteRow): RoomInvite => ({ roomId: r.room_id, code: r.code, fromUsername: r.from_username, mode: r.mode as RoomMode })

export function createRooms(client: SupabaseClient, auth: AuthApi): RoomsApi {
  const fetchInvites = () =>
    guard(async () => {
      const { data, error } = await client.rpc('my_invites')
      return error ? fromError(error) : ok(((data ?? []) as InviteRow[]).map(toInvite))
    })

  return {
    create: (i) =>
      guard(async () => {
        const { data, error } = await client.rpc('create_room', {
          p_mode: i.mode, p_puzzle_ref: i.puzzleRef, p_max_players: i.maxPlayers ?? 4, p_settings: i.settings ?? {},
        })
        return error ? fromError(error) : ok(toRoomInfo(data as RoomRow))
      }),
    join: (code) =>
      guard(async () => {
        const { data, error } = await client.rpc('join_room', { p_code: code.trim() })
        return error ? fromError(error) : ok(toRoomInfo(data as RoomRow))
      }),
    invite: (roomId, userId) =>
      guard(async () => {
        const { error } = await client.rpc('invite_friend', { p_room: roomId, p_user: userId })
        return error ? fromError(error) : ok(undefined)
      }),
    invites: fetchInvites,
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
