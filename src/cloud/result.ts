// Hibakezelés: a felhő sosem dob kivételt a játékra — minden hívás időkorlátos `Result` (CONTRACTS 1., 6.).
import type { ErrorCode, Result } from '../shared/base'

export const TIMEOUT_MS = 10_000

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = (code: ErrorCode, message: string): Result<never> => ({ ok: false, code, message })

type ErrLike = { message?: string; status?: number; code?: string | number; name?: string } | null | undefined

export function isNetworkError(e: ErrLike): boolean {
  if (!e) return false
  return (
    e instanceof TypeError ||
    e.name === 'AuthRetryableFetchError' ||
    e.status === 0 ||
    /failed to fetch|network|load failed/i.test(e.message ?? '')
  )
}

export const iso = (t: string) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** A SQL-függvények `raise exception '…'` üzenetei (0002/0003) → ErrorCode. */
function fromRaise(msg: string): Result<never> {
  if (/not authenticated/i.test(msg)) return fail('unauthenticated', msg)
  if (/not found/i.test(msg)) return fail('not_found', msg)
  if (/full|already|exists|rev_conflict|limit/i.test(msg)) return fail('conflict', msg)
  if (/closed|only the (host|owner)|owner cannot|not a member|not friends|forbidden/i.test(msg)) return fail('forbidden', msg)
  return fail('invalid', msg)
}

/** Supabase (auth / PostgREST) hiba → ErrorCode. Rossz jelszó = `unauthenticated`, foglalt név/e-mail = `conflict`. */
export function fromError(e: ErrLike): Result<never> {
  const status = e?.status
  const code = String(e?.code ?? '')
  const msg = e?.message ?? 'error'
  if (isNetworkError(e)) return fail('offline', msg)
  if (code === 'P0001') return fromRaise(msg)
  if (code === '23505' || code === 'user_already_exists' || code === 'email_exists' || status === 409) return fail('conflict', msg)
  if (code === 'invalid_credentials' || code === 'PGRST301' || status === 401) return fail('unauthenticated', msg)
  if (code === '42501' || status === 403) return fail('forbidden', msg)
  if (code === 'PGRST116' || status === 404) return fail('not_found', msg)
  if (code.includes('rate_limit') || status === 429) return fail('rate_limited', msg)
  if (status !== undefined && status >= 500) return fail('server', msg)
  if (status === 400 || status === 422) return fail('invalid', msg)
  return fail('unknown', msg)
}

/** Időkorlát + kivétel-elnyelés: a visszatérés mindig `Result`. */
export async function guard<T>(fn: () => PromiseLike<Result<T>>, ms = TIMEOUT_MS): Promise<Result<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<Result<T>>((resolve) => {
    timer = setTimeout(() => resolve(fail('offline', 'timeout')), ms)
  })
  try {
    return await Promise.race([Promise.resolve(fn()), timeout])
  } catch (e) {
    return fromError(e as ErrLike)
  } finally {
    clearTimeout(timer)
  }
}
