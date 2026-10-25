// AuthApi: belépés/regisztráció/kilépés + a munkamenet-állapot (CloudUser). A hívások `Result`-ot adnak (result.ts).
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Unsubscribe } from '../shared/base'
import type { AuthApi, CloudUser } from '../shared/cloud'
import { fail, fromError, guard, ok } from './result'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 16
const validName = (n: string) => n.length >= USERNAME_MIN && n.length <= USERNAME_MAX

/** A StorageService-scope ('guest' | 'u_xxxxxxxx') a felhasználóból. */
export const scopeOf = (u: CloudUser | null): string => (u ? `u_${u.id.replace(/-/g, '').slice(0, 8)}` : 'guest')

export interface AuthHub {
  api: AuthApi
  /** A profil-módosítás után a gyorsítótárazott becenév frissítése. */
  patchUser(p: Partial<Pick<CloudUser, 'username'>>): void
}

export function createAuth(client: SupabaseClient, opts: { redirectTo?: string } = {}): AuthHub {
  let user: CloudUser | null = null
  let seq = 0 // a lassan érkező régi válasz ne írja felül az újabbat
  const listeners = new Set<(u: CloudUser | null) => void>()

  const emit = () => listeners.forEach((cb) => cb(user))
  const same = (a: CloudUser | null, b: CloudUser | null) => a?.id === b?.id && a?.username === b?.username && a?.email === b?.email

  async function apply(su: User | null): Promise<CloudUser | null> {
    const mine = ++seq
    let next: CloudUser | null = null
    if (su) {
      let name = ''
      try {
        const row = await client.from('profiles').select('username').eq('id', su.id).maybeSingle()
        name = (row.data as { username?: string } | null)?.username ?? ''
      } catch {
        /* hálózat nélkül a metaadat-becenév is elég */
      }
      const meta: unknown = su.user_metadata?.username
      next = { id: su.id, email: su.email ?? '', username: name || (typeof meta === 'string' ? meta : '') }
    }
    if (mine !== seq) return user
    if (!same(user, next)) {
      user = next
      emit()
    }
    return user
  }

  // Az INITIAL_SESSION is ide fut be: oldal-újratöltés után automatikus belépés. (Az eseménykezelőben nem várunk Supabase-hívásra.)
  client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void apply(session?.user ?? null), 0)
  })

  const api: AuthApi = {
    current: () => user,
    onChange(cb): Unsubscribe {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    usernameAvailable: (name) =>
      guard(async () => {
        if (!validName(name)) return fail('invalid', 'username_length')
        const { data, error } = await client.rpc('username_available', { p_name: name })
        return error ? fromError(error) : ok(data === true)
      }),
    /** Ha az e-mail-megerősítés be van kapcsolva, nincs munkamenet: `ok` jön, de az `auth.current()` null marad. */
    signUp: (i) =>
      guard(async () => {
        const username = i.username.trim()
        const free = await api.usernameAvailable(username)
        if (!free.ok) return free
        if (!free.value) return fail('conflict', 'username_taken')
        const { data, error } = await client.auth.signUp({
          email: i.email,
          password: i.password,
          options: { data: { username }, emailRedirectTo: opts.redirectTo },
        })
        if (error) return fromError(error)
        if (!data.user || data.user.identities?.length === 0) return fail('conflict', 'email_taken')
        if (data.session) await apply(data.user)
        return ok({ id: data.user.id, email: data.user.email ?? i.email, username })
      }),
    signIn: (i) =>
      guard(async () => {
        const { data, error } = await client.auth.signInWithPassword(i)
        if (error) return fromError(error)
        const u = await apply(data.user)
        return u ? ok(u) : fail('unknown', 'no_user')
      }),
    signOut: () =>
      guard(async () => {
        const { error } = await client.auth.signOut()
        if (error) await client.auth.signOut({ scope: 'local' }) // offline is kilép: a helyi munkamenet törlődik
        await apply(null)
        return ok(undefined)
      }),
    sendPasswordReset: (email) =>
      guard(async () => {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: opts.redirectTo })
        return error ? fromError(error) : ok(undefined)
      }),
  }

  return {
    api,
    patchUser(p) {
      if (user) {
        user = { ...user, ...p }
        emit()
      }
    },
  }
}
