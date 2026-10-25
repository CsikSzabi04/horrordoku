import { describe, expect, it } from 'vitest'
import { createStorage, memoryKV } from './index'
import type { RunRecord, SessionState } from '../shared/storage'

let n = 0
const mk = (init: Record<string, string> = {}) => {
  const kv = memoryKV(init)
  const calm: boolean[] = []
  const s = createStorage(kv, {
    now: () => new Date(1_700_000_000_000 + ++n * 1000).toISOString(),
    uuid: () => `id-${++n}`,
    doc: { documentElement: { classList: { toggle: (_c, on) => calm.push(on) } } },
  })
  return { kv, s, calm }
}
const run = (p: Partial<RunRecord> = {}): RunRecord => ({
  id: `r${++n}`, ref: 'classic-01', kind: 'catalog', solved: true, ms: 100, hints: 0, wrongSubmits: 0, at: '2026-01-01T00:00:00Z', ...p,
})
const sess = (t: string): SessionState => ({
  elapsedMs: 1, hintsUsed: 0, wrongSubmits: 0, board: { placed: {}, marks: [], notes: {} }, updatedAt: t,
})

describe('StorageService', () => {
  it('alapértékek: vendég, jumpscare ki', async () => {
    const { s } = mk()
    expect(s.scope()).toBe('guest')
    expect((await s.getSettings()).jumpscare).toBe('off')
    expect((await s.getProfile()).id).toBeNull()
    expect((await s.getProgress()).puzzles).toEqual({})
  })
  it('scope-ok el vannak különítve, a beállítás közös', async () => {
    const { s } = mk()
    await s.addUnlock('character', 'vlad')
    await s.setScope('u_ab12cd34')
    expect((await s.getUnlocks()).items).toEqual([])
    await s.patchSettings({ language: 'en' })
    await s.setScope('guest')
    expect((await s.getSettings()).language).toBe('en')
    expect((await s.getUnlocks()).items).toHaveLength(1)
  })
  it('recordRun: legjobb idő, hibás beküldések összege, utolsó 20 futás', async () => {
    const { s } = mk()
    await s.recordRun(run({ solved: false, ms: undefined, wrongSubmits: 2 }))
    await s.recordRun(run({ ms: 300, hints: 2 }))
    await s.recordRun(run({ ms: 200, hints: 1, wrongSubmits: 1 }))
    await s.recordRun(run({ ms: 250, hints: 0 }))
    const e = (await s.getProgress()).puzzles['classic-01']!
    expect(e).toMatchObject({ solved: true, bestMs: 200, hints: 1, wrongSubmits: 3 })
    for (let i = 0; i < 25; i++) await s.recordRun(run({ kind: 'random', ref: 'gen:1:1:A' }))
    expect((await s.getProgress()).recentRuns).toHaveLength(20)
  })
  it('SyncOp: egy kulcsra csak a legutolsó marad; ack törli', async () => {
    const { s } = mk()
    await s.putSession('classic-01', sess('2026-01-01T00:00:01Z'))
    await s.putSession('classic-01', sess('2026-01-01T00:00:02Z'))
    const q = await s.getQueue()
    expect(q.filter((o) => o.table === 'saves')).toHaveLength(1)
    await s.ack(q.map((o) => o.id))
    expect(await s.getQueue()).toEqual([])
  })
  it('legfeljebb 3 random félbehagyott ügy; a legrégebbi törlődik (+ delete SyncOp)', async () => {
    const { s } = mk()
    for (let i = 1; i <= 4; i++) await s.putSession(`gen:1:1:S${i}`, sess(`2026-01-01T00:00:0${i}Z`))
    await s.putSession('classic-02', sess('2026-01-01T00:00:09Z'))
    const refs = Object.keys((await s.getSessions()).sessions).sort()
    expect(refs).toEqual(['classic-02', 'gen:1:1:S2', 'gen:1:1:S3', 'gen:1:1:S4'])
    expect((await s.getQueue()).some((o) => o.kind === 'delete' && o.key === 'gen:1:1:S1')).toBe(true)
  })
  it('applyMerged nem tesz SyncOp-ot a sorba', async () => {
    const { s } = mk()
    const pr = await s.getProgress()
    pr.puzzles['x'] = { solved: true, wrongSubmits: 0 }
    await s.applyMerged({ progress: pr })
    expect((await s.getProgress()).puzzles['x']?.solved).toBe(true)
    expect(await s.getQueue()).toEqual([])
  })
  it('sérült érték → a :bak-ból áll helyre, a sérült félre kerül', async () => {
    const { s, kv } = mk()
    await s.addUnlock('badge', 'a')
    await s.addUnlock('badge', 'b')
    kv.set('nd:v1:guest:unlocks', '{törött')
    expect((await s.getUnlocks()).items).toHaveLength(1)
    expect(kv.get('nd:v1:guest:unlocks:corrupt')).toBe('{törött')
  })
  it('teljesen sérült → alapérték, nem kivétel', async () => {
    const { s } = mk({ 'nd:v1:guest:profile': 'nem json' })
    expect((await s.getProfile()).username).toBe('Vendég')
  })
  it('Nyugodt mód: nd_calm kulcs + html.calm osztály', async () => {
    const { s, kv, calm } = mk()
    await s.patchSettings({ photosensitive: true })
    expect(kv.get('nd_calm')).toBe('1')
    await s.patchSettings({ photosensitive: false })
    expect(kv.get('nd_calm')).toBe('0')
    expect(calm).toEqual([true, false])
  })
  it('onChange tüzel, leiratkozás működik', async () => {
    const { s } = mk()
    const got: string[] = []
    const off = s.onChange((e) => got.push(e.type))
    await s.addUnlock('badge', 'x')
    off()
    await s.addUnlock('badge', 'y')
    expect(got).toEqual(['queue', 'unlocks'])
  })
  it('export → törlés → import = ugyanaz', async () => {
    const { s } = mk()
    await s.addUnlock('character', 'vlad')
    await s.patchSettings({ language: 'en' })
    const dump = await s.exportData()
    expect(Object.keys(dump.entries).every((k) => !k.endsWith(':bak'))).toBe(true)
    await s.clearAll()
    expect((await s.getUnlocks()).items).toEqual([])
    expect((await s.usage()).bytes).toBe(0)
    await s.importData(dump)
    expect((await s.getUnlocks()).items).toHaveLength(1)
    expect((await s.getSettings()).language).toBe('en')
    await expect(s.importData({ v: 2 } as never)).rejects.toThrow()
  })
  it('usage számol, a méret tipikusan kicsi', async () => {
    const { s } = mk()
    expect((await s.usage()).bytes).toBe(0)
    await s.addUnlock('badge', 'x')
    const b = (await s.usage()).bytes
    expect(b).toBeGreaterThan(0)
    expect(b).toBeLessThan(5000)
  })
  it('a katalógus-cache és a sync-meta körbejár', async () => {
    const { s } = mk()
    await s.putCachedPuzzles([{ id: 'p' } as never])
    expect(await s.getCachedPuzzles()).toHaveLength(1)
    await s.putSyncMeta({ puzzleRevs: { p: 2 } })
    expect((await s.getSyncMeta()).puzzleRevs).toEqual({ p: 2 })
  })
})
