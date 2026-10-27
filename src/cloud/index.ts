// A felhő belépési pontja (AI-B). Beállított Supabase-kulccsal a valódi példány (lustán betöltve: az induló csomag nem tartalmazza a
// Supabase-klienst), nélküle a vendég/offline NullCloud.
import type { CloudService } from '../shared/cloud'
import { createLazyCloud } from './lazy'
import { NullCloud } from './null'

export type { CloudService, CloudStatus } from '../shared/cloud'
export { NullCloud }

const configured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const lazy = configured ? createLazyCloud(() => import('./real').then((m) => m.createRealCloud())) : null
export const cloud: CloudService = lazy ? lazy.cloud : NullCloud

// Az első kép után, a böngésző üresjáratában betöltjük a felhőt (a mentett munkamenet így nem késik sokat, de a főmenü nem várja).
if (lazy && typeof window !== 'undefined') {
  const start = () => void lazy.load()
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 1200 })
  else setTimeout(start, 400)
}
