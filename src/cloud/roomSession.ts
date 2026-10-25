// RoomSession (B4): tagok + online-állapot (Presence), a szoba állapota (lobby → playing) és a chat (postgres_changes).
// A közös tábla műveletei (ops/cursors/submit — B5) és a Gyilkos-mód (killer — B6) itt még csonkok.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result, Unsubscribe } from '../shared/base'
import type { ChatMessage, RoomInfo, RoomMember, RoomSession } from '../shared/room'
import { fail, fromError, guard, iso, ok } from './result'
import { toRoomInfo, type RoomRow } from './roomRow'

interface MsgRow { id: number; room_id: string; user_id: string; body: string; created_at: string }
interface PersonRow { id: string; username: string; avatar: string }

const COLORS = ['#d1162f', '#4aa3ff', '#6fcf97', '#f2c94c', '#bb6bd9', '#f2994a', '#56ccf2', '#ff8fab']
export const CHAT_MIN_GAP_MS = 700 // kliens-oldali sebességkorlát (GDD 22.1)
const noop = () => undefined
const sub = <T>(set: Set<(v: T) => void>) => (cb: (v: T) => void): Unsubscribe => {
  set.add(cb)
  return () => set.delete(cb)
}

export async function openSession(client: SupabaseClient, roomId: string): Promise<Result<RoomSession>> {
  const me = (await client.auth.getSession()).data.session?.user.id
  if (!me) return fail('unauthenticated', 'sign_in_required')
  const room = await client.from('rooms').select('*').eq('id', roomId).single()
  if (room.error) return fromError(room.error)

  let info: RoomInfo = toRoomInfo(room.data as RoomRow)
  const people = new Map<string, PersonRow>()
  let memberIds: string[] = []
  let online = new Set<string>([me])
  const memberCbs = new Set<(m: RoomMember[]) => void>()
  const infoCbs = new Set<(i: RoomInfo) => void>()
  const msgCbs = new Set<(m: ChatMessage) => void>()
  const history: ChatMessage[] = []
  const seen = new Set<number>()
  const muted = new Set<string>() // a némított játékosok üzenetei nem jelennek meg (0004 chat_mutes)

  async function loadPeople(ids: string[]) {
    const missing = ids.filter((i) => !people.has(i))
    if (missing.length === 0) return
    const { data } = await client.from('profiles').select('id, username, avatar').in('id', missing)
    ;((data ?? []) as PersonRow[]).forEach((p) => people.set(p.id, p))
  }
  const members = (): RoomMember[] =>
    memberIds.map((id, i) => ({
      userId: id, username: people.get(id)?.username ?? '?', avatar: people.get(id)?.avatar ?? 'candle',
      color: COLORS[i % COLORS.length]!, online: online.has(id),
    }))
  async function reloadMembers() {
    const { data } = await client.from('room_members').select('user_id, joined_at').eq('room_id', roomId).order('joined_at')
    memberIds = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id)
    await loadPeople(memberIds)
    memberCbs.forEach((cb) => cb(members()))
  }
  function addMessage(r: MsgRow) {
    if (seen.has(r.id)) return // a saját üzenet kétszer is megérkezhet (insert-válasz + Realtime)
    seen.add(r.id)
    if (muted.has(r.user_id)) return
    const m: ChatMessage = { id: r.id, userId: r.user_id, username: people.get(r.user_id)?.username ?? '?', body: r.body, at: iso(r.created_at) }
    history.push(m)
    history.sort((a, b) => a.id - b.id)
    msgCbs.forEach((cb) => cb(m))
  }

  await reloadMembers()
  const mutes = await client.from('chat_mutes').select('muted_id')
  ;((mutes.data ?? []) as { muted_id: string }[]).forEach((m) => muted.add(m.muted_id))
  const past = await client.from('room_messages').select('*').eq('room_id', roomId).order('id', { ascending: false }).limit(100)
  const pastRows = ((past.data ?? []) as MsgRow[]).reverse()
  await loadPeople(pastRows.map((r) => r.user_id))
  pastRows.forEach(addMessage)

  const channel = client.channel(`room-lobby:${roomId}`, { config: { presence: { key: me } } })
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, () => void reloadMembers())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, (p) => {
      const r = p.new as MsgRow
      void loadPeople([r.user_id]).then(() => addMessage(r))
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (p) => {
      info = toRoomInfo(p.new as RoomRow)
      infoCbs.forEach((cb) => cb(info))
    })
    .on('presence', { event: 'sync' }, () => {
      online = new Set([...Object.keys(channel.presenceState()), me])
      memberCbs.forEach((cb) => cb(members()))
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() })
    })

  let lastSent = 0
  const session: RoomSession = {
    info: () => info,
    members,
    onMembers: sub(memberCbs),
    onInfo: sub(infoCbs),
    start: () =>
      guard(async () => {
        const { data, error } = await client.rpc('start_room', { p_room: roomId })
        if (error) return fromError(error)
        info = toRoomInfo(data as RoomRow)
        infoCbs.forEach((cb) => cb(info))
        return ok(info)
      }),
    leave: () =>
      guard(async () => {
        const { error } = await client.rpc('leave_room', { p_room: roomId })
        if (error) return fromError(error)
        void client.removeChannel(channel)
        return ok(undefined)
      }),
    chat: {
      send: (body) =>
        guard(async () => {
          const text = body.trim()
          if (text.length < 1 || text.length > 300) return fail('invalid', 'chat_length')
          const now = Date.now()
          if (now - lastSent < CHAT_MIN_GAP_MS) return fail('rate_limited', 'chat_rate')
          lastSent = now
          const { data, error } = await client.from('room_messages').insert({ room_id: roomId, user_id: me, body: text }).select().single()
          if (error) return fromError(error)
          addMessage(data as MsgRow)
          return ok(undefined)
        }),
      history: () => [...history],
      report: (messageId, reason) =>
        guard(async () => {
          const { error } = await client.rpc('report_message', { p_message: messageId, p_reason: reason ?? '' })
          return error ? fromError(error) : ok(undefined)
        }),
      mute: (userId) =>
        guard(async () => {
          if (userId === me) return fail('invalid', 'self_mute')
          const { error } = await client.from('chat_mutes').insert({ user_id: me, muted_id: userId })
          if (error && (error as { code?: string }).code !== '23505') return fromError(error)
          muted.add(userId)
          for (let i = history.length - 1; i >= 0; i--) if (history[i]!.userId === userId) history.splice(i, 1)
          return ok(undefined)
        }),
      onMessage: sub(msgCbs),
    },
    // B5 (Együtt mód) tölti fel:
    ops: { send: noop, onOp: () => noop, saveState: async () => fail('unknown', 'not_implemented'), loadState: async () => fail('unknown', 'not_implemented') },
    cursors: { send: noop, onCursor: () => noop },
    submit: { propose: noop, vote: noop, onProposal: () => noop, onResult: () => noop },
    finish: async () => fail('unknown', 'not_implemented'),
  }
  return ok(session)
}
