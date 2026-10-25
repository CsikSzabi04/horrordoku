// A valódi CloudService: auth + profil (B1), barátok + szobák + chat (B4), szinkron + katalógus (B2).
// Ranglista + online-állapot (B7). Ami nincs beállítva, azt a NullCloud adja.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CloudService, CloudStatus } from '../shared/cloud'
import type { StorageService } from '../shared/storage'
import { createAuth, scopeOf } from './auth'
import { createCatalog } from './catalog'
import { createFriends } from './friends'
import { createLeaderboard } from './leaderboard'
import { NullCloud } from './null'
import { createProfile } from './profile'
import { startPresence } from './presence'
import { createRooms } from './rooms'
import { createSync, type SyncOptions } from './sync'

export interface CloudOptions extends Pick<SyncOptions, 'win' | 'guestStorage' | 'debounceMs'> {
  /** Belépéskor/kilépéskor hívódik ('guest' | 'u_xxxxxxxx') — ide köti az app a `StorageService.setScope()`-ot. */
  onScope?: (scope: string) => void
  /** Jelszó-visszaállító és megerősítő e-mailek visszatérési címe. */
  redirectTo?: string
  /** A helyi tároló: ha meg van adva, a szinkron és a katalógus-frissítés él (és a szinkron automatikusan elindul). */
  storage?: StorageService
}

export function createCloud(client: SupabaseClient, opts: CloudOptions = {}): CloudService {
  const hub = createAuth(client, opts)
  const sync = opts.storage ? createSync(client, opts.storage, hub.api, opts) : null
  const listeners = new Set<(s: CloudStatus) => void>()
  // A felület állapota: vendég, vagy (belépve) a szinkron állapota.
  const status = (): CloudStatus => (hub.api.current() ? (sync?.status() ?? 'idle') : 'guest')
  let lastStatus = status()
  let lastScope = scopeOf(null)

  const notify = () => {
    const s = status()
    if (s !== lastStatus) {
      lastStatus = s
      listeners.forEach((cb) => cb(s))
    }
  }
  hub.api.onChange((u) => {
    const scope = scopeOf(u)
    if (scope !== lastScope) {
      lastScope = scope
      opts.onScope?.(scope)
    }
    notify()
  })
  sync?.onStatus(notify)
  sync?.start()
  if (opts.storage) startPresence(client, hub.api, opts.storage, typeof document !== 'undefined' ? document : undefined)

  return {
    ...NullCloud,
    status,
    onStatus(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    auth: hub.api,
    profile: createProfile(client, hub),
    friends: createFriends(client),
    leaderboard: createLeaderboard(client),
    rooms: createRooms(client, hub.api),
    ...(sync && opts.storage ? { sync, catalog: createCatalog(client, opts.storage) } : {}),
  }
}
