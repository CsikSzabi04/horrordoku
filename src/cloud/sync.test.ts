import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { AuthApi } from '../shared/cloud'
import type { RunRecord, StorageService } from '../shared/storage'
import { createStorage, memoryKV } from '../storage'
import { scopeOf } from './auth'
import { createCatalog } from './catalog'
import { mergeIntoLocal, createSync, pushOps, type Remote } from './sync'

const UID = '11111111-2222-3333-4444-555555555555'
const USER = { id: UID, email: 'a@b.hu', username: 'Vlad' }
const SCOPE = scopeOf(USER)
const auth = { current: () => USER, onChange: () => () => undefined } as unknown as AuthApi

type Row = Record<string, unknown>
/** Memóriabeli kamu Supabase: upsert / delete / update / select, külső-kulcs (progress → puzzles) és hálózat-kiesés szimulációval. */
function memDb(initial: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = { puzzles: [], progress: [], saves: [], runs: [], unlocks: [], user_settings: [], profiles: [{ id: UID, username: 'Vlad', avatar: 'candle', xp: 0, coins: 0, streak: 0, best_streak: 0, last_daily: null, updated_at: '2026-10-01T00:00:00Z' }], ...initial }
  const ctl = { offline: false, calls: 0 }
  function builder(t: string) {
    const st: { op: string; payload?: unknown; opts?: { onConflict?: string; ignoreDuplicates?: boolean }; filters: [string, unknown][]; ins?: [string, unknown[]]; single: boolean } = { op: 'select', filters: [], single: false }
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.upsert = (p: unknown, o?: { onConflict?: string; ignoreDuplicates?: boolean }) => { st.op = 'upsert'; st.payload = p; st.opts = o; return b }
    b.update = (p: unknown) => { st.op = 'update'; st.payload = p; return b }
    b.delete = () => { st.op = 'delete'; return b }
    b.eq = (c: string, v: unknown) => { st.filters.push([c, v]); return b }
    b.in = (c: string, vs: unknown[]) => { st.ins = [c, vs]; return b }
    b.order = () => b
    b.limit = () => b
    b.maybeSingle = () => { st.single = true; return b }
    const match = (r: Row) => st.filters.every(([c, v]) => r[c] === v) && (!st.ins || st.ins[1].includes(r[st.ins[0]]))
    const run = () => {
      ctl.calls++
      if (ctl.offline) throw new TypeError('Failed to fetch')
      const rows = tables[t]!
      if (st.op === 'upsert') {
        const row = st.payload as Row
        if (t === 'progress' && !tables.puzzles!.some((p) => p.id === row.puzzle_id)) return { data: null, error: { code: '23503', message: 'fk' } }
        const keys = (st.opts?.onConflict ?? 'id').split(',')
        const i = rows.findIndex((r) => keys.every((k) => r[k] === row[k]))
        if (i < 0) rows.push({ ...row })
        else if (!st.opts?.ignoreDuplicates) rows[i] = { ...rows[i], ...row }
        return { data: null, error: null }
      }
      if (st.op === 'update') { rows.filter(match).forEach((r) => Object.assign(r, st.payload)); return { data: null, error: null } }
      if (st.op === 'delete') { tables[t] = rows.filter((r) => !match(r)); return { data: null, error: null } }
      const out = rows.filter(match)
      return { data: st.single ? (out[0] ?? null) : out, error: null }
    }
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => new Promise((ok) => ok(run())).then(res, rej)
    return b
  }
  const client = { from: builder } as unknown as SupabaseClient
  return { client, tables, ctl }
}

async function machine(db: ReturnType<typeof memDb>, guest?: () => StorageService) {
  const storage = createStorage(memoryKV())
  await storage.setScope(SCOPE)
  const sync = createSync(db.client, storage, auth, guest ? { guestStorage: guest } : {})
  return { storage, sync }
}
const run = (over: Partial<RunRecord> = {}): RunRecord => ({ id: `run-${Math.random().toString(36).slice(2)}`, ref: 'classic-01', kind: 'catalog', solved: true, ms: 100000, hints: 1, wrongSubmits: 0, at: new Date().toISOString(), ...over })

describe('szinkron: két gép, egy felhő', () => {
  it('offline szerkesztés → összefésülés → konvergencia, és az applyMerged nem generál végtelen ciklust', async () => {
    const db = memDb({ puzzles: [{ id: 'classic-01' }, { id: 'classic-02' }] })
    const A = await machine(db)
    const B = await machine(db)
    await A.storage.recordRun(run({ ms: 100000, hints: 1 }))
    await A.storage.addUnlock('character', 'silas')
    await B.storage.recordRun(run({ ms: 80000, hints: 2 }))
    await B.storage.recordRun(run({ ref: 'classic-02', solved: false, ms: undefined, hints: 0, wrongSubmits: 3 }))
    await B.storage.addUnlock('character', 'vlad')

    expect((await A.sync.flush()).ok).toBe(true)
    expect((await B.sync.flush()).ok).toBe(true)
    expect((await A.sync.flush()).ok).toBe(true) // A most húzza le B változásait

    const [pa, pb] = [await A.storage.getProgress(), await B.storage.getProgress()]
    expect(pa.puzzles['classic-01']).toMatchObject({ solved: true, bestMs: 80000, hints: 2 }) // a gyorsabb futás tippjei
    expect(pa.puzzles['classic-02']).toMatchObject({ solved: false, wrongSubmits: 3 })
    expect(pb.puzzles).toEqual(pa.puzzles)
    const ids = async (s: StorageService) => (await s.getUnlocks()).items.map((i) => i.id).sort()
    expect(await ids(A.storage)).toEqual(['silas', 'vlad'])
    expect(await ids(B.storage)).toEqual(['silas', 'vlad'])
    // a sor kiürült, és egy újabb kör már nem tölt fel semmit (nincs visszhang-ciklus)
    expect(await A.storage.getQueue()).toHaveLength(0)
    expect(await B.storage.getQueue()).toHaveLength(0)
    expect(await A.sync.flush()).toEqual({ ok: true, value: { pushed: 0, pulled: expect.any(Number) } })
    expect(db.tables.runs).toHaveLength(3) // a futás-napló idempotens: egyszer kerül be
    expect(A.sync.status()).toBe('idle')
  })

  it('hálózat nélkül a sor megmarad (offline), visszatérve feltöltődik', async () => {
    const db = memDb({ puzzles: [{ id: 'classic-01' }] })
    const A = await machine(db)
    await A.storage.recordRun(run())
    db.ctl.offline = true
    expect(await A.sync.flush()).toMatchObject({ ok: false, code: 'offline' })
    expect(A.sync.status()).toBe('offline')
    expect((await A.storage.getQueue()).length).toBeGreaterThan(0)
    db.ctl.offline = false
    expect((await A.sync.flush()).ok).toBe(true)
    expect(await A.storage.getQueue()).toHaveLength(0)
    expect(db.tables.progress).toHaveLength(1)
    expect(A.sync.status()).toBe('idle')
  })

  it('külső-kulcs hiba (a pálya még nincs a puzzles táblában): a sorban marad, de nem „error" állapot', async () => {
    const db = memDb() // üres puzzles
    const A = await machine(db)
    await A.storage.recordRun(run())
    expect((await A.sync.flush()).ok).toBe(true)
    const left = await A.storage.getQueue()
    expect(left.map((o) => o.table)).toEqual(['progress']) // a futás-napló feltöltődött, a progress vár
    expect(A.sync.status()).toBe('idle')
    db.tables.puzzles!.push({ id: 'classic-01' }) // a pálya felkerül az adatbázisba
    await A.sync.flush()
    expect(await A.storage.getQueue()).toHaveLength(0)
    expect(db.tables.progress).toHaveLength(1)
  })

  it('belépés nélkül nem szinkronizál; más scope-ban sem', async () => {
    const db = memDb()
    const storage = createStorage(memoryKV())
    const guestSync = createSync(db.client, storage, { current: () => null, onChange: () => () => undefined } as unknown as AuthApi)
    expect(await guestSync.flush()).toMatchObject({ ok: false, code: 'unauthenticated' })
    expect(guestSync.status()).toBe('guest')
    expect(await createSync(db.client, storage, auth).flush()).toMatchObject({ ok: false, message: 'scope_mismatch' }) // a tároló még 'guest' scope-on áll
  })
})

describe('összefésülés a helyi tárolóba', () => {
  const emptyRemote = (over: Partial<Remote> = {}): Remote => ({
    progress: { v: 1, updatedAt: '1970-01-01T00:00:00Z', puzzles: {}, recentRuns: [] }, sessions: { v: 1, sessions: {} }, unlocks: { v: 1, items: [] }, settings: null, profile: null, ...over,
  })
  it('a helyben törölt (még fel nem töltött) játék nem éled újra', async () => {
    const storage = createStorage(memoryKV())
    await storage.setScope(SCOPE)
    const remote = emptyRemote({ sessions: { v: 1, sessions: { 'gen:1:2:ABC': { elapsedMs: 5, hintsUsed: 0, wrongSubmits: 0, board: {} as never, updatedAt: '2026-10-01T00:00:00Z' } } } })
    await mergeIntoLocal(storage, remote, new Set(['gen:1:2:ABC']))
    expect(Object.keys((await storage.getSessions()).sessions)).toEqual([])
    await mergeIntoLocal(storage, remote, new Set())
    expect(Object.keys((await storage.getSessions()).sessions)).toEqual(['gen:1:2:ABC'])
  })
  it('az új gép (soha nem mentett beállítás, vendég-profil) átveszi a felhős beállítást és profilt', async () => {
    const storage = createStorage(memoryKV())
    await storage.setScope(SCOPE)
    const settings = { ...(await storage.getSettings()), photosensitive: true, updatedAt: '2026-01-01T00:00:00Z' }
    const profile = { v: 1 as const, id: UID, username: 'Vlad', avatar: 'vlad', xp: 700, coins: 4, streak: 2, bestStreak: 5, updatedAt: '2026-01-01T00:00:00Z' }
    await mergeIntoLocal(storage, emptyRemote({ settings, profile }), new Set())
    expect((await storage.getSettings()).photosensitive).toBe(true) // régebbi időbélyeg ellenére, mert a helyi csak alapérték volt
    expect(await storage.getProfile()).toMatchObject({ id: UID, xp: 700 })
  })
  it('a pushOps külön kezeli a hálózati hibát, a külső-kulcs hibát és a siker', async () => {
    const db = memDb({ puzzles: [{ id: 'classic-01' }] })
    const e = { solved: true, wrongSubmits: 0 }
    const ops = [
      { id: '1', table: 'progress' as const, kind: 'upsert' as const, key: 'classic-01', payload: e },
      { id: '2', table: 'progress' as const, kind: 'upsert' as const, key: 'nincs-ilyen', payload: e },
    ]
    expect(await pushOps(db.client, UID, ops)).toEqual({ done: ['1'], deferred: ['2'], failed: [], offline: false })
    db.ctl.offline = true
    expect(await pushOps(db.client, UID, ops)).toMatchObject({ done: [], offline: true })
  })
})

describe('vendég → fiók', () => {
  it('a vendég-haladás összefésülődik a fiókéval és feltöltődik; a vendég-adat megmarad', async () => {
    const db = memDb({ puzzles: [{ id: 'classic-01' }, { id: 'classic-02' }] })
    const guestStorage = createStorage(memoryKV()) // scope: 'guest'
    await guestStorage.recordRun(run({ ref: 'classic-02', ms: 70000, hints: 0 }))
    await guestStorage.addUnlock('character', 'lilith')
    const A = await machine(db, () => guestStorage)
    await A.storage.recordRun(run({ ref: 'classic-01', ms: 90000, hints: 1 }))
    await A.sync.flush()
    expect(await A.sync.guestData()).toBe(true)
    expect((await A.sync.transferGuest()).ok).toBe(true)
    expect(Object.keys((await A.storage.getProgress()).puzzles).sort()).toEqual(['classic-01', 'classic-02'])
    expect((await A.storage.getUnlocks()).items.map((i) => i.id)).toEqual(['lilith'])
    expect(db.tables.progress.map((r) => r.puzzle_id).sort()).toEqual(['classic-01', 'classic-02'])
    expect(db.tables.unlocks).toHaveLength(1)
    expect(Object.keys((await guestStorage.getProgress()).puzzles)).toEqual(['classic-02']) // a vendég-adat érintetlen
    const empty = await machine(memDb(), () => createStorage(memoryKV()))
    expect(await empty.sync.guestData()).toBe(false)
  })
})

describe('katalógus-frissítés', () => {
  it('új pályák hozzáadódnak, a rev-növelés frissít, változatlan esetén nincs teendő', async () => {
    const p = (id: string) => ({ v: 1, id, title: id })
    const db = memDb({ puzzles: [{ id: 'classic-01', rev: 1, data: p('classic-01') }, { id: 'classic-02', rev: 1, data: p('classic-02') }] })
    const storage = createStorage(memoryKV())
    await storage.setScope(SCOPE)
    const cat = createCatalog(db.client, storage)
    expect(await cat.refresh()).toEqual({ ok: true, value: { added: 2, updated: 0 } })
    expect((await storage.getCachedPuzzles()).map((x) => x.id).sort()).toEqual(['classic-01', 'classic-02'])
    expect(await cat.refresh()).toEqual({ ok: true, value: { added: 0, updated: 0 } })
    db.tables.puzzles![0] = { id: 'classic-01', rev: 2, data: { ...p('classic-01'), title: 'javított' } }
    expect(await cat.refresh()).toEqual({ ok: true, value: { added: 0, updated: 1 } })
    expect((await storage.getCachedPuzzles()).find((x) => x.id === 'classic-01')).toMatchObject({ title: 'javított' })
  })
})
