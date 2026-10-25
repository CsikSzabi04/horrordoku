// NIGHTDOKU — fiók törlése (Edge Function). A kliens a `supabase.functions.invoke('delete-account')`-tal hívja, bejelentkezve.
// Működés: a hívó JWT-jéből azonosítja a felhasználót, majd a szerver-oldali (service role) kulccsal törli az auth-felhasználót.
// A profil, a haladás, a mentések, a futás-napló, a feloldások, a barátságok stb. a külső kulcsok `on delete cascade`-jával törlődnek (0001/0002).
//
// TELEPÍTÉS (a felhasználó végzi — az AI nem ír felhős szolgáltatásba):
//   Supabase CLI:  supabase functions deploy delete-account --project-ref <HorrorDoku ref>
//   vagy Dashboard → Edge Functions → Deploy a new function → ennek a fájlnak a tartalma.
// A függvényben a SUPABASE_URL, SUPABASE_ANON_KEY és SUPABASE_SERVICE_ROLE_KEY változókat a Supabase automatikusan beállítja —
// a service role kulcs SOHA nem kerülhet a repóba vagy a kliensbe.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'unauthenticated' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !service) return json({ error: 'misconfigured' }, 500)

  // Kit hív? — a kérés saját JWT-je alapján, nem a törzsből (nem lehet más fiókját törölni).
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await asUser.auth.getUser()
  if (error || !data.user) return json({ error: 'unauthenticated' }, 401)

  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { error: failed } = await admin.auth.admin.deleteUser(data.user.id)
  if (failed) return json({ error: 'delete_failed' }, 500)
  return json({ ok: true })
})
