// ProfileApi: a `profiles` tábla és a `profile_stats` nézet (0001_init.sql). Az RLS a védelem; itt csak a leképezés + hibakezelés van.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, ProfileApi, ProfileStats } from '../shared/cloud'
import { USERNAME_MAX, USERNAME_MIN, type AuthHub } from './auth'
import { fail, fromError, guard, ok } from './result'

interface ProfileRow {
  id: string; username: string; avatar: string; xp: number; coins: number; streak: number
  best_streak: number; last_daily: string | null; created_at: string
}
interface StatsRow {
  solved_total: number; solved_no_hints: number; jumpscares: number; play_time_ms: number
  coop_games: number; wins_as_killer: number; wins_as_detective: number
}

const iso = (t: string) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const toProfile = (r: ProfileRow): Profile => ({
  id: r.id, username: r.username, avatar: r.avatar, xp: r.xp, coins: r.coins, streak: r.streak, bestStreak: r.best_streak,
  ...(r.last_daily ? { lastDaily: r.last_daily } : {}),
  createdAt: iso(r.created_at),
})
const toStats = (r: StatsRow | null): ProfileStats => ({
  solvedTotal: Number(r?.solved_total ?? 0), solvedNoHints: Number(r?.solved_no_hints ?? 0), jumpscares: Number(r?.jumpscares ?? 0),
  playTimeMs: Number(r?.play_time_ms ?? 0), coopGames: Number(r?.coop_games ?? 0),
  winsAsKiller: Number(r?.wins_as_killer ?? 0), winsAsDetective: Number(r?.wins_as_detective ?? 0),
})

export function createProfile(client: SupabaseClient, hub: AuthHub): ProfileApi {
  const uid = async () => (await client.auth.getSession()).data.session?.user.id ?? null
  const needLogin = () => fail('unauthenticated', 'sign_in_required')

  const api: ProfileApi = {
    get: () =>
      guard(async () => {
        const id = await uid()
        if (!id) return needLogin()
        const { data, error } = await client.from('profiles').select('*').eq('id', id).single()
        return error ? fromError(error) : ok(toProfile(data as ProfileRow))
      }),
    update: (p) =>
      guard(async () => {
        const id = await uid()
        if (!id) return needLogin()
        const patch: { username?: string; avatar?: string } = {}
        if (p.username !== undefined) {
          const name = p.username.trim()
          if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return fail('invalid', 'username_length')
          patch.username = name
        }
        if (p.avatar !== undefined) patch.avatar = p.avatar
        if (Object.keys(patch).length === 0) return api.get()
        const { data, error } = await client.from('profiles').update(patch).eq('id', id).select().single()
        if (error) return fromError(error) // foglalt becenév: 23505 → conflict
        const profile = toProfile(data as ProfileRow)
        hub.patchUser({ username: profile.username })
        return ok(profile)
      }),
    stats: () =>
      guard(async () => {
        const id = await uid()
        if (!id) return needLogin()
        const { data, error } = await client.from('profile_stats').select('*').eq('user_id', id).maybeSingle()
        return error ? fromError(error) : ok(toStats(data as StatsRow | null)) // még nincs futás → csupa nulla
      }),
    // B3: adat-export és fiók-törlés (edge function) — addig nem elérhető.
    exportData: async () => fail('unknown', 'not_implemented'),
    deleteAccount: async () => fail('unknown', 'not_implemented'),
  }
  return api
}
