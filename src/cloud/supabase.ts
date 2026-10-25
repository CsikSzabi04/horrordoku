// Supabase-kliens a publikus (publishable) kulccsal — secret/service_role kulcs SOHA nem kerülhet ide.
// Webes: a munkamenetet a kliens alapértelmezett localStorage-tárolója őrzi (nincs külön adapter).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** `null`, ha nincs beállítva az URL/kulcs (pl. `.env` nélkül) → a játék vendégként, felhő nélkül fut. */
export function makeClient(url: string | undefined, key: string | undefined): SupabaseClient | null {
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
}
