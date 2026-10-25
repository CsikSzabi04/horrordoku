/** Kulcs-érték háttér. Teszthez: memoryKV; böngészőben: browserKV (localStorage, kvóta-hibánál memóriában marad). */
export interface KV {
  get(k: string): string | null
  set(k: string, v: string): void
  remove(k: string): void
  keys(): string[]
}

export function memoryKV(init: Record<string, string> = {}): KV {
  const m = new Map(Object.entries(init))
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => void m.set(k, v),
    remove: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  }
}

function probe(): Storage | null {
  try {
    const s = globalThis.localStorage
    s.setItem('nd:probe', '1')
    s.removeItem('nd:probe')
    return s
  } catch {
    return null // privát ablak / tiltott tároló → memóriában fut tovább
  }
}

export function browserKV(): KV {
  const mem = memoryKV()
  const s = probe()
  if (!s) return mem
  return {
    get: (k) => mem.get(k) ?? s.getItem(k),
    set: (k, v) => {
      try {
        s.setItem(k, v)
        mem.remove(k)
      } catch {
        mem.set(k, v) // kvóta betelt
      }
    },
    remove: (k) => {
      try {
        s.removeItem(k)
      } catch {
        /* nem kritikus */
      }
      mem.remove(k)
    },
    keys: () => {
      const out = new Set(mem.keys())
      for (let i = 0; i < s.length; i++) out.add(s.key(i)!)
      return [...out]
    },
  }
}
