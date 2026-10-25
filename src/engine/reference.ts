import type { CellId, CharId } from '../shared/base'
import type { Clue, Puzzle } from '../shared/puzzle'
import { CATEGORIES } from './vocab'

/**
 * FÜGGETLEN referencia-értelmező — szándékosan egyszerű, és NEM használja a `rules.ts` / `solver.ts` kódját.
 * A játékosnak szóló szabályszövegek alapján értelmezi a nyomokat, így az `audit.test.ts` ezzel ellenőrzi, hogy
 * a pálya, ahogy a játékos látja (tárgyak, helyiségek, nyomszövegek), tényleg megoldható és egyértelmű:
 *  · „mellett" = négy szomszédos mező (átlósan nem), UGYANABBAN a helyiségben;
 *  · „Zárt ajtók" világ: a `door…` tárgyak mellett az ajtón át is; „Fogd meg!": a kéz-kapcsoló 2 mezőig, egy sorban/oszlopban;
 *  · az áldozattal egyedül lévő gyanúsított a gyilkos; „egyedül" = senki más a helyiségben (az áldozatot is beleértve).
 */
interface P {
  r: number
  c: number
}
const at = (id: CellId): P => ({ c: id.charCodeAt(0) - 65, r: Number(id.slice(1)) - 1 })

const UNARY = new Set(['on', 'in', 'notIn', 'beside', 'besideAny', 'notBeside', 'besideCat', 'notBesideCat', 'terrain', 'line', 'edge', 'corner', 'distance', 'col', 'row', 'lit', 'dark'])
const PAIR = new Set(['besideChar', 'sameRoom', 'notSameRoom', 'dir', 'leftOf', 'diagonal', 'northOf', 'southOf', 'aloneWith'])

export function makeReference(p: Puzzle) {
  const n = p.size
  const rule = p.worldRule
  const roomAt = (q: P) => p.layout[q.r]![q.c]!
  const objs: string[][][] = Array.from({ length: n }, () => Array.from({ length: n }, () => []))
  const blocked = Array.from({ length: n }, () => Array<boolean>(n).fill(false))
  for (const o of p.objects)
    for (const id of Array.isArray(o.at) ? o.at : [o.at]) {
      const q = at(id)
      objs[q.r]![q.c]!.push(o.type)
      if (o.blocking) blocked[q.r]![q.c] = true
    }
  const has = (q: P, t: string) => q.r >= 0 && q.c >= 0 && q.r < n && q.c < n && objs[q.r]![q.c]!.includes(t)
  const manhattan = (a: P, b: P) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c)
  const cells: P[] = Array.from({ length: n * n }, (_, i) => ({ r: Math.floor(i / n), c: i % n }))
  const lit = (q: P) => cells.some((x) => (has(x, 'lamp') || has(x, 'charger')) && manhattan(x, q) <= 1)
  const ORTH: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  /** „X mellett": szomszédos mezőn van-e az `t` tárgy (a világ-szabályok kivételeivel). */
  function beside(q: P, t: string): boolean {
    for (const [dr, dc] of ORTH) {
      const o = { r: q.r + dr, c: q.c + dc }
      if (!has(o, t)) continue
      if (rule === 'doors' && t.startsWith('door')) return true
      if (roomAt(o) === roomAt(q)) return true
    }
    if (rule === 'grab' && t === 'panel') for (const [dr, dc] of ORTH) if (has({ r: q.r + 2 * dr, c: q.c + 2 * dc }, t)) return true
    return false
  }
  const nearest = (q: P, t: string) => Math.min(...cells.filter((x) => has(x, t)).map((x) => manhattan(x, q)))

  /** Egy nyom igaz-e. `pos`: ismert helyek; a más szereplőktől függő nyomok csak teljes (vagy a szükséges) hely-ismeretnél értékelhetők. */
  function holds(cl: Clue, me: CharId, pos: Map<CharId, P>): boolean {
    const a = pos.get(me)!
    const who = (id: CharId) => pos.get(id)!
    const others = [...pos.entries()].filter(([id]) => id !== me)
    switch (cl.kind) {
      case 'on': return has(a, cl.object) && (!cl.room || roomAt(a) === cl.room)
      case 'onlyOn': return has(a, cl.object) && others.every(([, q]) => !has(q, cl.object))
      case 'in': return roomAt(a) === cl.room
      case 'notIn': return roomAt(a) !== cl.room
      case 'beside': return (!cl.room || roomAt(a) === cl.room) && beside(a, cl.object)
      case 'besideAny': return cl.objects.some((t) => beside(a, t))
      case 'besideChar': return manhattan(a, who(cl.char)) === 1 && roomAt(a) === roomAt(who(cl.char))
      case 'sameRoom': return roomAt(a) === roomAt(who(cl.with))
      case 'leftOf': return a.c < who(cl.of).c
      case 'diagonal': return Math.abs(a.r - who(cl.of).r) === 1 && Math.abs(a.c - who(cl.of).c) === 1 && roomAt(a) === roomAt(who(cl.of))
      case 'corner': return (a.r === 0 || a.r === n - 1) && (a.c === 0 || a.c === n - 1)
      case 'distance': return nearest(a, cl.fromObject) === cl.cells
      case 'col': return a.c === cl.n - 1
      case 'row': return a.r === cl.n - 1
      case 'northOf': return a.r === who(cl.of).r - cl.rows
      case 'southOf': return a.r === who(cl.of).r + cl.rows
      case 'aloneWith': return roomAt(a) === roomAt(who(cl.with)) && others.every(([id, q]) => id === cl.with || roomAt(q) !== roomAt(a))
      case 'roomAlone': return others.every(([, q]) => roomAt(q) !== roomAt(a))
      case 'aloneWithKiller': {
        if (cl.room && roomAt(a) !== cl.room) return false
        const suspectsHere = others.filter(([id, q]) => !p.characters.find((c) => c.id === id)!.victim && roomAt(q) === roomAt(a))
        return suspectsHere.length === 1
      }
      case 'notBeside': return !beside(a, cl.object)
      case 'besideCat': return (CATEGORIES[cl.cat]?.types ?? []).some((t) => beside(a, t))
      case 'notBesideCat': return !(CATEGORIES[cl.cat]?.types ?? []).some((t) => beside(a, t))
      case 'terrain': return ((p.floors?.[roomAt(a)] ?? '') === cl.style) !== !!cl.not
      case 'line': {
        const v = cl.axis === 'row' ? a.r : a.c
        return cl.op === 'lt' ? v < cl.n - 1 : cl.op === 'gt' ? v > cl.n - 1 : v !== cl.n - 1
      }
      case 'edge': {
        const onEdge = a.r === 0 || a.c === 0 || a.r === n - 1 || a.c === n - 1
        return cl.inner ? !onEdge : onEdge
      }
      case 'dir': {
        const b = who(cl.of)
        return cl.dir === 'N' ? a.r < b.r : cl.dir === 'S' ? a.r > b.r : cl.dir === 'E' ? a.c > b.c : a.c < b.c
      }
      case 'notSameRoom': return roomAt(a) !== roomAt(who(cl.with))
      case 'withGender': return others.some(([id, q]) => p.characters.find((c) => c.id === id)!.gender === cl.gender && roomAt(q) === roomAt(a))
      case 'roomCount': return [...pos.values()].filter((q) => roomAt(q) === roomAt(a)).length === cl.n
      case 'lit': return lit(a)
      case 'dark': return !lit(a)
      case 'liar': return true
    }
  }

  /** Teljes elrendezés ellenőrzése; a megsértett szabályok listája (üres = érvényes). */
  function violations(sol: Record<CharId, CellId>): string[] {
    const out: string[] = []
    const pos = new Map<CharId, P>()
    for (const ch of p.characters) {
      const id = sol[ch.id]
      if (!id) {
        out.push(`${ch.name}: nincs lerakva`)
        continue
      }
      pos.set(ch.id, at(id))
    }
    if (out.length) return out
    const rows = new Set<number>()
    const cols = new Set<number>()
    for (const ch of p.characters) {
      const q = pos.get(ch.id)!
      if (blocked[q.r]![q.c]) out.push(`${ch.name}: foglalt tárgyon áll`)
      if (rows.has(q.r)) out.push(`${ch.name}: a sorban már áll valaki`)
      if (cols.has(q.c)) out.push(`${ch.name}: az oszlopban már áll valaki`)
      rows.add(q.r)
      cols.add(q.c)
      if ((p.vacuumRooms ?? []).includes(roomAt(q)) && !ch.armored) out.push(`${ch.name}: páncél nélkül a vákuumban`)
    }
    for (const ch of p.characters) for (const cl of ch.clues) if (!holds(cl, ch.id, pos)) out.push(`${ch.name}: ${ch.clueText.join(' ')} (${cl.kind})`)
    if (rule === 'generators') {
      const v = p.characters.find((c) => c.victim)!
      for (const ch of p.characters)
        if (!ch.victim && roomAt(pos.get(ch.id)!) === roomAt(pos.get(v.id)!) && beside(pos.get(ch.id)!, 'generator')) out.push(`${ch.name}: a gyilkos generátor mellett áll`)
    }
    return out
  }

  /** Megoldások száma `limit`-ig (visszalépéses keresés, a legkevesebb jelöltű szereplővel). `exhausted`: a keret kevés volt. */
  function count(limit = 2, budget = 4_000_000, override?: Map<CharId, Clue[]>): { count: number; exhausted: boolean } {
    const chars = p.characters.map((c) => ({ ...c, clues: override?.get(c.id) ?? c.clues }))
    const cand = new Map<CharId, P[]>()
    for (const ch of chars) {
      const list: P[] = []
      for (const q of cells) {
        if (blocked[q.r]![q.c]) continue
        if ((p.vacuumRooms ?? []).includes(roomAt(q)) && !ch.armored) continue
        const solo = new Map<CharId, P>([[ch.id, q]])
        if (ch.clues.every((cl) => (UNARY.has(cl.kind) ? holds(cl, ch.id, solo) : cl.kind === 'aloneWithKiller' ? !cl.room || roomAt(q) === cl.room : true))) list.push(q)
      }
      cand.set(ch.id, list)
    }
    const pos = new Map<CharId, P>()
    const rowUsed = Array<boolean>(n).fill(false)
    const colUsed = Array<boolean>(n).fill(false)
    let found = 0
    let nodes = 0
    let exhausted = false
    const fullOk = (): boolean => {
      for (const ch of chars) for (const cl of ch.clues) if (!holds(cl, ch.id, pos)) return false
      if (rule === 'generators') {
        const v = chars.find((c) => c.victim)!
        for (const ch of chars) if (!ch.victim && roomAt(pos.get(ch.id)!) === roomAt(pos.get(v.id)!) && beside(pos.get(ch.id)!, 'generator')) return false
      }
      return true
    }
    const pairOk = (ch: (typeof chars)[number]): boolean => {
      for (const x of chars) {
        if (!pos.has(x.id)) continue
        for (const cl of x.clues) {
          if (!PAIR.has(cl.kind)) continue
          const other = cl.kind === 'besideChar' ? cl.char : 'with' in cl ? cl.with : (cl as { of: CharId }).of
          if ((x.id === ch.id || other === ch.id) && pos.has(other) && !holds(cl, x.id, pos)) return false
        }
      }
      return true
    }
    const dfs = (): void => {
      if (found >= limit || exhausted) return
      if (pos.size === chars.length) {
        if (fullOk()) found++
        return
      }
      let best: (typeof chars)[number] | null = null
      let bestList: P[] = []
      for (const ch of chars) {
        if (pos.has(ch.id)) continue
        const list = cand.get(ch.id)!.filter((q) => !rowUsed[q.r] && !colUsed[q.c])
        if (best === null || list.length < bestList.length) {
          best = ch
          bestList = list
        }
        if (list.length === 0) return
      }
      for (const q of bestList) {
        if (++nodes > budget) {
          exhausted = true
          return
        }
        pos.set(best!.id, q)
        rowUsed[q.r] = colUsed[q.c] = true
        if (pairOk(best!)) dfs()
        rowUsed[q.r] = colUsed[q.c] = false
        pos.delete(best!.id)
        if (found >= limit || exhausted) return
      }
    }
    dfs()
    return { count: found, exhausted }
  }

  return { violations, count, holds }
}
