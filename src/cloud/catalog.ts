// CatalogApi (B2): új / javított katalógus-pályák a `puzzles` táblából (a `rev` alapján) → StorageService.putCachedPuzzles.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogApi } from '../shared/cloud'
import type { Puzzle } from '../shared/puzzle'
import type { StorageService } from '../shared/storage'
import { fromError, guard, ok } from './result'

export function createCatalog(client: SupabaseClient, storage: StorageService): CatalogApi {
  return {
    refresh: () =>
      guard(async () => {
        const meta = await storage.getSyncMeta()
        const list = await client.from('puzzles').select('id, rev') // az RLS csak a kiadottakat adja
        if (list.error) return fromError(list.error)
        const changed = ((list.data ?? []) as { id: string; rev: number }[]).filter((r) => meta.puzzleRevs[r.id] !== r.rev)
        if (changed.length === 0) return ok({ added: 0, updated: 0 })
        const full = await client.from('puzzles').select('id, rev, data').in('id', changed.map((c) => c.id))
        if (full.error) return fromError(full.error)
        const byId = new Map((await storage.getCachedPuzzles()).map((p) => [p.id, p] as const))
        const revs = { ...meta.puzzleRevs }
        let added = 0
        let updated = 0
        for (const row of (full.data ?? []) as { id: string; rev: number; data: Puzzle }[]) {
          if (!row.data || row.data.id !== row.id) continue // hibás sor: kihagyjuk (a következő frissítésnél újra próbáljuk)
          if (meta.puzzleRevs[row.id] === undefined) added++
          else updated++
          byId.set(row.id, row.data)
          revs[row.id] = row.rev
        }
        await storage.putCachedPuzzles([...byId.values()])
        await storage.putSyncMeta({ lastPullAt: new Date().toISOString(), puzzleRevs: revs })
        return ok({ added, updated })
      }),
  }
}
