import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { parseMemoryFlag, pickMemoryDir, type MemoryDirInput } from './paths'

const base: MemoryDirInput = {
  flag: null,
  isPackaged: true,
  exeDir: path.resolve('/games/nightdoku'),
  projectRoot: path.resolve('/proj'),
  appData: path.resolve('/appdata'),
  cwd: path.resolve('/cwd'),
  canWrite: async () => true,
}

describe('parseMemoryFlag', () => {
  it('kiolvassa', () => expect(parseMemoryFlag(['a', '--memory=./memory-b'])).toBe('./memory-b'))
  it('nincs / üres → null', () => {
    expect(parseMemoryFlag(['a'])).toBeNull()
    expect(parseMemoryFlag(['--memory='])).toBeNull()
  })
})

describe('pickMemoryDir', () => {
  it('--memory előnyt élvez, a cwd-hez képest oldódik fel', async () => {
    const r = await pickMemoryDir({ ...base, flag: './memory-b' })
    expect(r).toEqual({ dir: path.resolve('/cwd', 'memory-b'), fallback: false })
  })
  it('--memory nem írható → hiba', async () => {
    await expect(pickMemoryDir({ ...base, flag: 'x', canWrite: async () => false })).rejects.toThrow('not writable')
  })
  it('fejlesztés: <projekt>/memory', async () => {
    expect(await pickMemoryDir({ ...base, isPackaged: false })).toEqual({ dir: path.resolve('/proj', 'memory'), fallback: false })
  })
  it('csomagolt: az exe mellett', async () => {
    expect((await pickMemoryDir(base)).dir).toBe(path.join(base.exeDir, 'memory'))
  })
  it('portable: a PORTABLE_EXECUTABLE_DIR mellett (nem az ideiglenes kicsomagolási mappa)', async () => {
    const portable = path.resolve('/usb/game')
    expect((await pickMemoryDir({ ...base, portableDir: portable })).dir).toBe(path.join(portable, 'memory'))
  })
  it('nem írható mappa → %APPDATA%\\NIGHTDOKU\\memory, fallback jelzéssel', async () => {
    const r = await pickMemoryDir({ ...base, canWrite: async (d) => !d.startsWith(base.exeDir) })
    expect(r).toEqual({ dir: path.join(base.appData, 'NIGHTDOKU', 'memory'), fallback: true })
  })
})
