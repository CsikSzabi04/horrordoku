import type { CharId } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'

const SKIP = new Set(['a', 'az', 'dr.', 'mr.', 'mrs.', 'sister'])

/**
 * A karakter jelölő betűje (kezdőbetű), pályánként egyedi: ha két névnek ugyanaz a kezdőbetűje (pl. Silas / Sam),
 * a hosszabb előtag kell („Si", „Sa"). A Klasszikusban a nevek kezdőbetűje eleve egyedi (A, B, C… és V az áldozat).
 */
export function markersOf(p: Pick<Puzzle, 'characters'>): Map<CharId, string> {
  const words = p.characters.map((c) => {
    const w = c.name.split(/\s+/).find((x) => !SKIP.has(x.toLowerCase())) ?? c.name
    return { id: c.id, w: w.toUpperCase().replace(/[^\p{L}0-9]/gu, '') }
  })
  const out = new Map<CharId, string>()
  for (let len = 1; len <= 6; len++)
    for (const x of words) {
      if (out.has(x.id)) continue
      const m = x.w.slice(0, len)
      if (words.filter((y) => y.id !== x.id && y.w.startsWith(m)).length === 0 || len === 6) out.set(x.id, m)
    }
  return out
}
