import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MemoryStore } from './memory'

let dir: string
let m: MemoryStore
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nd-mem-'))
  m = new MemoryStore(dir)
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('MemoryStore.resolve', () => {
  it('belső út rendben', () => {
    expect(m.resolve('u_ab12cd34/progress.json')).toBe(path.resolve(dir, 'u_ab12cd34', 'progress.json'))
  })
  it.each(['../x', 'a/../../x', '..', '/etc/passwd', 'C:/Windows/win.ini', 'C:\\x', '\\\\srv\\share\\x', '', 'a\0b'])(
    'tiltott: %j',
    (p) => expect(() => m.resolve(p)).toThrow(),
  )
  it('allowRoot: a gyökér engedett', () => expect(m.resolve('', true)).toBe(path.resolve(dir)))
  it('nem string → hiba', () => expect(() => m.resolve(42 as unknown as string)).toThrow())
})

describe('MemoryStore JSON', () => {
  it('írás → olvasás', async () => {
    await m.writeJson('a/b.json', { v: 1, s: 'árvíztűrő' })
    expect(await m.readJson('a/b.json')).toEqual({ v: 1, s: 'árvíztűrő' })
  })
  it('hiányzó fájl → null', async () => expect(await m.readJson('nincs.json')).toBeNull())
  it('a második írás az előzőt .bak-ba menti', async () => {
    await m.writeJson('a.json', { v: 1 })
    await m.writeJson('a.json', { v: 2 })
    expect(JSON.parse(await fs.readFile(path.join(dir, 'a.json.bak'), 'utf8'))).toEqual({ v: 1 })
  })
  it('sérült fő fájl → a .bak-ból olvas', async () => {
    await m.writeJson('a.json', { v: 1 })
    await m.writeJson('a.json', { v: 2 })
    await fs.writeFile(path.join(dir, 'a.json'), '{törött')
    expect(await m.readJson('a.json')).toEqual({ v: 1 })
  })
  it('párhuzamos írás: érvényes JSON marad, nincs .tmp', async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => m.writeJson('c.json', { i })))
    const last = await m.readJson<{ i: number }>('c.json')
    expect(last?.i).toBe(11)
    expect((await m.list('')).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })
  it('kívülre mutató út: writeJson/readJson/remove hibát dob', async () => {
    await expect(m.writeJson('../x.json', {})).rejects.toThrow()
    await expect(m.readJson('../x.json')).rejects.toThrow()
    await expect(m.remove('../x.json')).rejects.toThrow()
  })
})

describe('MemoryStore remove/list/usage', () => {
  it('remove törli a fájlt és a .bak-ot is, a hiányzó nem hiba', async () => {
    await m.writeJson('a.json', { v: 1 })
    await m.writeJson('a.json', { v: 2 })
    await m.remove('a.json')
    await m.remove('a.json')
    expect(await m.list('')).toEqual([])
  })
  it('list: hiányzó mappa → üres', async () => expect(await m.list('nincs')).toEqual([]))
  it('usage: számolja a bájtokat (almappákkal)', async () => {
    expect((await m.usage()).bytes).toBe(0)
    await m.writeJson('x/y.json', { a: 1 })
    expect((await m.usage()).bytes).toBe(JSON.stringify({ a: 1 }).length)
  })
})
