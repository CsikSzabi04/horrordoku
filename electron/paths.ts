import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

/** `--memory=<út>` kapcsoló (külön adatmappa: co-op teszt egy gépen, fejlesztés). */
export function parseMemoryFlag(argv: readonly string[]): string | null {
  const a = argv.find((x) => x.startsWith('--memory='))
  const v = a?.slice('--memory='.length)
  return v ? v : null
}

export async function canWriteDir(dir: string): Promise<boolean> {
  try {
    await fs.mkdir(dir, { recursive: true })
    const f = path.join(dir, `.w${randomBytes(4).toString('hex')}`)
    await fs.writeFile(f, 'x')
    await fs.unlink(f)
    return true
  } catch {
    return false
  }
}

export interface MemoryDirInput {
  flag: string | null
  isPackaged: boolean
  portableDir?: string // electron-builder portable: PORTABLE_EXECUTABLE_DIR
  exeDir: string
  projectRoot: string
  appData: string
  cwd: string
  canWrite?: (dir: string) => Promise<boolean>
}

/** A memory mappa helye (GDD 17.1/17.4): --memory > fejlesztés: <projekt>/memory > <exe mappa>/memory > %APPDATA%\NIGHTDOKU\memory (fallback). */
export async function pickMemoryDir(i: MemoryDirInput): Promise<{ dir: string; fallback: boolean }> {
  const can = i.canWrite ?? canWriteDir
  if (i.flag) {
    const dir = path.resolve(i.cwd, i.flag)
    if (!(await can(dir))) throw new Error(`--memory not writable: ${dir}`)
    return { dir, fallback: false }
  }
  if (!i.isPackaged) return { dir: path.join(i.projectRoot, 'memory'), fallback: false }
  const dir = path.join(i.portableDir ?? i.exeDir, 'memory')
  if (await can(dir)) return { dir, fallback: false }
  return { dir: path.join(i.appData, 'NIGHTDOKU', 'memory'), fallback: true }
}
