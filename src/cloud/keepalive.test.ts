// A Vercel keep-alive függvény (api/keepalive.js): jogosultság, hiányzó beállítás, siker, upstream-hiba.
import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error — sima JS (Vercel függvény), nincs típus-deklarációja
import handler from '../../api/keepalive.js'

type Res = { status: (c: number) => Res; json: (b: unknown) => Res; code?: number; body?: unknown }
const res = (): Res => {
  const r: Res = { status: (c) => ((r.code = c), r), json: (b) => ((r.body = b), r) }
  return r
}
const req = (authorization?: string) => ({ headers: authorization ? { authorization } : {} })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('api/keepalive', () => {
  it('token nélkül / rossz tokennel / CRON_SECRET nélkül 401', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    const a = res()
    await handler(req(), a)
    expect(a.code).toBe(401)
    const b = res()
    await handler(req('Bearer rossz'), b)
    expect(b.code).toBe(401)
    vi.stubEnv('CRON_SECRET', '')
    const c = res()
    await handler(req('Bearer '), c)
    expect(c.code).toBe(401)
  })
  it('hiányzó Supabase-beállításnál 500', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('SUPABASE_URL', '')
    const r = res()
    await handler(req('Bearer s3cret'), r)
    expect(r.code).toBe(500)
  })
  it('siker: a ping RPC-t az apikey fejléccel hívja (Authorization nélkül), 200', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co/')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_abc')
    const fetchMock = vi.fn(async () => new Response('"pong"', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const r = res()
    await handler(req('Bearer s3cret'), r)
    expect(r.code).toBe(200)
    expect(r.body).toEqual({ ok: true, ping: 'pong' })
    const call = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(call[0]).toBe('https://x.supabase.co/rest/v1/rpc/ping')
    expect(call[1].headers).toEqual({ apikey: 'sb_publishable_abc', 'Content-Type': 'application/json' })
  })
  it('a Supabase hibája 502, a hálózati hiba is 502', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"paused"}', { status: 503 })))
    const a = res()
    await handler(req('Bearer s3cret'), a)
    expect(a.code).toBe(502)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))
    const b = res()
    await handler(req('Bearer s3cret'), b)
    expect(b.code).toBe(502)
    expect(b.body).toEqual({ ok: false, error: 'boom' })
  })
})
