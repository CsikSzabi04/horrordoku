// Híd (preload) — docs/CONTRACTS.md 5. fejezet. Bővítés (visszafelé kompatibilis): memory.status().
import type { Unsubscribe } from './base'

export interface NightdokuBridge {
  version: string
  platform: 'win32' | 'darwin' | 'linux'
  memory: {
    dir(): Promise<string> // a memory mappa teljes útja (megjelenítésre)
    /** BŐVÍTÉS: fallback = true, ha az app mappája nem írható, és az %APPDATA%\NIGHTDOKU\memory-t használjuk (a UI figyelmeztet). */
    status(): Promise<{ dir: string; fallback: boolean }>
    readJson<T>(rel: string): Promise<T | null> // rel: "u_ab12cd34/progress.json" — csak a memory mappán belül
    writeJson(rel: string, data: unknown): Promise<void> // atomikus + .bak
    remove(rel: string): Promise<void>
    list(rel: string): Promise<string[]>
    usage(): Promise<{ bytes: number }>
    openInExplorer(): Promise<void>
  }
  /** Electron safeStorage: a titkosított értékek a memory/auth.bin-ben vannak; a kulcsok átlátszatlanok (a scope-előtag a hívó dolga). */
  secure: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
  }
  app: {
    openExternal(url: string): Promise<void> // csak https://
    quit(): void
    onBeforeQuit(cb: () => Promise<void>): Unsubscribe // végső mentés + szinkron-ürítés (max. ~2 mp)
  }
  window: { toggleFullscreen(): void }
}

declare global {
  interface Window {
    nightdoku: NightdokuBridge
  }
}
