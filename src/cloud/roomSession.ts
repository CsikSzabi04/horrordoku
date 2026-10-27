// RoomSession (B4): tagok + online-állapot (Presence), a szoba állapota (lobby → playing) és a chat (postgres_changes).
// A közös tábla (ops / kurzorok / üzenetek — B5, Broadcast `room:<id>`) itt él; a beküldés-szavazás és a szinkron-logika a `game/coop.ts`-ben.
// A Gyilkos-mód (B6): a szerver-oldali játékállapot kliense a `cloud/killer.ts`-ben; a közös beküldés (`submit`) ennél a csonk — az Együttben a `game/coop.ts`, a Gyilkosban a szerver végzi.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CellId, Result, Unsubscribe, Uuid } from '../shared/base'
import type { BoardState, Op, OpEnvelope } from '../shared/board'
import type { ChatMessage, RoomInfo, RoomMember, RoomSession } from '../shared/room'
import { createKillerSession } from './killer'
import { isEnvelope } from '../game/validate'
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
    if (muted.has(r.user_id)) return // nem kerül a `seen`-be: a némítás feloldásakor az üzenet visszajöhet
    seen.add(r.id)
    const m: ChatMessage = { id: r.id, userId: r.user_id, username: people.get(r.user_id)?.username ?? '?', body: r.body, at: iso(r.created_at) }
    history.push(m)
    history.sort((a, b) => a.id - b.id)
    msgCbs.forEach((cb) => cb(m))
  }

  async function loadPast() {
    const past = await client.from('room_messages').select('*').eq('room_id', roomId).order('id', { ascending: false }).limit(100)
    const pastRows = ((past.data ?? []) as MsgRow[]).reverse()
    await loadPeople(pastRows.map((r) => r.user_id))
    pastRows.forEach(addMessage)
  }

  await reloadMembers()
  const mutes = await client.from('chat_mutes').select('muted_id')
  ;((mutes.data ?? []) as { muted_id: string }[]).forEach((m) => muted.add(m.muted_id))
  await loadPast()

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

  // --- B5: a közös tábla Broadcast-csatornája (`room:<id>`). Egyetlen eseménynév (`m`), a típus a borítékban van.
  // A szoba azonosítója egy kitalálhatatlan UUID; titkos adat (a Gyilkos-mód szerepei) erre nem megy — az a B6 szerver-oldali csatornája.
  interface Msg { t: string; by: string; p: Record<string, unknown> }
  const handlers = new Map<string, Set<(p: Record<string, unknown>, by: string) => void>>()
  const on = (type: string, cb: (p: Record<string, unknown>, by: string) => void): Unsubscribe => {
    const set = handlers.get(type) ?? new Set()
    handlers.set(type, set)
    set.add(cb)
    return () => set.delete(cb)
  }
  let boardReady = false
  const outbox: Msg[] = []
  const boardCh = client.channel(`room:${roomId}`, { config: { broadcast: { self: false } } })
  boardCh
    .on('broadcast', { event: 'm' }, (msg: { payload?: unknown }) => {
      const m = msg.payload as Msg | undefined
      if (!m || typeof m.t !== 'string' || typeof m.by !== 'string' || m.by === me) return
      if (m.p !== undefined && (typeof m.p !== 'object' || m.p === null || Array.isArray(m.p))) return
      // a csatorna nyilvános (a szoba-azonosító a titok): csak a szoba tagjaitól fogadunk üzenetet; ismeretlen feladónál frissítjük a taglistát
      if (!memberIds.includes(m.by)) {
        void reloadMembers()
        return
      }
      handlers.get(m.t)?.forEach((cb) => cb(m.p ?? {}, m.by))
    })
    .subscribe((status: string) => {
      if (status !== 'SUBSCRIBED') return
      boardReady = true
      for (const m of outbox.splice(0)) void boardCh.send({ type: 'broadcast', event: 'm', payload: m })
    })
  const post = (t: string, p: Record<string, unknown> = {}) => {
    const m: Msg = { t, by: me, p }
    if (!boardReady) {
      outbox.push(m) // a csatorna felépülése előtti üzenetek sorba állnak (a legrégebbiek esnek ki)
      if (outbox.length > 300) outbox.shift()
      return
    }
    void boardCh.send({ type: 'broadcast', event: 'm', payload: m })
  }
  let lamport = 0
  const opCbs = new Set<(e: OpEnvelope) => void>()
  on('op', (p, by) => {
    const env = p.env
    // alak-ellenőrzés + a feladó nem hamisíthatja más nevében a műveletet
    if (!isEnvelope(env) || env.by !== by) return
    lamport = Math.max(lamport, env.seq)
    opCbs.forEach((cb) => cb(env))
  })
  const cursorCbs = new Set<(userId: Uuid, cell: CellId | null) => void>()
  on('cur', (p, by) => cursorCbs.forEach((cb) => cb(by, (p.cell as CellId | null | undefined) ?? null)))
  let lastCursor = 0
  let cursorTimer: ReturnType<typeof setTimeout> | undefined
  let cursorPending: CellId | null | undefined

  // Gyilkos-mód: a szoba játékállapota a szerveren él; a kliens-réteg a Realtime-eseményekből és szívverésből épül
  const killer = info.mode === 'killer' ? createKillerSession(client, roomId) : undefined
  if (killer) infoCbs.add((i) => i.status === 'playing' && void killer.refresh())

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
        killer?.close()
        void client.removeChannel(channel)
        void client.removeChannel(boardCh)
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
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i]!.userId !== userId) continue
            seen.delete(history[i]!.id)
            history.splice(i, 1)
          }
          return ok(undefined)
        }),
      unmute: (userId) =>
        guard(async () => {
          const { error } = await client.from('chat_mutes').delete().eq('user_id', me).eq('muted_id', userId)
          if (error) return fromError(error)
          muted.delete(userId)
          await loadPast() // a némítás alatt érkezett (és a korábbi) üzenetek visszatérnek
          return ok(undefined)
        }),
      muted: () => [...muted],
      onMessage: sub(msgCbs),
    },
    ops: {
      send: (op: Op): OpEnvelope => {
        const env: OpEnvelope = { id: crypto.randomUUID(), by: me, seq: ++lamport, at: Date.now(), op }
        post('op', { env })
        return env
      },
      onOp: sub(opCbs),
      saveState: (rev: number, state: BoardState) =>
        guard(async () => {
          const { data, error } = await client.rpc('save_room_state', { p_room: roomId, p_rev: rev, p_state: state })
          return error ? fromError(error) : ok(Number(data))
        }),
      loadState: () =>
        guard(async () => {
          const { data, error } = await client.from('rooms').select('state, state_rev').eq('id', roomId).single()
          if (error) return fromError(error)
          const row = data as { state: BoardState | null; state_rev: number }
          return ok({ rev: row.state_rev ?? 0, state: (row.state ?? { placed: {}, marks: [], notes: {} }) as BoardState })
        }),
      broadcast: post,
      onBroadcast: on,
    },
    ...(killer ? { killer } : {}),
    cursors: {
      send: (cell: CellId | null) => {
        const now = Date.now()
        if (now - lastCursor >= 100) {
          lastCursor = now
          post('cur', { cell })
          return
        }
        cursorPending = cell // ~10 Hz: a köztes mozgásokból a legutolsó megy ki
        cursorTimer ??= setTimeout(() => {
          cursorTimer = undefined
          lastCursor = Date.now()
          if (cursorPending !== undefined) post('cur', { cell: cursorPending })
          cursorPending = undefined
        }, 100)
      },
      onCursor: (cb) => {
        cursorCbs.add(cb)
        return () => cursorCbs.delete(cb)
      },
    },
    submit: { propose: noop, vote: noop, onProposal: () => noop, onResult: () => noop }, // a közös beküldés a `game/coop.ts`-ben (ops.broadcast-on)
    close: () => {
      clearTimeout(cursorTimer)
      killer?.close()
      void client.removeChannel(channel)
      void client.removeChannel(boardCh)
    },
    finish: (res) =>
      guard(async () => {
        const { error } = await client.rpc('finish_game', { p_room: roomId, p_solved: res.solved, p_ms: Math.round(res.ms) })
        if (error) return fromError(error)
        // a szoba lobbyba áll vissza (a Realtime-esemény is megjön, de a hívó rögtön tudja — pl. a „Következő pálya”)
        info = { ...info, status: 'lobby' }
        delete info.startedAt
        infoCbs.forEach((cb) => cb(info))
        return ok(undefined)
      }),
  }
  return ok(session)
}
