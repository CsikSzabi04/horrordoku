import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scopeOf } from './auth'
import { fromError, guard } from './result'
import { createCloud } from './service'

const UID = '11111111-2222-3333-4444-555555555555'
const authUser = { id: UID, email: 'a@b.hu', user_metadata: { username: 'MetaName' }, identities: [{}] }
const sleep = (ms = 5) => new Promise((r) => setTimeout(r, ms))

type Res = { data?: unknown; error?: unknown }
interface Cfg {
  rpc?: Res | (() => Res | Promise<Res>)
  signIn?: Res | (() => Res | Promise<Res>)
  signUp?: Res
  profileRow?: Res
  statsRow?: Res
  updateRow?: Res
  session?: { user: { id: string } } | null
}

function chain(res: () => Res) {
  const c: Record<string, () => unknown> = {}
  for (const k of ['select', 'eq', 'update']) c[k] = () => c
  c.single = () => Promise.resolve(res())
  c.maybeSingle = c.single
  return c
}

function fake(cfg: Cfg = {}) {
  let authCb: ((e: string, s: unknown) => void) | undefined
  const calls = { signUp: 0, signOut: [] as unknown[] }
  const val = (v: Res | (() => Res | Promise<Res>)): Res | Promise<Res> => (typeof v === 'function' ? v() : v)
  const client = {
    auth: {
      onAuthStateChange: (cb: typeof authCb) => {
        authCb = cb
        return { data: { subscription: { unsubscribe() {} } } }
      },
      getSession: async () => ({ data: { session: cfg.session ?? null } }),
      signInWithPassword: async () => val(cfg.signIn ?? { data: { user: authUser }, error: null }),
      signUp: async () => {
        calls.signUp++
        return cfg.signUp ?? { data: { user: authUser, session: {} }, error: null }
      },
      signOut: async (o?: unknown) => {
        calls.signOut.push(o)
        return { error: null }
      },
      resetPasswordForEmail: async () => ({ error: null }),
    },
    rpc: async () => val(cfg.rpc ?? { data: true, error: null }),
    from: (t: string) =>
      chain(() => {
        if (t === 'profile_stats') return cfg.statsRow ?? { data: null, error: null }
        return cfg.updateRow && cfg.updateRow !== cfg.profileRow ? cfg.updateRow : (cfg.profileRow ?? { data: { username: 'Vlad' }, error: null })
      }),
  } as unknown as SupabaseClient
  return { client, calls, emit: (e: string, s: unknown) => authCb?.(e, s) }
}

afterEach(() => vi.useRealTimers())

describe('hibaleképezés', () => {
  it('hálózat → offline, 429 → rate_limited, 5xx → server, rossz jelszó → unauthenticated, 23505 → conflict', () => {
    expect(fromError(new TypeError('Failed to fetch'))).toMatchObject({ code: 'offline' })
    expect(fromError({ name: 'AuthRetryableFetchError', status: 0 })).toMatchObject({ code: 'offline' })
    expect(fromError({ status: 429 })).toMatchObject({ code: 'rate_limited' })
    expect(fromError({ status: 503, message: 'x' })).toMatchObject({ code: 'server' })
    expect(fromError({ status: 400, code: 'invalid_credentials' })).toMatchObject({ code: 'unauthenticated' })
    expect(fromError({ code: '23505' })).toMatchObject({ code: 'conflict' })
    expect(fromError({ code: 'PGRST116' })).toMatchObject({ code: 'not_found' })
  })
  it('az időkorlát offline hibát ad, a kivétel pedig Result lesz', async () => {
    vi.useFakeTimers()
    const p = guard(() => new Promise<never>(() => undefined), 50)
    await vi.advanceTimersByTimeAsync(60)
    expect(await p).toMatchObject({ ok: false, code: 'offline', message: 'timeout' })
    vi.useRealTimers()
    expect(await guard(async () => { throw new TypeError('Failed to fetch') })).toMatchObject({ ok: false, code: 'offline' })
  })
})

describe('auth', () => {
  it('rossz jelszó: unauthenticated, nincs bejelentkezett felhasználó', async () => {
    const f = fake({ signIn: { data: { user: null }, error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } } })
    const cloud = createCloud(f.client)
    expect(await cloud.auth.signIn({ email: 'a@b.hu', password: 'x' })).toMatchObject({ ok: false, code: 'unauthenticated' })
    expect(cloud.auth.current()).toBeNull()
    expect(cloud.status()).toBe('guest')
  })
  it('hálózat nélkül a belépés offline hibát ad (nem dob)', async () => {
    const f = fake({ signIn: async () => { throw new TypeError('Failed to fetch') } })
    expect(await createCloud(f.client).auth.signIn({ email: 'a@b.hu', password: 'x' })).toMatchObject({ ok: false, code: 'offline' })
  })
  it('foglalt becenév: conflict, és a regisztráció nem is indul el', async () => {
    const f = fake({ rpc: { data: false, error: null } })
    expect(await createCloud(f.client).auth.signUp({ email: 'a@b.hu', password: 'pw123456', username: 'Vlad' })).toMatchObject({ ok: false, code: 'conflict', message: 'username_taken' })
    expect(f.calls.signUp).toBe(0)
  })
  it('érvénytelen becenév-hossz: invalid', async () => {
    const cloud = createCloud(fake().client)
    expect(await cloud.auth.usernameAvailable('ab')).toMatchObject({ ok: false, code: 'invalid' })
    expect(await cloud.auth.signUp({ email: 'a@b.hu', password: 'pw123456', username: 'x'.repeat(17) })).toMatchObject({ ok: false, code: 'invalid' })
  })
  it('regisztráció: már létező e-mail (üres identities) → conflict', async () => {
    const f = fake({ signUp: { data: { user: { ...authUser, identities: [] }, session: null }, error: null } })
    expect(await createCloud(f.client).auth.signUp({ email: 'a@b.hu', password: 'pw123456', username: 'Vlad' })).toMatchObject({ ok: false, code: 'conflict', message: 'email_taken' })
  })
  it('belépés → current(), onChange, scope, status; kilépés → guest', async () => {
    const f = fake({ profileRow: { data: { username: 'Vlad' }, error: null } })
    const scopes: string[] = []
    const users: (string | null)[] = []
    const cloud = createCloud(f.client, { onScope: (s) => scopes.push(s) })
    cloud.auth.onChange((u) => users.push(u?.username ?? null))
    const r = await cloud.auth.signIn({ email: 'a@b.hu', password: 'pw123456' })
    expect(r).toEqual({ ok: true, value: { id: UID, email: 'a@b.hu', username: 'Vlad' } })
    expect(cloud.status()).toBe('idle')
    expect(scopes).toEqual(['u_11111111'])
    expect(await cloud.auth.signOut()).toEqual({ ok: true, value: undefined })
    expect(cloud.auth.current()).toBeNull()
    expect(cloud.status()).toBe('guest')
    expect(scopes).toEqual(['u_11111111', 'guest'])
    expect(users).toEqual(['Vlad', null])
  })
  it('oldal-újratöltés után (INITIAL_SESSION) automatikusan belép', async () => {
    const f = fake()
    const cloud = createCloud(f.client)
    expect(cloud.auth.current()).toBeNull()
    f.emit('INITIAL_SESSION', { user: authUser })
    await sleep()
    expect(cloud.auth.current()).toMatchObject({ id: UID, username: 'Vlad' })
    expect(cloud.status()).toBe('idle')
  })
  it('a scope a felhasználó id-jából képződik', () => {
    expect(scopeOf(null)).toBe('guest')
    expect(scopeOf({ id: UID, email: '', username: '' })).toBe('u_11111111')
  })
})

describe('profil', () => {
  const row = { id: UID, username: 'Vlad', avatar: 'candle', xp: 10, coins: 2, streak: 1, best_streak: 3, last_daily: null, created_at: '2026-10-25T21:19:44.123+00:00' }
  it('belépés nélkül unauthenticated', async () => {
    const p = createCloud(fake().client).profile
    expect(await p.get()).toMatchObject({ ok: false, code: 'unauthenticated' })
    expect(await p.stats()).toMatchObject({ ok: false, code: 'unauthenticated' })
    expect(await p.update({ avatar: 'vlad' })).toMatchObject({ ok: false, code: 'unauthenticated' })
  })
  it('get: oszlopok → Profile (ISO-idő ezredmásodperc nélkül)', async () => {
    const f = fake({ session: { user: { id: UID } }, profileRow: { data: row, error: null } })
    expect(await createCloud(f.client).profile.get()).toEqual({
      ok: true,
      value: { id: UID, username: 'Vlad', avatar: 'candle', xp: 10, coins: 2, streak: 1, bestStreak: 3, createdAt: '2026-10-25T21:19:44Z' },
    })
  })
  it('stats: még nincs futás → csupa nulla', async () => {
    const f = fake({ session: { user: { id: UID } } })
    expect(await createCloud(f.client).profile.stats()).toEqual({
      ok: true,
      value: { solvedTotal: 0, solvedNoHints: 0, jumpscares: 0, playTimeMs: 0, coopGames: 0, winsAsKiller: 0, winsAsDetective: 0 },
    })
  })
  it('update: foglalt becenév → conflict; rövid becenév → invalid; siker → frissül a current()', async () => {
    const session = { user: { id: UID } }
    const taken = fake({ session, updateRow: { data: null, error: { code: '23505', message: 'duplicate' } } })
    expect(await createCloud(taken.client).profile.update({ username: 'Vlad2' })).toMatchObject({ ok: false, code: 'conflict' })
    expect(await createCloud(taken.client).profile.update({ username: 'ab' })).toMatchObject({ ok: false, code: 'invalid' })
    const good = fake({ session, updateRow: { data: { ...row, username: 'Silas' }, error: null } })
    const cloud = createCloud(good.client)
    good.emit('INITIAL_SESSION', { user: authUser })
    await sleep()
    expect(await cloud.profile.update({ username: 'Silas' })).toMatchObject({ ok: true })
    expect(cloud.auth.current()?.username).toBe('Silas')
  })
  it('export és fiók-törlés még nem elérhető (B3)', async () => {
    const p = createCloud(fake().client).profile
    expect(await p.exportData()).toMatchObject({ ok: false, message: 'not_implemented' })
    expect(await p.deleteAccount()).toMatchObject({ ok: false, message: 'not_implemented' })
  })
})
