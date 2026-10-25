// B7: ranglista, nyilvános profil, online-állapot (szívverés).
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthApi } from '../shared/cloud'
import { createAuth } from './auth'
import { createLeaderboard } from './leaderboard'
import { HEARTBEAT_MS, startPresence } from './presence'
import { createProfile } from './profile'

const ME = '11111111-1111-1111-1111-111111111111'
type Res = { data?: unknown; error?: unknown }

function fakeClient(rpc: Record<string, Res> = {}) {
  const calls: { fn: string; args: unknown }[] = []
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: ME } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    rpc: async (fn: string, args: unknown) => { calls.push({ fn, args }); return rpc[fn] ?? { data: null, error: null } },
  } as unknown as SupabaseClient
  return { client, calls }
}
afterEach(() => vi.useRealTimers())

describe('ranglista', () => {
  it('a beküldés a submit_score-t hívja (egész ezredmásodperc), a hibák Result-ok', async () => {
    const f = fakeClient()
    expect(await createLeaderboard(f.client).submit('daily:2026-10-25', 90000.4, 1)).toEqual({ ok: true, value: undefined })
    expect(f.calls[0]).toEqual({ fn: 'submit_score', args: { p_board: 'daily:2026-10-25', p_ms: 90000, p_hints: 1 } })
    const bad = fakeClient({ submit_score: { data: null, error: { code: 'P0001', message: 'invalid time' } } })
    expect(await createLeaderboard(bad.client).submit('daily:2026-10-25', 10, 0)).toMatchObject({ ok: false, code: 'invalid' })
  })
  it('a toplista leképezi a sorokat', async () => {
    const f = fakeClient({ leaderboard_top: { data: [{ username: 'Vlad', avatar: 'vlad', time_ms: 70000, hints_used: 0 }], error: null } })
    expect(await createLeaderboard(f.client).top('daily:2026-10-25', 10)).toEqual({ ok: true, value: [{ username: 'Vlad', avatar: 'vlad', ms: 70000 }] })
    expect(f.calls[0]).toEqual({ fn: 'leaderboard_top', args: { p_board: 'daily:2026-10-25', p_n: 10 } })
  })
})

describe('nyilvános profil', () => {
  const profile = (rpc: Res) => {
    const f = fakeClient({ public_profile: rpc })
    return createProfile(f.client, { api: createAuth(f.client).api, patchUser() {} }).publicProfile(ME)
  }
  it('a bigint-számlálók számmá alakulnak; nem látható profilnál null', async () => {
    const row = { id: ME, username: 'Vlad', avatar: 'vlad', xp: 10, best_streak: 3, solved_total: '5', solved_no_hints: 2, coop_games: '1', wins_as_detective: 0, wins_as_killer: 1 }
    expect(await profile({ data: [row], error: null })).toEqual({
      ok: true, value: { id: ME, username: 'Vlad', avatar: 'vlad', xp: 10, bestStreak: 3, solvedTotal: 5, solvedNoHints: 2, coopGames: 1, winsAsDetective: 0, winsAsKiller: 1 },
    })
    expect(await profile({ data: [], error: null })).toEqual({ ok: true, value: null })
  })
})

describe('online-állapot (szívverés)', () => {
  const settings = (invisible: boolean) => ({ getSettings: async () => ({ invisible }) as never })
  const auth = (loggedIn: boolean) => ({ current: () => (loggedIn ? { id: ME, email: '', username: '' } : null), onChange: () => () => undefined }) as unknown as AuthApi
  const flush = () => vi.advanceTimersByTimeAsync(0)

  it('azonnal és percenként jelez, a láthatatlan módot átadja, és leállítható', async () => {
    vi.useFakeTimers()
    const f = fakeClient()
    const stop = startPresence(f.client, auth(true), settings(true))
    await flush()
    expect(f.calls).toEqual([{ fn: 'touch_presence', args: { p_invisible: true } }])
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
    expect(f.calls).toHaveLength(2)
    stop()
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 3)
    expect(f.calls).toHaveLength(2)
  })
  it('kijelentkezve vagy rejtett lapnál nem jelez; a hiba nem dob', async () => {
    vi.useFakeTimers()
    const out = fakeClient()
    startPresence(out.client, auth(false), settings(false))
    const hidden = fakeClient()
    startPresence(hidden.client, auth(true), settings(false), { visibilityState: 'hidden' })
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
    expect(out.calls).toHaveLength(0)
    expect(hidden.calls).toHaveLength(0)
    const broken = { auth: {}, rpc: async () => { throw new TypeError('Failed to fetch') } } as unknown as SupabaseClient
    startPresence(broken, auth(true), settings(false))
    await expect(vi.advanceTimersByTimeAsync(HEARTBEAT_MS)).resolves.not.toThrow()
  })
})
