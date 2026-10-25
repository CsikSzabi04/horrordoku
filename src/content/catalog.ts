import { generateFromRef } from '../engine'
import { sessionMatches } from '../game/fingerprint'
import type { Difficulty, Puzzle, PuzzleMode } from '../shared/puzzle'
import type { SessionState } from '../shared/storage'
import classicIndex from './classic-index.json'
import eventIndex from './event-index.json'

/** Egy pálya listaadatai (a teljes pálya nélkül): a választó-képernyők ebből épülnek. */
export interface PuzzleMeta {
  id: string
  mode: PuzzleMode
  title: string
  size: number
  difficulty: Difficulty
  icon?: string
  /** A pálya ujjlenyomata (`game/fingerprint.ts`): a mentés csak az ugyanilyen pályához tartozik. */
  fp?: string
  /** Esemény: a világ azonosítója, szabálya és az ügy sorszáma a világon belül (1–5). */
  world?: string
  worldRule?: string | null
  no?: number
}

/** A katalógus-pályák (Klasszikus 100 + bónusz, Esemény 19 × 5) lustán töltődnek, csak megnyitáskor; a listák az indexekből épülnek. */
const lazy = import.meta.glob<Puzzle>('../../puzzles/{classic,bonus,event}/*.json', { import: 'default' })

/** Minden katalógus-pálya listaadata (Klasszikus, bónusz, Esemény), azonosító szerint rendezve (az Eseményé világonként a sorszám szerint). */
export function listPuzzles(mode?: PuzzleMode): PuzzleMeta[] {
  const all = [...(classicIndex as PuzzleMeta[]), ...(eventIndex as PuzzleMeta[])].sort((a, b) => a.id.localeCompare(b.id))
  return mode ? all.filter((p) => p.mode === mode) : all
}

/** A félbehagyott katalógus-pályák azonosítói — csak azok, amelyeknek a mentése még az ugyanilyen pályához tartozik (nem az elavulthoz). */
export function startedIds(sessions: Record<string, SessionState>): Set<string> {
  const fp = new Map(listPuzzles().map((m) => [m.id, m.fp]))
  return new Set(Object.entries(sessions).filter(([id, s]) => sessionMatches(s, fp.get(id))).map(([id]) => id))
}

/** Katalógus-azonosító vagy `gen:…` ref → pálya (generált pályánál determinisztikusan előállítva). */
export async function loadPuzzle(ref: string): Promise<Puzzle | null> {
  const dir = ref.startsWith('bonus-') ? 'bonus' : ref.startsWith('event-') ? 'event' : 'classic'
  const load = lazy[`../../puzzles/${dir}/${ref}.json`]
  return load ? load() : generateFromRef(ref)
}

/** Több pálya teljes adata (pl. a lobby listájához). */
export async function loadAll(mode?: PuzzleMode): Promise<Puzzle[]> {
  const metas = listPuzzles(mode)
  const out = await Promise.all(metas.map((m) => loadPuzzle(m.id)))
  return out.filter((p): p is Puzzle => p !== null)
}
