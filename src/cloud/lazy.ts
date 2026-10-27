// Lusta felhő-homlokzat: a Supabase-kliens (~55 KB tömörítve) nem az induló csomagban van. A homlokzat azonnal használható (vendégként /
// „nincs bejelentkezve"), a valódi szolgáltatás betöltődése után minden feliratkozás átköt rá, a hívások pedig megvárják a betöltést.
import type { Unsubscribe } from '../shared/base'
import type { CloudService } from '../shared/cloud'
import { NullCloud } from './null'

type Fn = (...a: unknown[]) => unknown
const NAMESPACES = ['auth', 'profile', 'sync', 'catalog', 'leaderboard', 'friends', 'rooms'] as const
/** Feliratkozó metódusok: az átkötést a homlokzat intézi. */
const SUBSCRIBERS = new Set(['onChange', 'onInvite', 'onStatus'])

export function createLazyCloud(loadReal: () => Promise<CloudService>): { cloud: CloudService; load: () => Promise<CloudService | null> } {
  let real: CloudService | null = null
  let loading: Promise<CloudService | null> | null = null
  const pending: ((r: CloudService) => void)[] = []

  const load = (): Promise<CloudService | null> =>
    (loading ??= loadReal()
      .then((r) => {
        real = r
        for (const bind of pending.splice(0)) bind(r)
        return r
      })
      .catch(() => {
        loading = null // pl. offline: a következő híváskor újra próbáljuk
        return null
      }))

  const subscribe = (pick: (r: CloudService) => (cb: never) => Unsubscribe) => (cb: never): Unsubscribe => {
    let off: Unsubscribe | null = null
    let dead = false
    const bind = (r: CloudService) => {
      if (!dead) off = pick(r)(cb)
    }
    if (real) bind(real)
    else pending.push(bind)
    return () => {
      dead = true
      off?.()
    }
  }

  const cloud: Record<string, unknown> = {
    status: () => (real ? real.status() : 'guest'),
    onStatus: subscribe((r) => r.onStatus.bind(r) as never),
  }
  for (const ns of NAMESPACES) {
    const base = NullCloud[ns] as unknown as Record<string, Fn>
    const api: Record<string, unknown> = {}
    for (const key of Object.keys(base)) {
      if (SUBSCRIBERS.has(key)) api[key] = subscribe((r) => (r[ns] as unknown as Record<string, Fn>)[key]!.bind(r[ns]) as never)
      else if (ns === 'auth' && key === 'current') api[key] = () => (real ? real.auth.current() : null)
      else
        api[key] = async (...args: unknown[]) => {
          const r = await load()
          const target = (r ?? NullCloud)[ns] as unknown as Record<string, Fn>
          return target[key]!(...args)
        }
    }
    cloud[ns] = api
  }
  return { cloud: cloud as unknown as CloudService, load }
}
