import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { SecureStore, type Cipher } from './secure'

const fake = (available = true): Cipher => ({
  isAvailable: () => available,
  encrypt: (s) => Buffer.from('X' + s.split('').reverse().join('')),
  decrypt: (b) => {
    const t = b.toString()
    if (!t.startsWith('X')) throw new Error('bad data')
    return t.slice(1).split('').reverse().join('')
  },
})

let dir: string
let file: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nd-sec-'))
  file = path.join(dir, 'auth.bin')
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('SecureStore', () => {
  it('set → get; a fájl nem tartalmaz nyílt szöveget', async () => {
    const s = new SecureStore(file, fake())
    await s.set('sb-token', 'nagyon-titkos')
    expect(await s.get('sb-token')).toBe('nagyon-titkos')
    expect(await fs.readFile(file, 'utf8')).not.toContain('nagyon-titkos')
  })
  it('hiányzó kulcs → null; remove után null', async () => {
    const s = new SecureStore(file, fake())
    expect(await s.get('nincs')).toBeNull()
    await s.set('k', 'v')
    await s.remove('k')
    expect(await s.get('k')).toBeNull()
  })
  it('nem elérhető titkosítás → set hibát dob, nem ír nyílt szöveget', async () => {
    const s = new SecureStore(file, fake(false))
    await expect(s.set('k', 'v')).rejects.toThrow('unavailable')
    await expect(fs.access(file)).rejects.toThrow()
  })
  it('sérült érték → null, nem kivétel', async () => {
    await fs.writeFile(file, JSON.stringify({ k: Buffer.from('zaj').toString('base64') }))
    expect(await new SecureStore(file, fake()).get('k')).toBeNull()
  })
  it('sérült fájl → üresként kezeli, az új írás helyreállítja', async () => {
    await fs.writeFile(file, 'nem json')
    const s = new SecureStore(file, fake())
    expect(await s.get('k')).toBeNull()
    await s.set('k', 'v')
    expect(await s.get('k')).toBe('v')
  })
  it('párhuzamos set-ek mind megmaradnak', async () => {
    const s = new SecureStore(file, fake())
    await Promise.all(Array.from({ length: 10 }, (_, i) => s.set(`k${i}`, `v${i}`)))
    for (let i = 0; i < 10; i++) expect(await s.get(`k${i}`)).toBe(`v${i}`)
  })
})
