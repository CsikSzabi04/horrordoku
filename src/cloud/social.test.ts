import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createAuth } from './auth'
import { createFriends } from './friends'
import { fromError } from './result'
import { createRooms } from './rooms'
import { CHAT_MIN_GAP_MS } from './roomSession'

const ME = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const ROOM = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
type Res = { data?: unknown; error?: unknown }
interface Cfg { tables?: Record<string, Res>; rpc?: Record<string, Res>; presence?: Record<string, unknown> }
interface Handler { type: string; filter: Record<string, unknown>; cb: (p: { new: unknown }) => void }

function fake(cfg: Cfg = {}) {
  const rpcCalls: { fn: string; args: unknown }[] = []
  const queries: { table: string; ilike?: unknown[] }[] = []
  const handlers: Handler[] = []
  const query = (table: string) => {
    const rec: { table: string; ilike?: unknown[] } = { table }
    queries.push(rec)
    let key = table
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in']) q[m] = () => q
    q.ilike = (...a: unknown[]) => { rec.ilike = a; return q }
    q.insert = () => { key = `${table}:insert`; return q }
    const result = () => cfg.tables?.[key] ?? { data: [], error: null }
    q.single = () => Promise.resolve(result())
    q.then = (res: (v: Res) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej)
    return q
  }
  const channel = () => {
    const ch: Record<string, unknown> = {}
    ch.on = (type: string, filter: Record<string, unknown>, cb: Handler['cb']) => { handlers.push({ type, filter, cb }); return ch }
    ch.subscribe = (cb?: (s: string) => void) => { cb?.('SUBSCRIBED'); return ch }
    ch.track = async () => 'ok'
    ch.presenceState = () => cfg.presence ?? {}
    return ch
  }
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: ME } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return cfg.rpc?.[fn] ?? { data: null, error: null } },
    from: query,
    channel,
    removeChannel: async () => 'ok',
  } as unknown as SupabaseClient
  return { client, rpcCalls, queries, handlers }
}

const roomRow = { id: ROOM, code: 'AB12CD', host_id: ME, mode: 'together', puzzle_ref: 'classic-01', status: 'lobby', max_players: 4, settings: {}, state_rev: 0, started_at: null }

describe('barátok', () => {
  it('a keresés min. 2 karakter, és a szerver-oldali search_profiles-t hívja', async () => {
    const f = fake({ rpc: { search_profiles: { data: [{ id: OTHER, username: 'Vlad_01', avatar: 'vlad', xp: 5 }], error: null } } })
    const api = createFriends(f.client)
    expect(await api.search(' a ')).toEqual({ ok: true, value: [] })
    expect(f.rpcCalls).toHaveLength(0)
    const r = await api.search(' 50%_ ')
    expect(f.rpcCalls[0]).toEqual({ fn: 'search_profiles', args: { p_prefix: '50%_' } })
    expect(r).toEqual({ ok: true, value: [{ id: OTHER, username: 'Vlad_01', avatar: 'vlad', xp: 5 }] })
  })
  it('a lista a requested_by alapján mondja meg, ki küldte a kérést', async () => {
    const rows = [
      { friend_id: OTHER, username: 'Silas', avatar: 'silas', xp: 1, status: 'pending', requested_by: ME, online: true },
      { friend_id: 'x', username: 'Lilith', avatar: 'lilith', xp: 2, status: 'pending', requested_by: 'x' },
    ]
    const r = await createFriends(fake({ tables: { my_friends: { data: rows, error: null } } }).client).list()
    expect(r.ok && r.value.map((v) => v.requestedByMe)).toEqual([true, false])
    expect(r.ok && r.value.map((v) => v.online)).toEqual([true, undefined])
  })
  it('kérés / válasz / törlés a megfelelő függvényt hívja', async () => {
    const f = fake()
    const api = createFriends(f.client)
    await api.request(OTHER)
    await api.respond(OTHER, true)
    await api.remove(OTHER)
    expect(f.rpcCalls).toEqual([
      { fn: 'send_friend_request', args: { p_user: OTHER } },
      { fn: 'respond_friend_request', args: { p_user: OTHER, p_accept: true } },
      { fn: 'remove_friend', args: { p_user: OTHER } },
    ])
  })
  it('a Realtime-változás meghívja a visszahívást', () => {
    const f = fake()
    let n = 0
    createFriends(f.client).onChange(() => n++)
    f.handlers[0]?.cb({ new: {} })
    expect(n).toBe(1)
  })
})

describe('SQL raise → ErrorCode', () => {
  it('a P0001 üzenetek leképezése', () => {
    const e = (message: string) => fromError({ code: 'P0001', message })
    expect(e('room not found or already started')).toMatchObject({ code: 'not_found' })
    expect(e('room is full')).toMatchObject({ code: 'conflict' })
    expect(e('only the host can start a lobby')).toMatchObject({ code: 'forbidden' })
    expect(e('not friends')).toMatchObject({ code: 'forbidden' })
    expect(e('not authenticated')).toMatchObject({ code: 'unauthenticated' })
  })
})

describe('szobák', () => {
  const auth = (f: ReturnType<typeof fake>) => createAuth(f.client).api
  it('létrehozás: argumentumok + RoomInfo', async () => {
    const f = fake({ rpc: { create_room: { data: roomRow, error: null } } })
    const r = await createRooms(f.client, auth(f)).create({ mode: 'together', puzzleRef: 'classic-01', maxPlayers: 3 })
    expect(f.rpcCalls[0]).toEqual({ fn: 'create_room', args: { p_mode: 'together', p_puzzle_ref: 'classic-01', p_max_players: 3, p_settings: {} } })
    expect(r).toMatchObject({ ok: true, value: { id: ROOM, code: 'AB12CD', hostId: ME, status: 'lobby', maxPlayers: 4 } })
  })
  it('belépés: nincs ilyen szoba → not_found, teli szoba → conflict', async () => {
    const miss = fake({ rpc: { join_room: { data: null, error: { code: 'P0001', message: 'room not found or already started' } } } })
    expect(await createRooms(miss.client, auth(miss)).join(' ab12cd ')).toMatchObject({ ok: false, code: 'not_found' })
    expect(miss.rpcCalls[0]?.args).toEqual({ p_code: 'ab12cd' })
    const full = fake({ rpc: { join_room: { data: null, error: { code: 'P0001', message: 'room is full' } } } })
    expect(await createRooms(full.client, auth(full)).join('AB12CD')).toMatchObject({ ok: false, code: 'conflict' })
  })
  it('a meghívók listája', async () => {
    const f = fake({ rpc: { my_invites: { data: [{ room_id: ROOM, code: 'AB12CD', mode: 'killer', from_username: 'Vlad' }], error: null } } })
    expect(await createRooms(f.client, auth(f)).invites()).toEqual({ ok: true, value: [{ roomId: ROOM, code: 'AB12CD', fromUsername: 'Vlad', mode: 'killer' }] })
  })
})

describe('szoba-munkamenet', () => {
  const tables = {
    rooms: { data: roomRow, error: null },
    room_members: { data: [{ user_id: ME }, { user_id: OTHER }], error: null },
    profiles: { data: [{ id: ME, username: 'Én', avatar: 'vlad' }, { id: OTHER, username: 'Silas', avatar: 'silas' }], error: null },
    room_messages: { data: [{ id: 1, room_id: ROOM, user_id: OTHER, body: 'szia', created_at: '2026-10-25T21:00:00+00:00' }], error: null },
    'room_messages:insert': { data: { id: 2, room_id: ROOM, user_id: ME, body: 'hello', created_at: '2026-10-25T21:00:05+00:00' }, error: null },
  }
  async function open(extra: Cfg = {}) {
    const f = fake({ tables, ...extra })
    const r = await createRooms(f.client, createAuth(f.client).api).open(ROOM)
    if (!r.ok) throw new Error('open failed')
    return { f, s: r.value }
  }
  it('betölti a tagokat (színnel, online-állapottal) és a chat-előzményt', async () => {
    const { f, s } = await open({ presence: { [OTHER]: [{}] } })
    expect(s.info()).toMatchObject({ id: ROOM, code: 'AB12CD' })
    expect(s.members().map((m) => [m.username, m.online])).toEqual([['Én', true], ['Silas', false]])
    f.handlers.find((h) => h.type === 'presence')?.cb({ new: {} }) // a szerver Presence-szinkronja
    expect(s.members().map((m) => [m.username, m.online])).toEqual([['Én', true], ['Silas', true]])
    expect(new Set(s.members().map((m) => m.color)).size).toBe(2)
    expect(s.chat.history().map((m) => [m.username, m.body])).toEqual([['Silas', 'szia']])
  })
  it('chat: sebességkorlát, hossz-ellenőrzés, és a Realtime-visszhang nem duplázza az üzenetet', async () => {
    const { f, s } = await open()
    const got: number[] = []
    s.chat.onMessage((m) => got.push(m.id))
    expect(await s.chat.send('   ')).toMatchObject({ ok: false, code: 'invalid' })
    expect(await s.chat.send('x'.repeat(301))).toMatchObject({ ok: false, code: 'invalid' })
    expect(await s.chat.send('hello')).toEqual({ ok: true, value: undefined })
    expect(await s.chat.send('hello2')).toMatchObject({ ok: false, code: 'rate_limited' })
    expect(CHAT_MIN_GAP_MS).toBe(700)
    f.handlers.find((h) => h.type === 'postgres_changes' && h.filter.table === 'room_messages')?.cb({ new: tables['room_messages:insert'].data })
    await new Promise((r) => setTimeout(r, 5))
    expect(got).toEqual([2]) // egyszer
    expect(s.chat.history().map((m) => m.id)).toEqual([1, 2])
  })
  it('indítás: nem host → forbidden; host → az állapot playing-ra vált és értesít', async () => {
    const denied = await open({ rpc: { start_room: { data: null, error: { code: 'P0001', message: 'only the host can start a lobby' } } } })
    expect(await denied.s.start()).toMatchObject({ ok: false, code: 'forbidden' })
    const ok = await open({ rpc: { start_room: { data: { ...roomRow, status: 'playing', started_at: '2026-10-25T21:01:00+00:00' }, error: null } } })
    const seen: string[] = []
    ok.s.onInfo((i) => seen.push(i.status))
    expect(await ok.s.start()).toMatchObject({ ok: true, value: { status: 'playing', startedAt: '2026-10-25T21:01:00Z' } })
    expect(seen).toEqual(['playing'])
  })
  it('jelentés: a report_message-et hívja; némítás: a szerző üzenetei eltűnnek és újak sem jelennek meg', async () => {
    const { f, s } = await open()
    expect(await s.chat.report(1, 'sértő')).toEqual({ ok: true, value: undefined })
    expect(f.rpcCalls.at(-1)).toEqual({ fn: 'report_message', args: { p_message: 1, p_reason: 'sértő' } })
    expect(s.chat.history().map((m) => m.userId)).toEqual([OTHER])
    expect(await s.chat.mute(ME)).toMatchObject({ ok: false, code: 'invalid' })
    expect(await s.chat.mute(OTHER)).toEqual({ ok: true, value: undefined })
    expect(s.chat.history()).toHaveLength(0)
    const got: number[] = []
    s.chat.onMessage((m) => got.push(m.id))
    f.handlers.find((h) => h.filter.table === 'room_messages')?.cb({ new: { id: 9, room_id: ROOM, user_id: OTHER, body: 'újra', created_at: '2026-10-25T21:02:00+00:00' } })
    await new Promise((r) => setTimeout(r, 5))
    expect(got).toEqual([])
  })
  it('a Realtime rooms-UPDATE frissíti az állapotot (lobby → playing)', async () => {
    const { f, s } = await open()
    const seen: string[] = []
    s.onInfo((i) => seen.push(i.status))
    f.handlers.find((h) => h.filter.table === 'rooms')?.cb({ new: { ...roomRow, status: 'playing' } })
    expect(seen).toEqual(['playing'])
    expect(s.info().status).toBe('playing')
  })
})
