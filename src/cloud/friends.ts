// FriendsApi (B4): profil-keresés, barátlista, kérés/elfogadás/törlés (0002 függvényei), Realtime-értesítés a változásról.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FriendRow, FriendsApi, PersonRef } from '../shared/cloud'
import { fail, fromError, guard, ok } from './result'

interface PersonRow { id: string; username: string; avatar: string; xp: number; is_me?: boolean }
const CODE_LENGTH = 10
const person = (p: PersonRow): PersonRef => ({ id: p.id, username: p.username, avatar: p.avatar, xp: p.xp, ...(p.is_me ? { isMe: true } : {}) })
interface FriendViewRow { friend_id: string; username: string; avatar: string; xp: number; status: 'pending' | 'accepted'; requested_by: string; online?: boolean }

export function createFriends(client: SupabaseClient): FriendsApi {
  const uid = async () => (await client.auth.getSession()).data.session?.user.id ?? null
  const rpc = (fn: string, args: Record<string, unknown>) =>
    guard(async () => {
      const { error } = await client.rpc(fn, args)
      return error ? fromError(error) : ok(undefined)
    })

  return {
    search: (query) =>
      guard(async () => {
        const q = query.trim()
        if (q.length < 2) return ok([]) // min. 2 karakter (GDD 14.9)
        const { data, error } = await client.rpc('search_profiles', { p_prefix: q }) // becenév: bárhol a névben (0006)
        if (error) return fromError(error)
        const found = ((data ?? []) as PersonRow[]).map(person)
        // 10 karakteres bevitel: lehet barát-azonosító is — a pontos egyezést előre tesszük
        if (q.length === CODE_LENGTH) {
          const byCode = await client.rpc('find_by_code', { p_code: q })
          if (!byCode.error) for (const p of ((byCode.data ?? []) as PersonRow[]).reverse()) if (!found.some((x) => x.id === p.id)) found.unshift(person(p))
        }
        return ok(found)
      }),
    myCode: () =>
      guard(async () => {
        const { data, error } = await client.rpc('my_friend_code')
        if (error) return fromError(error)
        return typeof data === 'string' && data ? ok(data) : fail('unknown', 'no_code')
      }),
    findByCode: (code) =>
      guard(async () => {
        const c = code.trim()
        if (c.length !== CODE_LENGTH) return ok(null)
        const { data, error } = await client.rpc('find_by_code', { p_code: c })
        if (error) return fromError(error)
        const row = ((data ?? []) as PersonRow[])[0]
        return ok(row ? person(row) : null)
      }),
    list: () =>
      guard(async () => {
        const me = await uid()
        if (!me) return fail('unauthenticated', 'sign_in_required')
        const { data, error } = await client.from('my_friends').select('friend_id, username, avatar, xp, status, requested_by, online').order('created_at', { ascending: false })
        if (error) return fromError(error)
        const rows: FriendRow[] = ((data ?? []) as FriendViewRow[]).map((r) => ({
          id: r.friend_id, username: r.username, avatar: r.avatar, xp: r.xp, status: r.status, requestedByMe: r.requested_by === me,
          ...(r.online !== undefined ? { online: r.online } : {}),
        }))
        return ok(rows)
      }),
    request: (userId) => rpc('send_friend_request', { p_user: userId }),
    respond: (userId, accept) => rpc('respond_friend_request', { p_user: userId, p_accept: accept }),
    remove: (userId) => rpc('remove_friend', { p_user: userId }),
    onChange(cb) {
      const ch = client
        .channel(`friends:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => cb())
        .subscribe()
      return () => void client.removeChannel(ch)
    },
  }
}
