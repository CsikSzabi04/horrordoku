import { listPuzzles } from '../content/catalog'
import type { PuzzleMeta } from '../content/catalog'
import type { Puzzle } from '../shared/puzzle'

/**
 * A „Folytatás” célja: a Klasszikusban a következő ügy (szint szerint, azon belül sorszám szerint; a szint végén a következő szint
 * első ügye), az Eseményben a világ következő ügye (a világ végén a következő világ első ügye). A katalógus azonosító szerint rendezett. A bónusz- és a véletlen ügynek nincs „következője”.
 */
export function nextPuzzle(p: Pick<Puzzle, 'id' | 'mode'>): PuzzleMeta | null {
  if (p.mode !== 'classic' && p.mode !== 'event') return null
  const list = listPuzzles(p.mode)
  const i = list.findIndex((x) => x.id === p.id)
  return i >= 0 ? (list[i + 1] ?? null) : null
}
