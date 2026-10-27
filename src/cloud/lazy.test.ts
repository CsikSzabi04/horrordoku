import { describe, expect, it } from 'vitest'
import type { CloudService, CloudStatus } from '../shared/cloud'
import { createLazyCloud } from './lazy'
import { NullCloud } from './null'

/** Kamu „valódi” felhő: a hívásokat naplózza, az eseményeket kézzel lehet kiváltani. */
function fakeReal() {
  const statusCbs = new Set<(s: CloudStatus) => void>()
  const userCbs = new Set<(u: { id: string; email: string; username: string } | null) => void>()
  let user: { id: string; email: string; username: string } | null = { id: 'u1', email: 'a@b.hu', username: 'Vlad' }
  const calls: string[] = []
  const real = {
    ...NullCloud,
    status: () => 'idle' as CloudStatus,
    onStatus(cb: (s: CloudStatus) => void) {
      statusCbs.add(cb)
      return () => statusCbs.delete(cb)
    },
    auth: {
      ...NullCloud.auth,
      current: () => user,
      onChange(cb: (u: typeof user) => void) {
        userCbs.add(cb)
        return () => userCbs.delete(cb)
      },
      async signIn() {
        calls.push('signIn')
        return { ok: true as const, value: user! }
      },
    },
  } as unknown as CloudService
  return { real, calls, statusCbs, userCbs, setUser: (u: typeof user) => ((user = u), userCbs.forEach((cb) => cb(u))) }
}

describe('lusta felhő-homlokzat', () => {
  it('betöltés előtt vendég; a hívás megvárja a betöltést, és a valódi szolgáltatást hívja', async () => {
    const f = fakeReal()
    let resolve!: () => void
    const gate = new Promise<void>((r) => (resolve = r))
    const { cloud, load } = createLazyCloud(async () => (await gate, f.real))
    expect(cloud.status()).toBe('guest')
    expect(cloud.auth.current()).toBeNull()
    const p = cloud.auth.signIn({ email: 'a@b.hu', password: 'x' })
    expect(f.calls).toEqual([])
    resolve()
    expect(await p).toMatchObject({ ok: true })
    expect(f.calls).toEqual(['signIn'])
    await load()
    expect(cloud.status()).toBe('idle')
    expect(cloud.auth.current()?.username).toBe('Vlad')
  })

  it('a betöltés előtti feliratkozás a betöltés után átköt, a leiratkozás működik', async () => {
    const f = fakeReal()
    const { cloud, load } = createLazyCloud(async () => f.real)
    const seen: (string | null)[] = []
    const off = cloud.auth.onChange((u) => seen.push(u?.username ?? null))
    const dropped: (string | null)[] = []
    const off2 = cloud.auth.onChange((u) => dropped.push(u?.username ?? null))
    off2() // betöltés előtt leiratkozik: sosem kötődik be
    const statuses: CloudStatus[] = []
    cloud.onStatus((s) => statuses.push(s))
    await load()
    expect(f.userCbs.size).toBe(1)
    f.setUser(null)
    f.statusCbs.forEach((cb) => cb('syncing'))
    expect(seen).toEqual([null])
    expect(dropped).toEqual([])
    expect(statuses).toEqual(['syncing'])
    off()
    expect(f.userCbs.size).toBe(0)
    // betöltés UTÁNI feliratkozás azonnal a valódira megy
    const later: string[] = []
    cloud.auth.onChange((u) => later.push(u ? 'be' : 'ki'))
    f.setUser({ id: 'u2', email: 'x@y.hu', username: 'Ivan' })
    expect(later).toEqual(['be'])
  })

  it('ha a betöltés elbukik (offline), a hívás NullCloud-eredményt ad, és a következő híváskor újra próbálja', async () => {
    const f = fakeReal()
    let tries = 0
    const { cloud } = createLazyCloud(async () => {
      if (++tries === 1) throw new Error('chunk load failed')
      return f.real
    })
    expect(await cloud.auth.signIn({ email: 'a@b.hu', password: 'x' })).toMatchObject({ ok: false, code: 'offline' })
    expect(await cloud.auth.signIn({ email: 'a@b.hu', password: 'x' })).toMatchObject({ ok: true })
    expect(tries).toBe(2)
  })

  it('a vendég-átvitel kérdése offline hamis (nem hiba)', async () => {
    const { cloud } = createLazyCloud(async () => {
      throw new Error('offline')
    })
    expect(await cloud.sync.guestData()).toBe(false)
  })
})
