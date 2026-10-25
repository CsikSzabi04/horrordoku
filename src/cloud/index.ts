// A felhő belépési pontja (AI-B). Beállított Supabase-kulccsal a valódi példány, nélküle a vendég/offline NullCloud.
import type { CloudService } from '../shared/cloud'
import { NullCloud } from './null'
import { createCloud } from './service'
import { makeClient } from './supabase'

export type { CloudService, CloudStatus } from '../shared/cloud'
export { NullCloud, createCloud }

const client = makeClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
export const cloud: CloudService = client ? createCloud(client) : NullCloud
