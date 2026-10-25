// Szinkron-motor (B2, GDD 17.5): helyi sor → feltöltés (idempotens upsert), majd letöltés → összefésülés → applyMerged.
// Offline-first: a játék sosem vár erre; hiba esetén a sor megmarad, és az `online` esemény / következő változás újrapróbálja.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result, Unsubscribe, Uuid } from '../shared/base'
import type { AuthApi, CloudStatus, SyncApi } from '../shared/cloud'
import type { ProfileSnapshot, ProgressEntry, ProgressFile, SessionState, SessionsFile, Settings, StorageService, SyncOp, UnlocksFile } from '../shared/storage'
import { scopeOf } from './auth'
import * as merge from './merge'
import { fail, fromError, isNetworkError, ok } from './result'
import * as rows from './rows'

const OP_TIMEOUT_MS = 10_000
const PULL_TIMEOUT_MS = 15_000

/** Időkorláttal: túllépéskor TypeError('timeout') → hálózati hibaként (offline) kezeljük. */
async function within<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TypeError('timeout')), ms)
  })
  try {
    return await Promise.race([Promise.resolve(p), limit])
  } finally {
    clearTimeout(timer)
  }
}

type DbResult = { error: { code?: string; message?: string; status?: number } | null }

const ts = (t: string | null | undefined) => (t ? Date.parse(t) : 0)

/**
 * Egy sor-elem feltöltése. FONTOS: a felhős sort nem írjuk felül vakon — előbb összefésüljük a távoli értékkel (GDD 17.5), különben a
 * később feltöltő gép felülírná a másik gép eredményét (pl. a nagyobb wrongSubmits, a korábbi firstSolvedAt, a solved elveszne a felhőben).
 * Mentés/beállítás/profil: ha a felhős változat újabb, a helyit nem töltjük fel (a letöltés úgyis behozza).
 */
async function sendOp(client: SupabaseClient, uid: string, op: Pick<SyncOp, 'table' | 'kind' | 'key' | 'payload'>): Promise<DbResult> {
  const p = op.payload
  switch (op.table) {
    case 'progress': {
      const cur = await client.from('progress').select('*').eq('user_id', uid).eq('puzzle_id', op.key).maybeSingle()
      if (cur.error) return { error: cur.error }
      let entry = p as ProgressEntry
      if (cur.data) {
        const remote = rows.progressFromRows([cur.data as rows.ProgressDbRow], []).puzzles[op.key]
        if (remote) entry = merge.mergeEntry(entry, remote)
      }
      return client.from('progress').upsert(rows.progressRow(uid, op.key, entry), { onConflict: 'user_id,puzzle_id' })
    }
    case 'saves': {
      if (op.kind === 'delete') return client.from('saves').delete().eq('user_id', uid).eq('puzzle_ref', op.key)
      const local = p as SessionState
      const cur = await client.from('saves').select('updated_at').eq('user_id', uid).eq('puzzle_ref', op.key).maybeSingle()
      if (cur.error) return { error: cur.error }
      if (cur.data && ts((cur.data as { updated_at: string }).updated_at) > ts(local.updatedAt)) return { error: null } // a felhős játék újabb
      return client.from('saves').upsert(rows.saveRow(uid, op.key, local), { onConflict: 'user_id,puzzle_ref' })
    }
    case 'runs':
      return client.from('runs').upsert(rows.runRow(uid, p as Parameters<typeof rows.runRow>[1]), { onConflict: 'id', ignoreDuplicates: true })
    case 'unlocks':
      return client.from('unlocks').upsert(rows.unlockRow(uid, p as Parameters<typeof rows.unlockRow>[1]), { onConflict: 'user_id,kind,item_id', ignoreDuplicates: true })
    case 'user_settings': {
      const local = p as Settings
      const cur = await client.from('user_settings').select('updated_at').eq('user_id', uid).maybeSingle()
      if (cur.error) return { error: cur.error }
      if (cur.data && ts((cur.data as { updated_at: string }).updated_at) > ts(local.updatedAt)) return { error: null }
      return client.from('user_settings').upsert(rows.settingsRow(uid, local), { onConflict: 'user_id' })
    }
    case 'profiles': {
      const local = p as ProfileSnapshot
      const cur = await client.from('profiles').select('updated_at').eq('id', uid).maybeSingle()
      if (cur.error) return { error: cur.error }
      if (cur.data && ts((cur.data as { updated_at: string }).updated_at) > ts(local.updatedAt)) return { error: null }
      return client.from('profiles').update(rows.profilePatch(local)).eq('id', uid)
    }
  }
}

export interface PushReport { done: Uuid[]; deferred: Uuid[]; failed: Uuid[]; offline: boolean }

/** A sor feltöltése sorban. `deferred`: külső kulcs hiányzik (pl. a pálya még nincs a `puzzles` táblában) — a sorban marad, de nem hiba. */
export async function pushOps(client: SupabaseClient, uid: string, ops: Pick<SyncOp, 'id' | 'table' | 'kind' | 'key' | 'payload'>[]): Promise<PushReport> {
  const rep: PushReport = { done: [], deferred: [], failed: [], offline: false }
  for (const op of ops) {
    try {
      const { error } = await within(sendOp(client, uid, op), OP_TIMEOUT_MS)
      if (!error) rep.done.push(op.id)
      else if (isNetworkError(error)) {
        rep.offline = true
        break
      } else if (error.code === '23503') rep.deferred.push(op.id)
      else rep.failed.push(op.id)
    } catch (e) {
      if (isNetworkError(e as Error)) {
        rep.offline = true
        break
      }
      rep.failed.push(op.id)
    }
  }
  return rep
}

export interface Remote { progress: ProgressFile; sessions: SessionsFile; unlocks: UnlocksFile; settings: Settings | null; profile: ProfileSnapshot | null }

export async function pullRemote(client: SupabaseClient, uid: string): Promise<Result<Remote>> {
  try {
    const [pr, ru, sv, un, st, pf] = await within(
      Promise.all([
        client.from('progress').select('*'),
        client.from('runs').select('*').order('played_at', { ascending: false }).limit(20),
        client.from('saves').select('*'),
        client.from('unlocks').select('*'),
        client.from('user_settings').select('*').maybeSingle(),
        client.from('profiles').select('*').eq('id', uid).maybeSingle(),
      ]),
      PULL_TIMEOUT_MS,
    )
    const bad = [pr, ru, sv, un, st, pf].find((r) => r.error)
    if (bad?.error) return fromError(bad.error)
    return ok({
      progress: rows.progressFromRows((pr.data ?? []) as rows.ProgressDbRow[], (ru.data ?? []) as rows.RunDbRow[]),
      sessions: rows.sessionsFromRows((sv.data ?? []) as rows.SaveDbRow[]),
      unlocks: rows.unlocksFromRows((un.data ?? []) as rows.UnlockDbRow[]),
      settings: rows.settingsFromRow(st.data as { data: unknown } | null),
      profile: pf.data ? rows.profileFromRow(pf.data as rows.ProfileDbRow) : null,
    })
  } catch (e) {
    return fromError(e as Error)
  }
}

/** A felhős állapot beolvasztása a helyibe (GDD 17.5). Nem tesz SyncOp-ot a sorba (applyMerged). */
export async function mergeIntoLocal(storage: StorageService, remote: Remote, pendingSaveDeletes: Set<string>): Promise<number> {
  const [lp, ls, lu, lprof, lset, exp] = await Promise.all([
    storage.getProgress(), storage.getSessions(), storage.getUnlocks(), storage.getProfile(), storage.getSettings(), storage.exportData(),
  ])
  const sessions = merge.mergeSessions(ls, remote.sessions)
  for (const k of pendingSaveDeletes) delete sessions.sessions[k] // helyben törölt, de még fel nem töltött törlés: ne éledjen újra
  const storedSettings = Object.keys(exp.entries).some((k) => k.endsWith('settings')) // alapértelmezett (soha nem mentett) beállítás ne írja felül a felhőst
  const profile = remote.profile ? (lprof.id === null ? remote.profile : { ...merge.mergeProfile(lprof, remote.profile), id: remote.profile.id }) : lprof
  const settings = remote.settings ? (storedSettings ? merge.mergeSettings(lset, remote.settings) : remote.settings) : lset
  await storage.applyMerged({
    progress: merge.mergeProgress(lp, remote.progress), sessions, unlocks: merge.mergeUnlocks(lu, remote.unlocks), profile, settings,
  })
  return Object.keys(remote.progress.puzzles).length + Object.keys(remote.sessions.sessions).length + remote.unlocks.items.length
}

export interface ListenerTarget { addEventListener(t: string, cb: () => void): void; removeEventListener(t: string, cb: () => void): void }
export interface SyncOptions {
  win?: ListenerTarget
  debounceMs?: number
  /** A vendég-tároló külön példánya (a belépett fiók mellett olvasható). */
  guestStorage?: () => StorageService
}
export interface SyncEngine extends SyncApi { status(): CloudStatus }

export function createSync(client: SupabaseClient, storage: StorageService, auth: AuthApi, opts: SyncOptions = {}): SyncEngine {
  const debounceMs = opts.debounceMs ?? 1500
  const listeners = new Set<(s: CloudStatus) => void>()
  let status: CloudStatus = auth.current() ? 'idle' : 'guest'
  let started = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight: Promise<Result<{ pushed: number; pulled: number }>> | null = null
  let again = false
  const offs: Unsubscribe[] = []

  const set = (s: CloudStatus) => {
    if (s === status) return
    status = s
    listeners.forEach((cb) => cb(s))
  }
  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), ms)
  }

  async function runOnce(): Promise<Result<{ pushed: number; pulled: number }>> {
    const me = auth.current()
    if (!me) return fail('unauthenticated', 'sign_in_required')
    const scope = scopeOf(me)
    if (storage.scope() !== scope) return fail('conflict', 'scope_mismatch') // a scope-váltás még folyamatban van
    set('syncing')
    const ops = await storage.getQueue()
    const push = await pushOps(client, me.id, ops)
    if (push.done.length) await storage.ack(push.done)
    if (push.offline) {
      set('offline')
      return fail('offline', 'offline')
    }
    const remote = await pullRemote(client, me.id)
    if (!remote.ok) {
      set(remote.code === 'offline' ? 'offline' : 'error')
      return remote
    }
    if (storage.scope() !== scope) return fail('conflict', 'scope_mismatch') // közben kijelentkezett / váltott
    const left = await storage.getQueue()
    const pendingDeletes = new Set(left.filter((o) => o.table === 'saves' && o.kind === 'delete').map((o) => o.key))
    const pulled = await mergeIntoLocal(storage, remote.value, pendingDeletes)
    set(push.failed.length > 0 ? 'error' : 'idle')
    return ok({ pushed: push.done.length, pulled })
  }

  function flush(): Promise<Result<{ pushed: number; pulled: number }>> {
    if (inflight) {
      again = true // fut egy szinkron: utána még egyszer lefut, hogy a közben érkezett változás se maradjon ki
      return inflight
    }
    inflight = (async () => {
      try {
        let r = await runOnce()
        while (again) {
          again = false
          r = await runOnce()
        }
        return r
      } catch (e) {
        set(isNetworkError(e as Error) ? 'offline' : 'error')
        return fromError(e as Error)
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  offs.push(
    auth.onChange((u) => {
      if (!u) {
        clearTimeout(timer)
        set('guest')
      } else {
        set('idle')
        if (started) schedule(100) // előbb átvált a tároló a felhasználó adataira (onScope)
      }
    }),
  )

  const winHandlers: [string, () => void][] = [
    ['online', () => schedule(0)],
    ['offline', () => auth.current() && set('offline')],
    ['pagehide', () => void flush()], // kilépéskor még megpróbáljuk üríteni a sort (legjobb szándékkal)
  ]

  return {
    status: () => status,
    onStatus(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    start() {
      if (started) return
      started = true
      offs.push(storage.onChange((e) => e.type === 'queue' && auth.current() && schedule(debounceMs)))
      winHandlers.forEach(([t, h]) => opts.win?.addEventListener(t, h))
      if (auth.current()) schedule(100)
    },
    stop() {
      started = false
      clearTimeout(timer)
      winHandlers.forEach(([t, h]) => opts.win?.removeEventListener(t, h))
    },
    flush,
    async guestData() {
      const g = opts.guestStorage?.()
      if (!g) return false
      const [p, s, u, prof] = await Promise.all([g.getProgress(), g.getSessions(), g.getUnlocks(), g.getProfile()])
      return Object.keys(p.puzzles).length > 0 || Object.keys(s.sessions).length > 0 || u.items.length > 0 || prof.xp > 0
    },
    async transferGuest() {
      const me = auth.current()
      if (!me) return fail('unauthenticated', 'sign_in_required')
      const g = opts.guestStorage?.()
      if (!g) return fail('unknown', 'no_guest_storage')
      const first = await flush() // előbb a fiók állapota kerüljön be (a vendég „a másik gép")
      if (!first.ok) return first
      const [gp, gs, gu, gprof] = await Promise.all([g.getProgress(), g.getSessions(), g.getUnlocks(), g.getProfile()])
      const [lp, ls, lu, lprof] = await Promise.all([storage.getProgress(), storage.getSessions(), storage.getUnlocks(), storage.getProfile()])
      const progress = merge.mergeProgress(lp, gp)
      const sessions = merge.mergeSessions(ls, gs)
      const unlocks = merge.mergeUnlocks(lu, gu)
      const profile = merge.mergeGuestProfile(gprof, lprof)
      await storage.applyMerged({ progress, sessions, unlocks, profile })
      // az applyMerged nem sorol be feltöltést, ezért a teljes összefésült állapotot közvetlenül feltöltjük
      const now = new Date().toISOString()
      const ops: Parameters<typeof pushOps>[2] = [
        ...Object.entries(progress.puzzles).map(([k, v]) => ({ id: `p:${k}`, table: 'progress' as const, kind: 'upsert' as const, key: k, payload: v })),
        ...Object.entries(sessions.sessions).map(([k, v]) => ({ id: `s:${k}`, table: 'saves' as const, kind: 'upsert' as const, key: k, payload: v })),
        ...progress.recentRuns.map((r) => ({ id: `r:${r.id}`, table: 'runs' as const, kind: 'upsert' as const, key: r.id, payload: r })),
        ...unlocks.items.map((u) => ({ id: `u:${u.kind}:${u.id}`, table: 'unlocks' as const, kind: 'upsert' as const, key: `${u.kind}:${u.id}`, payload: u })),
        { id: 'profile', table: 'profiles' as const, kind: 'upsert' as const, key: 'self', payload: { ...profile, updatedAt: now } },
      ]
      const rep = await pushOps(client, me.id, ops)
      if (rep.offline) return fail('offline', 'offline')
      if (rep.failed.length > 0) return fail('server', 'transfer_incomplete')
      return ok(undefined)
    },
  }
}
