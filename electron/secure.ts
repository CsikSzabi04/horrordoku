import { promises as fs } from 'node:fs'
import { writeFileAtomic } from './memory'

/** Titkosító (az Electron safeStorage-ot kötjük bele; a tesztekben csonk). */
export interface Cipher {
  isAvailable(): boolean
  encrypt(plain: string): Buffer
  decrypt(data: Buffer): string
}

/** Kulcs → titkosított érték, egyetlen fájlban (memory/auth.bin). A műveletek sorba állnak. */
export class SecureStore {
  private chain: Promise<unknown> = Promise.resolve()
  constructor(
    private file: string,
    private cipher: Cipher,
  ) {}

  private async load(): Promise<Record<string, string>> {
    try {
      const j: unknown = JSON.parse(await fs.readFile(this.file, 'utf8'))
      return j && typeof j === 'object' ? (j as Record<string, string>) : {}
    } catch {
      return {}
    }
  }

  private queue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(() => fn())
    this.chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  get(key: string): Promise<string | null> {
    return this.queue(async () => {
      const v = (await this.load())[key]
      if (typeof v !== 'string') return null
      try {
        return this.cipher.decrypt(Buffer.from(v, 'base64'))
      } catch {
        return null
      }
    })
  }

  set(key: string, value: string): Promise<void> {
    return this.queue(async () => {
      if (!this.cipher.isAvailable()) throw new Error('secure storage unavailable')
      const m = await this.load()
      m[key] = this.cipher.encrypt(value).toString('base64')
      await writeFileAtomic(this.file, JSON.stringify(m), false)
    })
  }

  remove(key: string): Promise<void> {
    return this.queue(async () => {
      const m = await this.load()
      if (!(key in m)) return
      delete m[key]
      await writeFileAtomic(this.file, JSON.stringify(m), false)
    })
  }
}
