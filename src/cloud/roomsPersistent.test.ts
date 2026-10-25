// 0005: tartós szobák — lista, kukucskálás, nyitás/zárás, beállítás, törlés, követés, statisztika, hibaszövegek.
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { errorText } from './errors'
import { fromError } from './result'
import { createAuth } from './auth'
import { createRooms } from './rooms'

const ROOM = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OWNER = '11111111-1111-1111-1111-111111111111'
type Res = { data?: unknown; error?: unknown }

function fake(rpc: Record<string, Res> = {}) {
  const calls: { fn: string; args: unknown }[] = []
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: OWNER } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args })
      return rpc[fn] ?? { data: null, error: null }
    },
  } as unknown as SupabaseClient
  return { client, calls, api: createRooms(client, createAuth(client).api) }
}

const roomRow = { id: ROOM, code: 'AB12CD', host_id: OWNER, mode: 'together', puzzle_ref: 'classic-01', status: 'lobby', max_players: 3, settings: {}, state_rev: 0, started_at: null, name: 'Péntek', is_open: true }

describe('szobáim (my_rooms)', () => {
  it('a bigint-számlálók számmá alakulnak, a saját és a mások szobái jelölve vannak', async () => {
    const f = fake({
      my_rooms: {
        data: [
          { room_id: ROOM, code: 'AB12CD', name: 'Péntek', mode: 'together', puzzle_ref: 'classic-01', status: 'lobby', is_open: false, max_players: 3, owner_id: OWNER, owner_username: 'Vlad', is_owner: true, is_member: true, member_count: '1', games_played: '3', games_solved: '2', last_played: '2026-10-25T21:00:00.123+00:00', created_at: '2026-10-20T10:00:00+00:00' },
          { room_id: 'b', code: 'ZZ99ZZ', name: '', mode: 'killer', puzzle_ref: 'x', status: 'playing', is_open: true, max_players: 6, owner_id: 'o', owner_username: 'Silas', is_owner: false, is_member: false, member_count: 2, games_played: 0, games_solved: 0, last_played: null, created_at: '2026-10-21T10:00:00Z' },
        ],
        error: null,
      },
    })
    const r = await f.api.mine()
    expect(r.ok && r.value[0]).toEqual({
      id: ROOM, code: 'AB12CD', name: 'Péntek', mode: 'together', puzzleRef: 'classic-01', status: 'lobby', isOpen: false, maxPlayers: 3, ownerId: OWNER, ownerUsername: 'Vlad',
      isOwner: true, isMember: true, memberCount: 1, gamesPlayed: 3, gamesSolved: 2, lastPlayed: '2026-10-25T21:00:00Z', createdAt: '2026-10-20T10:00:00Z',
    })
    expect(r.ok && r.value[1]).toMatchObject({ isOwner: false, isMember: false, mode: 'killer', status: 'playing' })
    expect(r.ok && 'lastPlayed' in r.value[1]!).toBe(false)
  })
})

describe('kukucskálás (room_peek)', () => {
  it('rövid kódra nem is kérdez; ismeretlen kódra null; ismerősre a zárt/nyitott állapot látszik', async () => {
    const f = fake({ room_peek: { data: [{ room_id: ROOM, code: 'AB12CD', name: 'Péntek', mode: 'together', status: 'lobby', is_open: false, max_players: 3, owner_username: 'Vlad', member_count: '1', is_member: false }], error: null } })
    expect(await f.api.peek(' ab1 ')).toEqual({ ok: true, value: null })
    expect(f.calls).toHaveLength(0)
    const r = await f.api.peek(' ab12cd ')
    expect(f.calls[0]).toEqual({ fn: 'room_peek', args: { p_code: 'ab12cd' } })
    expect(r).toEqual({ ok: true, value: { id: ROOM, code: 'AB12CD', name: 'Péntek', mode: 'together', status: 'lobby', isOpen: false, maxPlayers: 3, ownerUsername: 'Vlad', memberCount: 1, isMember: false } })
    const none = fake({ room_peek: { data: [], error: null } })
    expect(await none.api.peek('ZZZZZZ')).toEqual({ ok: true, value: null })
  })
})

describe('szoba-műveletek', () => {
  it('létrehozás: név + zárt ajtó (isOpen a válaszból), a limit hibaüzenete', async () => {
    const f = fake({ create_room: { data: { ...roomRow, is_open: false }, error: null } })
    const r = await f.api.create({ mode: 'together', puzzleRef: 'classic-01', name: 'Péntek', maxPlayers: 3 })
    expect(f.calls[0]).toEqual({ fn: 'create_room', args: { p_mode: 'together', p_puzzle_ref: 'classic-01', p_max_players: 3, p_settings: {}, p_name: 'Péntek' } })
    expect(r).toMatchObject({ ok: true, value: { name: 'Péntek', isOpen: false, hostId: OWNER } })
    const full = fake({ create_room: { data: null, error: { code: 'P0001', message: 'room limit reached' } } })
    const e = await full.api.create({ mode: 'together', puzzleRef: 'x' })
    expect(e).toMatchObject({ ok: false, code: 'conflict' })
    expect(e.ok ? '' : errorText(e)).toContain('5 saját szob')
  })
  it('nyitás / beállítás / törlés / kilépés / követés a megfelelő függvényt hívja', async () => {
    const f = fake({ set_room_open: { data: roomRow, error: null }, configure_room: { data: { ...roomRow, name: 'Új' }, error: null } })
    expect(await f.api.setOpen(ROOM, true)).toMatchObject({ ok: true, value: { isOpen: true } })
    expect(await f.api.configure(ROOM, { name: 'Új', puzzleRef: 'classic-02' })).toMatchObject({ ok: true, value: { name: 'Új' } })
    await f.api.remove(ROOM)
    await f.api.leave(ROOM)
    await f.api.follow(' ab12cd ')
    await f.api.unfollow(ROOM)
    expect(f.calls).toEqual([
      { fn: 'set_room_open', args: { p_room: ROOM, p_open: true } },
      { fn: 'configure_room', args: { p_room: ROOM, p_name: 'Új', p_puzzle_ref: 'classic-02', p_max_players: null, p_settings: null } },
      { fn: 'delete_room', args: { p_room: ROOM } },
      { fn: 'leave_room', args: { p_room: ROOM } },
      { fn: 'follow_room', args: { p_code: 'ab12cd' } },
      { fn: 'unfollow_room', args: { p_room: ROOM } },
    ])
  })
  it('csak a tulajdonos: a hiba forbidden', async () => {
    const f = fake({ delete_room: { data: null, error: { code: 'P0001', message: 'only the owner can delete the room' } } })
    expect(await f.api.remove(ROOM)).toMatchObject({ ok: false, code: 'forbidden' })
  })
})

describe('statisztika', () => {
  it('room_stats leképezése (null → hiányzó mező), üres válasznál csupa nulla', async () => {
    const f = fake({ room_stats: { data: [{ games_played: '3', games_solved: '2', best_ms: 70000, avg_ms: 80000, total_ms: '210000', first_played: '2026-10-20T10:00:00+00:00', last_played: '2026-10-25T21:00:00+00:00' }], error: null } })
    expect(await f.api.stats(ROOM)).toEqual({ ok: true, value: { gamesPlayed: 3, gamesSolved: 2, bestMs: 70000, avgMs: 80000, totalMs: 210000, firstPlayed: '2026-10-20T10:00:00Z', lastPlayed: '2026-10-25T21:00:00Z' } })
    const none = fake({ room_stats: { data: [{ games_played: 0, games_solved: 0, best_ms: null, avg_ms: null, total_ms: 0, first_played: null, last_played: null }], error: null } })
    expect(await none.api.stats(ROOM)).toEqual({ ok: true, value: { gamesPlayed: 0, gamesSolved: 0, totalMs: 0 } })
    expect(await fake().api.stats(ROOM)).toEqual({ ok: true, value: { gamesPlayed: 0, gamesSolved: 0, totalMs: 0 } })
  })
  it('a legutóbbi játékok: folyamatban lévő játéknak nincs vége/eredménye', async () => {
    const f = fake({ room_recent_games: { data: [{ started_at: '2026-10-25T21:00:00Z', ended_at: null, puzzle_ref: 'classic-01', players: 2, solved: null, ms: null }, { started_at: '2026-10-24T21:00:00Z', ended_at: '2026-10-24T21:05:00Z', puzzle_ref: 'classic-01', players: 3, solved: true, ms: 300000 }], error: null } })
    const r = await f.api.recentGames(ROOM, 2)
    expect(f.calls[0]).toEqual({ fn: 'room_recent_games', args: { p_room: ROOM, p_n: 2 } })
    expect(r).toEqual({ ok: true, value: [{ startedAt: '2026-10-25T21:00:00Z', puzzleRef: 'classic-01', players: 2 }, { startedAt: '2026-10-24T21:00:00Z', endedAt: '2026-10-24T21:05:00Z', puzzleRef: 'classic-01', players: 3, solved: true, ms: 300000 }] })
  })
})

describe('hibaszövegek', () => {
  const e = (message: string) => errorText(fromError({ code: 'P0001', message }) as never)
  it('zárt szoba, már elindult, teli szoba, follow- és barát-limit', () => {
    expect(e('room is closed — the owner has not opened it yet')).toContain('zárva')
    expect(e('room already started')).toContain('elindult')
    expect(e('room is full')).toContain('megtelt')
    expect(e('follow limit reached')).toContain('20')
    expect(e('friend limit reached')).toContain('100')
    expect(e('the owner cannot leave the room — delete it instead')).toBeTruthy()
  })
  it('a hiba-kódok leképezése', () => {
    expect(fromError({ code: 'P0001', message: 'room is closed — the owner has not opened it yet' })).toMatchObject({ code: 'forbidden' })
    expect(fromError({ code: 'P0001', message: 'room limit reached' })).toMatchObject({ code: 'conflict' })
    expect(fromError({ code: 'P0001', message: 'only the owner can open or close the room (not during a game)' })).toMatchObject({ code: 'forbidden' })
  })
})

describe('szoba-munkamenet lezárása', () => {
  it('a finish_game-et hívja, a close nem lép ki a szobából', async () => {
    const rpcCalls: string[] = []
    const removed: unknown[] = []
    const chain = (res: Res) => {
      const c: Record<string, unknown> = {}
      for (const k of ['select', 'eq', 'order', 'limit', 'in']) c[k] = () => c
      c.single = () => Promise.resolve(res)
      c.then = (ok: (v: Res) => unknown) => Promise.resolve(ok(res))
      return c
    }
    const channel = () => {
      const ch: Record<string, unknown> = {}
      ch.on = () => ch
      ch.subscribe = () => ch
      ch.track = async () => 'ok'
      ch.presenceState = () => ({})
      return ch
    }
    const client = {
      auth: { getSession: async () => ({ data: { session: { user: { id: OWNER } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
      rpc: vi.fn(async (fn: string) => (rpcCalls.push(fn), { data: roomRow, error: null })),
      from: (t: string) => chain(t === 'rooms' ? { data: roomRow, error: null } : { data: [], error: null }),
      channel,
      removeChannel: async (c: unknown) => removed.push(c),
    } as unknown as SupabaseClient
    const s = await createRooms(client, createAuth(client).api).open(ROOM)
    if (!s.ok) throw new Error('open')
    expect(s.value.info()).toMatchObject({ name: 'Péntek', isOpen: true })
    expect(await s.value.finish({ solved: true, ms: 91234.6 })).toEqual({ ok: true, value: undefined })
    expect(rpcCalls).toEqual(['finish_game'])
    s.value.close()
    expect(removed).toHaveLength(1)
    expect(rpcCalls).not.toContain('leave_room') // a tagság megmarad
  })
})
