// A felhő belépési pontja (AI-B). Beállított Supabase-kulccsal a valódi példány, nélküle a vendég/offline NullCloud.
import type { CloudService } from '../shared/cloud'
import { browserKV, createStorage, getStorage } from '../storage'
import { NullCloud } from './null'
import { createCloud } from './service'
import { makeClient } from './supabase'

export type { CloudService, CloudStatus } from '../shared/cloud'
export { NullCloud, createCloud }

const client = makeClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
export const cloud: CloudService = client
  ? createCloud(client, {
      storage: getStorage(),
      // Belépéskor/kilépéskor a helyi tároló átvált a felhasználó saját adataira ('guest' ↔ 'u_xxxxxxxx').
      onScope: (s) => void getStorage().setScope(s),
      win: typeof window !== 'undefined' ? window : undefined,
      guestStorage: () => createStorage(browserKV()), // a vendég-adat külön példányból olvasható, a fiók mellett
    })
  : NullCloud
