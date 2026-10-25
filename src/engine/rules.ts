import type { CellId, CharId } from '../shared/base'
import type { Clue, Puzzle, PuzzleCharacter } from '../shared/puzzle'
import { NEIGH4, buildGrid, inGrid, parseCell } from './grid'
import type { Grid } from './grid'
import { CATEGORIES } from './vocab'

/**
 * Szomszédos (4 irány) mezőn van-e a megadott típusú tárgy, UGYANABBAN a helyiségben (a Murdoku „mellette"-je).
 * Világ-szabályok: `grab` (Poppy) — a kéz-kapcsoló 2 mezőig „odaér" egy sorban/oszlopban; `door*` (RE) — az ajtón át a szomszéd helyiségre is érvényes.
 */
function besideType(g: Grid, r: number, c: number, t: string): boolean {
  // csak a „Zárt ajtók" világban (RE) érvényes az ajtón át; máshol a `doorbtn` (ajtógomb) sima tárgy
  const anyRoom = g.rule === 'doors' && t.startsWith('door')
  const reach = g.rule === 'grab' && t === 'panel' ? 2 : 1
  for (const [dr, dc] of NEIGH4)
    for (let d = 1; d <= reach; d++) {
      const nr = r + dr * d
      const nc = c + dc * d
      if (inGrid(g, nr, nc) && (anyRoom || d > 1 || g.room[nr][nc] === g.room[r][c]) && g.objs[nr][nc].includes(t)) return true
    }
  return false
}
function besideObj(g: Grid, r: number, c: number, types: readonly string[]): boolean {
  return types.some((t) => besideType(g, r, c, t))
}

/** Implicit szabály: Dead Space — a nyomásmentes helyiségbe csak páncélos állhat. */
export const allowedAt = (g: Grid, ch: PuzzleCharacter, r: number, c: number): boolean => ch.armored === true || !g.vacuum.has(g.room[r][c])

function minDist(g: Grid, r: number, c: number, type: string): number {
  let best = Infinity
  for (let i = 0; i < g.n; i++)
    for (let j = 0; j < g.n; j++) if (g.objs[i][j].includes(type)) best = Math.min(best, Math.abs(i - r) + Math.abs(j - c))
  return best
}

/** Csak a mezőtől függő rész. A páros / globális fajtáknál mindig igaz (azokat `pairRelations` / `globalOk` ellenőrzi). */
export function unaryOk(g: Grid, clue: Clue, r: number, c: number): boolean {
  switch (clue.kind) {
    case 'on':
      return g.objs[r][c].includes(clue.object) && (!clue.room || g.room[r][c] === clue.room)
    case 'onlyOn':
      return g.objs[r][c].includes(clue.object)
    case 'in':
      return g.room[r][c] === clue.room
    case 'aloneWithKiller':
      return !clue.room || g.room[r][c] === clue.room
    case 'col':
      return c === clue.n - 1
    case 'row':
      return r === clue.n - 1
    case 'notIn':
      return g.room[r][c] !== clue.room
    case 'beside':
      return (!clue.room || g.room[r][c] === clue.room) && besideObj(g, r, c, [clue.object])
    case 'besideAny':
      return besideObj(g, r, c, clue.objects)
    case 'corner':
      return (r === 0 || r === g.n - 1) && (c === 0 || c === g.n - 1)
    case 'distance':
      return minDist(g, r, c, clue.fromObject) === clue.cells
    case 'notBeside':
      return !besideObj(g, r, c, [clue.object])
    case 'besideCat':
      return besideObj(g, r, c, CATEGORIES[clue.cat]?.types ?? [])
    case 'notBesideCat':
      return !besideObj(g, r, c, CATEGORIES[clue.cat]?.types ?? [])
    case 'terrain':
      return (g.floor[r][c] === clue.style) !== !!clue.not
    case 'line': {
      const v = clue.axis === 'row' ? r : c
      return clue.op === 'lt' ? v < clue.n - 1 : clue.op === 'gt' ? v > clue.n - 1 : v !== clue.n - 1
    }
    case 'edge': {
      const e = r === 0 || c === 0 || r === g.n - 1 || c === g.n - 1
      return clue.inner ? !e : e
    }
    case 'lit':
      return g.lit[r][c]
    case 'dark':
      return !g.lit[r][c]
    default:
      return true
  }
}

export interface Pair {
  a: CharId
  b: CharId
  test: (ar: number, ac: number, br: number, bc: number, g: Grid) => boolean
}

/** Két karakter közti nyomok (besideChar, sameRoom, leftOf, diagonal). */
export function pairRelations(chars: readonly PuzzleCharacter[]): Pair[] {
  const out: Pair[] = []
  for (const x of chars)
    for (const cl of x.clues) {
      if (cl.kind === 'besideChar')
        out.push({ a: x.id, b: cl.char, test: (ar, ac, br, bc, g) => Math.abs(ar - br) + Math.abs(ac - bc) === 1 && g.room[ar][ac] === g.room[br][bc] })
      else if (cl.kind === 'sameRoom') out.push({ a: x.id, b: cl.with, test: (ar, ac, br, bc, g) => g.room[ar][ac] === g.room[br][bc] })
      else if (cl.kind === 'dir')
        out.push({ a: x.id, b: cl.of, test: (ar, ac, br, bc) => (cl.dir === 'N' ? ar < br : cl.dir === 'S' ? ar > br : cl.dir === 'E' ? ac > bc : ac < bc) })
      else if (cl.kind === 'notSameRoom') out.push({ a: x.id, b: cl.with, test: (ar, ac, br, bc, g) => g.room[ar][ac] !== g.room[br][bc] })
      else if (cl.kind === 'northOf') out.push({ a: x.id, b: cl.of, test: (ar, _ac, br) => ar === br - cl.rows })
      else if (cl.kind === 'southOf') out.push({ a: x.id, b: cl.of, test: (ar, _ac, br) => ar === br + cl.rows })
      else if (cl.kind === 'aloneWith') out.push({ a: x.id, b: cl.with, test: (ar, ac, br, bc, g) => g.room[ar][ac] === g.room[br][bc] })
      else if (cl.kind === 'leftOf') out.push({ a: x.id, b: cl.of, test: (_ar, ac, _br, bc) => ac < bc })
      else if (cl.kind === 'diagonal')
        out.push({ a: x.id, b: cl.of, test: (ar, ac, br, bc, g) => Math.abs(ar - br) === 1 && Math.abs(ac - bc) === 1 && g.room[ar][ac] === g.room[br][bc] })
    }
  return out
}

type Pos = Map<CharId, [number, number]>

/** Az egész elrendezésre vonatkozó nyomok: az áldozat helyiségében pontosan egy gyanúsított, onlyOn, roomAlone. */
export function globalOk(g: Grid, chars: readonly PuzzleCharacter[], pos: Pos): boolean {
  if (g.rule === 'generators') {
    // Dead by Daylight: a gyilkos zajt csap a generátor mellett, ezért nem állhat mellette
    const vic = chars.find((y) => y.victim)
    if (vic) {
      const [vr, vc] = pos.get(vic.id)!
      for (const y of chars) {
        const [yr, yc] = pos.get(y.id)!
        if (!y.victim && g.room[yr][yc] === g.room[vr][vc] && besideType(g, yr, yc, 'generator')) return false
      }
    }
  }
  for (const x of chars) {
    const [r, c] = pos.get(x.id)!
    for (const cl of x.clues) {
      if (cl.kind === 'aloneWithKiller') {
        const home = cl.room ?? g.room[r][c]
        let suspects = 0
        for (const y of chars) {
          if (y.victim) continue
          const [yr, yc] = pos.get(y.id)!
          if (g.room[yr][yc] === home) suspects++
        }
        if (suspects !== 1) return false
      } else if (cl.kind === 'withGender') {
        if (!chars.some((y) => y.id !== x.id && y.gender === cl.gender && g.room[pos.get(y.id)![0]][pos.get(y.id)![1]] === g.room[r][c])) return false
      } else if (cl.kind === 'roomCount') {
        if (chars.filter((y) => g.room[pos.get(y.id)![0]][pos.get(y.id)![1]] === g.room[r][c]).length !== cl.n) return false
      } else if (cl.kind === 'aloneWith') {
        for (const y of chars) {
          if (y.id === x.id || y.id === cl.with) continue
          const [yr, yc] = pos.get(y.id)!
          if (g.room[yr][yc] === g.room[r][c]) return false
        }
      } else if (cl.kind === 'onlyOn') {
        for (const y of chars) {
          if (y.id === x.id) continue
          const [yr, yc] = pos.get(y.id)!
          if (g.objs[yr][yc].includes(cl.object)) return false
        }
      } else if (cl.kind === 'roomAlone') {
        for (const y of chars) {
          if (y.id === x.id) continue
          const [yr, yc] = pos.get(y.id)!
          if (g.room[yr][yc] === g.room[r][c]) return false
        }
      }
    }
  }
  return true
}

/** Teljes ellenőrzés: egy teljes elrendezés kielégít-e MINDEN nyomot és szabályt (tesztekhez, generátorhoz). */
export function verifySolution(p: Puzzle, sol: Record<CharId, CellId>): boolean {
  const g = buildGrid(p)
  const pos: Pos = new Map()
  const rows = new Set<number>()
  const cols = new Set<number>()
  for (const ch of p.characters) {
    const id = sol[ch.id]
    if (!id) return false
    const { r, c } = parseCell(id)
    if (!inGrid(g, r, c) || g.blocked[r][c] || rows.has(r) || cols.has(c) || !allowedAt(g, ch, r, c)) return false
    rows.add(r)
    cols.add(c)
    pos.set(ch.id, [r, c])
    if (!ch.clues.every((cl) => unaryOk(g, cl, r, c))) return false
  }
  for (const pr of pairRelations(p.characters)) {
    const a = pos.get(pr.a)
    const b = pos.get(pr.b)
    if (!a || !b || !pr.test(a[0], a[1], b[0], b[1], g)) return false
  }
  return globalOk(g, p.characters, pos)
}

/** Igaz-e egy adott nyom a megadott elrendezésben (a generátor ezzel válogatja a rá igaz nyomokat). */
export function clueHolds(g: Grid, chars: readonly PuzzleCharacter[], pos: Pos, owner: PuzzleCharacter, clue: Clue): boolean {
  const [r, c] = pos.get(owner.id)!
  if (!unaryOk(g, clue, r, c)) return false
  const probe = chars.map((y) => (y.id === owner.id ? { ...y, clues: [clue] } : { ...y, clues: [] }))
  for (const pr of pairRelations(probe)) {
    const a = pos.get(pr.a)
    const b = pos.get(pr.b)
    if (!a || !b || !pr.test(a[0], a[1], b[0], b[1], g)) return false
  }
  return globalOk(g, probe, pos)
}

/** Élő ütközés-jelzés: a lerakott karakterek közül azok, akik megsértik a saját nyomukat (az üres mezők nem számítanak). */
export function violations(p: Puzzle, placed: Record<CharId, CellId>): CharId[] {
  const g = buildGrid(p)
  const bad = new Set<CharId>()
  for (const ch of p.characters) {
    const at = placed[ch.id]
    if (!at) continue
    const { r, c } = parseCell(at)
    if (!ch.clues.every((cl) => unaryOk(g, cl, r, c))) bad.add(ch.id)
  }
  for (const pr of pairRelations(p.characters)) {
    const a = placed[pr.a]
    const b = placed[pr.b]
    if (!a || !b) continue
    const pa = parseCell(a)
    const pb = parseCell(b)
    if (!pr.test(pa.r, pa.c, pb.r, pb.c, g)) bad.add(pr.a)
  }
  return [...bad]
}

/** A cella mellett (négy irány, azonos helyiség) van-e a megadott típusú tárgy — a UI a zárolt (totemes) nyom feloldásához használja. */
export function isBesideType(p: Puzzle, cell: CellId, type: string): boolean {
  const g = buildGrid(p)
  const { r, c } = parseCell(cell)
  return besideType(g, r, c, type)
}
