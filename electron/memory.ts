import { promises as fs } from 'node:fs'
import type { Dirent } from 'node:fs'
import path from 'node:path'

const code = (e: unknown) => (e as NodeJS.ErrnoException).code
let seq = 0

/** Atomikus írás: ideiglenes fájl → (régi → .bak) → átnevezés. */
export async function writeFileAtomic(file: string, content: string, keepBackup = true): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.${++seq}.tmp`
  await fs.writeFile(tmp, content, 'utf8')
  if (keepBackup) {
    try {
      await fs.copyFile(file, `${file}.bak`)
    } catch (e) {
      if (code(e) !== 'ENOENT') throw e
    }
  }
  await fs.rename(tmp, file)
}

/** A memory mappa — minden fájlművelet ide van zárva (nincs "..", abszolút út, meghajtó-betű, UNC). */
export class MemoryStore {
  private locks = new Map<string, Promise<unknown>>()
  constructor(readonly root: string) {}

  resolve(rel: string, allowRoot = false): string {
    if (typeof rel !== 'string' || rel.includes('\0')) throw new Error('invalid path')
    if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.startsWith('\\\\')) throw new Error('absolute path not allowed')
    const abs = path.resolve(this.root, rel)
    const back = path.relative(this.root, abs)
    if (back === '..' || back.startsWith('..' + path.sep) || path.isAbsolute(back)) throw new Error('path escapes memory dir')
    if (back === '' && !allowRoot) throw new Error('invalid path')
    return abs
  }

  async readJson<T>(rel: string): Promise<T | null> {
    const p = this.resolve(rel)
    for (const f of [p, `${p}.bak`]) {
      try {
        return JSON.parse(await fs.readFile(f, 'utf8')) as T
      } catch (e) {
        if (code(e) !== 'ENOENT' && !(e instanceof SyntaxError)) throw e
      }
    }
    return null
  }

  /** Ugyanarra a fájlra érkező írások sorba állnak (Windowson a párhuzamos átnevezés elbukhat). */
  async writeJson(rel: string, data: unknown): Promise<void> {
    const p = this.resolve(rel)
    const run = (this.locks.get(p) ?? Promise.resolve()).then(() => writeFileAtomic(p, JSON.stringify(data)))
    const tail = run.catch(() => undefined)
    this.locks.set(p, tail)
    void tail.then(() => {
      if (this.locks.get(p) === tail) this.locks.delete(p)
    })
    return run
  }

  async remove(rel: string): Promise<void> {
    const p = this.resolve(rel)
    for (const f of [p, `${p}.bak`]) {
      try {
        await fs.unlink(f)
      } catch (e) {
        if (code(e) !== 'ENOENT') throw e
      }
    }
  }

  async list(rel: string): Promise<string[]> {
    try {
      return (await fs.readdir(this.resolve(rel, true))).filter((n) => !n.endsWith('.tmp'))
    } catch (e) {
      if (code(e) === 'ENOENT') return []
      throw e
    }
  }

  async usage(): Promise<{ bytes: number }> {
    const walk = async (dir: string): Promise<number> => {
      let entries: Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch (e) {
        if (code(e) === 'ENOENT') return 0
        throw e
      }
      let sum = 0
      for (const d of entries) {
        const p = path.join(dir, d.name)
        sum += d.isDirectory() ? await walk(p) : (await fs.stat(p)).size
      }
      return sum
    }
    return { bytes: await walk(this.root) }
  }
}
