import type { CellId, CharId } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'
import { buildGrid, cellId } from './grid'
import { allowedAt, globalOk, pairRelations, unaryOk } from './rules'

export interface SolveResult {
  solutions: Record<CharId, CellId>[]
  /** A keresés csomópontjainak száma (nehézség-becsléshez). */
  nodes: number
  /** A csomópont-keret elfogyott: a találatlista nem teljes (a megoldásszám legalább annyi, amennyit talált). */
  truncated: boolean
}

/**
 * Visszalépéses megoldó: karakterenként a lehetséges mezők (nyomok + foglalt tárgyak szűrik), soronként/oszloponként egy karakter,
 * legkevesebb lehetőségű karakterrel előre. Legfeljebb `limit` megoldást keres (2 elég az egyértelműség-ellenőrzéshez).
 * Megjegyzés: Alakváltó (két kártya) és Démon (hazug nyom) itt még nem támogatott — a Klasszikus módban nincs rájuk szükség.
 */
export function solve(p: Puzzle, limit = 2, maxNodes = Infinity): SolveResult {
  const g = buildGrid(p)
  const n = g.n
  const chars = p.characters
  const cands = new Map<CharId, [number, number][]>()
  for (const ch of chars) {
    const list: [number, number][] = []
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) if (!g.blocked[r][c] && allowedAt(g, ch, r, c) && ch.clues.every((cl) => unaryOk(g, cl, r, c))) list.push([r, c])
    cands.set(ch.id, list)
  }
  const pairs = pairRelations(chars)
  const pos = new Map<CharId, [number, number]>()
  const rowUsed = Array<boolean>(n).fill(false)
  const colUsed = Array<boolean>(n).fill(false)
  const solutions: Record<CharId, CellId>[] = []
  let nodes = 0
  let truncated = false

  // páros nyomok mindkét irányból: a már lerakott társ mezője előre szűri a jelölteket
  type Rel = { other: CharId; test: (r: number, c: number, or: number, oc: number) => boolean }
  const rels = new Map<CharId, Rel[]>()
  const addRel = (id: CharId, rel: Rel) => rels.set(id, [...(rels.get(id) ?? []), rel])
  for (const pr of pairs) {
    addRel(pr.a, { other: pr.b, test: (r, c, or, oc) => pr.test(r, c, or, oc, g) })
    addRel(pr.b, { other: pr.a, test: (r, c, or, oc) => pr.test(or, oc, r, c, g) })
  }
  const compatible = (id: CharId, r: number, c: number) =>
    (rels.get(id) ?? []).every((rel) => {
      const o = pos.get(rel.other)
      return !o || rel.test(r, c, o[0], o[1])
    })

  const dfs = (): void => {
    if (solutions.length >= limit || truncated) return
    if (pos.size === chars.length) {
      if (globalOk(g, chars, pos)) solutions.push(Object.fromEntries([...pos].map(([id, [r, c]]) => [id, cellId(r, c)])))
      return
    }
    let bestId: CharId | null = null
    let best: [number, number][] = []
    for (const ch of chars) {
      if (pos.has(ch.id)) continue
      const avail = cands.get(ch.id)!.filter(([r, c]) => !rowUsed[r] && !colUsed[c] && compatible(ch.id, r, c))
      if (avail.length === 0) return
      if (bestId === null || avail.length < best.length) {
        bestId = ch.id
        best = avail
      }
    }
    for (const [r, c] of best) {
      if (++nodes > maxNodes) {
        truncated = true
        return
      }
      pos.set(bestId!, [r, c])
      rowUsed[r] = colUsed[c] = true
      dfs()
      rowUsed[r] = colUsed[c] = false
      pos.delete(bestId!)
      if (solutions.length >= limit || truncated) return
    }
  }
  dfs()
  return { solutions, nodes, truncated }
}

/**
 * Nehézség-becslés (heurisztika): a tábla mérete + a megoldó csomópontjainak nagyságrendje.
 * A katalógus-pályák nehézségét kézzel adjuk meg; ez a generátor és a validálás ellenőrzése.
 */
export function estimateDifficulty(p: Puzzle): 1 | 2 | 3 | 4 | 5 {
  const { nodes } = solve(p, 2)
  const score = (p.size - 5) * 0.7 + Math.log10(nodes + 1) * 0.6
  return Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5
}
