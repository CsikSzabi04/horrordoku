// A valódi CloudService: auth + profil (B1). Ami még nem kész (sync, katalógus, barátok, szobák…), azt a NullCloud adja.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CloudService, CloudStatus } from '../shared/cloud'
import { createAuth, scopeOf } from './auth'
import { NullCloud } from './null'
import { createProfile } from './profile'

export interface CloudOptions {
  /** Belépéskor/kilépéskor hívódik ('guest' | 'u_xxxxxxxx') — ide köti az app a `StorageService.setScope()`-ot. */
  onScope?: (scope: string) => void
  /** Jelszó-visszaállító és megerősítő e-mailek visszatérési címe. */
  redirectTo?: string
}

export function createCloud(client: SupabaseClient, opts: CloudOptions = {}): CloudService {
  const hub = createAuth(client, opts)
  const listeners = new Set<(s: CloudStatus) => void>()
  const status = (): CloudStatus => (hub.api.current() ? 'idle' : 'guest')
  let lastStatus = status()
  let lastScope = scopeOf(null)

  hub.api.onChange((u) => {
    const scope = scopeOf(u)
    if (scope !== lastScope) {
      lastScope = scope
      opts.onScope?.(scope)
    }
    const s = status()
    if (s !== lastStatus) {
      lastStatus = s
      listeners.forEach((cb) => cb(s))
    }
  })

  return {
    ...NullCloud,
    status,
    onStatus(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    auth: hub.api,
    profile: createProfile(client, hub),
  }
}
