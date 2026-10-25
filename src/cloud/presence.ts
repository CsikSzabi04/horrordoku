// Online-állapot (B7): belépve, látható lapnál percenként „szívverés" (0004 `touch_presence`). A „Láthatatlan mód" a beállításból jön.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Unsubscribe } from '../shared/base'
import type { AuthApi } from '../shared/cloud'
import type { StorageService } from '../shared/storage'

export const HEARTBEAT_MS = 60_000

export function startPresence(
  client: SupabaseClient,
  auth: AuthApi,
  storage: Pick<StorageService, 'getSettings'>,
  doc?: Pick<Document, 'visibilityState'>,
): Unsubscribe {
  const beat = async () => {
    if (!auth.current() || doc?.visibilityState === 'hidden') return
    try {
      const { invisible } = await storage.getSettings()
      await client.rpc('touch_presence', { p_invisible: invisible })
    } catch {
      /* offline: a következő szívverés újra próbálja */
    }
  }
  const timer = setInterval(() => void beat(), HEARTBEAT_MS)
  const off = auth.onChange((u) => u && void beat()) // belépés után azonnal jelezzünk
  void beat()
  return () => {
    clearInterval(timer)
    off()
  }
}
