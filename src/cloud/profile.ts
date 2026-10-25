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

interface PublicRow {
  id: string; username: string; avatar: string; xp: number; best_streak: number
  solved_total: number | string; solved_no_hints: number | string; coop_games: number | string; wins_as_detective: number | string; wins_as_killer: number | string
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
    /** Az összes saját sor egy JSON-ban (GDD 18.5). Az RLS miatt minden lekérdezés csak a sajátjaidat adja vissza. */
    exportData: () =>
      guard(async () => {
        const id = await uid()
        if (!id) return needLogin()
        const own = ['progress', 'saves', 'runs', 'unlocks', 'user_settings', 'leaderboard'] as const
        const [prof, friends, ...rest] = await Promise.all([
          client.from('profiles').select('*').eq('id', id).maybeSingle(),
          client.from('my_friends').select('*'),
          ...own.map((t) => client.from(t).select('*')),
        ])
        const bad = [prof, friends, ...rest].find((r) => r.error)
        if (bad?.error) return fromError(bad.error)
        const tables = Object.fromEntries(own.map((t, i) => [t, rest[i]?.data ?? []]))
        return ok({ v: 1, exportedAt: new Date().toISOString(), profile: prof.data, friends: friends.data ?? [], ...tables })
      }),
    /** Más játékos nyilvános statisztikája (0004 `public_profile`); `null`, ha nem látható. */
    publicProfile: (userId) =>
      guard(async () => {
        const { data, error } = await client.rpc('public_profile', { p_user: userId })
        if (error) return fromError(error)
        const r = ((data ?? []) as PublicRow[])[0]
        if (!r) return ok(null)
        return ok({
          id: r.id, username: r.username, avatar: r.avatar, xp: r.xp, bestStreak: r.best_streak, solvedTotal: Number(r.solved_total),
          solvedNoHints: Number(r.solved_no_hints), coopGames: Number(r.coop_games), winsAsDetective: Number(r.wins_as_detective), winsAsKiller: Number(r.wins_as_killer),
        })
      }),
    /** Fiók törlése: a `delete-account` edge function (supabase/functions) törli az auth-felhasználót; a hozzá kötött sorok a külső kulcsokkal (on delete cascade) törlődnek. */
    deleteAccount: () =>
      guard(async () => {
        const id = await uid()
        if (!id) return needLogin()
        const { error } = await client.functions.invoke('delete-account', { method: 'POST' })
        if (error) {
          const status = (error as { context?: { status?: number } }).context?.status
          return fromError({ name: error.name, message: error.message, status })
        }
        await client.auth.signOut({ scope: 'local' }) // a munkamenet már érvénytelen; a helyi állapotot is tisztítjuk
        return ok(undefined)
      }),
  }
  return api
}
