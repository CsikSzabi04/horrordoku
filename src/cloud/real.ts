// A valódi (Supabase-alapú) felhő-példány. Külön fájl, hogy a Supabase-kliens csak a lusta betöltéskor kerüljön a böngészőbe (lásd `lazy.ts`).
import type { CloudService } from '../shared/cloud'
import { browserKV, createStorage, getStorage } from '../storage'
import { createCloud } from './service'
import { makeClient } from './supabase'

export function createRealCloud(): CloudService {
  const client = makeClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  if (!client) throw new Error('supabase not configured')
  return createCloud(client, {
    storage: getStorage(),
    // Belépéskor/kilépéskor a helyi tároló átvált a felhasználó saját adataira ('guest' ↔ 'u_xxxxxxxx').
    onScope: (s) => void getStorage().setScope(s),
    win: typeof window !== 'undefined' ? window : undefined,
    guestStorage: () => createStorage(browserKV()), // a vendég-adat külön példányból olvasható, a fiók mellett
  })
}
