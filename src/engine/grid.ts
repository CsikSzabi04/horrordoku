import type { CellId } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'

export const cellId = (r: number, c: number): CellId => String.fromCharCode(65 + c) + (r + 1)
export const parseCell = (id: CellId) => ({ c: id.charCodeAt(0) - 65, r: Number(id.slice(1)) - 1 })
export const NEIGH4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

/** A pálya gyors, számolható alakja (a motor és a megoldó ezt használja). */
export interface Grid {
  n: number
  room: string[][]
  objs: string[][][] // mezőnként a tárgy-típusok
  blocked: boolean[][] // foglalt tárgy: senki nem állhat rá
  rule: string | undefined // Puzzle.worldRule
  lit: boolean[][] // Alan Wake: fényes mezők (lámpa / töltő 1 mezős körzetében)
  vacuum: Set<string> // Dead Space: nyomásmentes helyiségek
  floor: string[][] // padló-osztály mezőnként (üres: nincs adat)
}

export const LIGHT_SOURCES = ['lamp', 'charger']

const cache = new WeakMap<Puzzle, Grid>()
export function buildGrid(p: Puzzle): Grid {
  const hit = cache.get(p)
  if (hit) return hit
  const n = p.size
  const objs = Array.from({ length: n }, () => Array.from({ length: n }, () => [] as string[]))
  const blocked = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  for (const o of p.objects)
    for (const id of Array.isArray(o.at) ? o.at : [o.at]) {
      const { r, c } = parseCell(id)
      objs[r][c].push(o.type)
      if (o.blocking) blocked[r][c] = true
    }
  const lit = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (objs[r][c].some((t) => LIGHT_SOURCES.includes(t)))
        for (const [dr, dc] of [[0, 0], ...NEIGH4]) if (r + dr >= 0 && c + dc >= 0 && r + dr < n && c + dc < n) lit[r + dr][c + dc] = true
  const g: Grid = { n, room: p.layout.map((row) => row.split('')), objs, blocked, rule: p.worldRule, lit, vacuum: new Set(p.vacuumRooms ?? []), floor: p.layout.map((row) => [...row].map((l) => p.floors?.[l] ?? '')) }
  cache.set(p, g)
  return g
}

export const inGrid = (g: Grid, r: number, c: number) => r >= 0 && c >= 0 && r < g.n && c < g.n
export const validCell = (g: Grid, id: string) => /^[A-J]([1-9]|10)$/.test(id) && inGrid(g, parseCell(id).r, parseCell(id).c)
