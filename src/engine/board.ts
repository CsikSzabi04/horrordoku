import type { CellId, CharId } from '../shared/base'
import type { BoardEngine, BoardState, Op, OpError } from '../shared/board'
import { buildGrid, parseCell, validCell } from './grid'
import { allowedAt } from './rules'

const err = (error: OpError) => ({ ok: false as const, error })
const ok = (state: BoardState) => ({ ok: true as const, state })
const clone = (s: BoardState): BoardState => ({ placed: { ...s.placed }, marks: [...s.marks], notes: { ...s.notes } })
const at = (s: BoardState, cell: CellId) => Object.keys(s.placed).filter((c) => s.placed[c] === cell)

/** A tábla szabályai (GDD 2.3): soronként/oszloponként egy karakter, foglalt tárgyra nem állhat senki, egy mezőn egy karakter. */
export const boardEngine: BoardEngine = {
  empty: () => ({ placed: {}, marks: [], notes: {} }),

  apply(p, state, op: Op) {
    const g = buildGrid(p)
    const known = (id: CharId) => p.characters.some((c) => c.id === id)
    const s = clone(state)
    switch (op.op) {
      case 'place':
      case 'move': {
        const cell = op.op === 'place' ? op.cell : op.to
        if (!known(op.char)) return err('unknown_char')
        if (!validCell(g, cell)) return err('unknown_cell')
        const { r, c } = parseCell(cell)
        if (g.blocked[r][c] && !op.trap) return err('blocked_object') // trap: az Eltüntetés csapda-mezője (a tárgy épp nincs ott)
        if (!allowedAt(g, p.characters.find((x) => x.id === op.char)!, r, c)) return err('power_violation')
        if (at(s, cell).some((x) => x !== op.char)) return err('cell_occupied')
        for (const [id, other] of Object.entries(s.placed)) {
          if (id === op.char) continue
          const o = parseCell(other)
          if (o.r === r || o.c === c) return err('row_col_conflict')
        }
        s.placed[op.char] = cell
        s.marks = s.marks.filter((m) => m !== cell)
        delete s.notes[cell]
        // a lerakott karakter betű-jegyzetei („itt lehetett") mindenhonnan lekerülnek: a döntés megszületett, a tábla ne maradjon tele a régi tippekkel
        for (const [k, list] of Object.entries(s.notes)) {
          if (!list.includes(op.char)) continue
          const rest = list.filter((x) => x !== op.char)
          if (rest.length) s.notes[k] = rest
          else delete s.notes[k]
        }
        return ok(s)
      }
      case 'unplace':
        if (!known(op.char)) return err('unknown_char')
        delete s.placed[op.char]
        return ok(s)
      case 'mark':
        if (!validCell(g, op.cell)) return err('unknown_cell')
        s.marks = s.marks.filter((m) => m !== op.cell)
        if (op.on && at(s, op.cell).length === 0) s.marks.push(op.cell)
        return ok(s)
      case 'note':
        if (!validCell(g, op.cell)) return err('unknown_cell')
        if (!op.chars.every(known)) return err('unknown_char')
        if (op.chars.length) s.notes[op.cell] = [...op.chars]
        else delete s.notes[op.cell]
        return ok(s)
      case 'erase':
        if (!validCell(g, op.cell)) return err('unknown_cell')
        for (const id of at(s, op.cell)) delete s.placed[id]
        s.marks = s.marks.filter((m) => m !== op.cell)
        delete s.notes[op.cell]
        return ok(s)
    }
  },

  /** A sor/oszlop szerinti automatikus X-ek: számolt érték, nem tárolódik. */
  autoMarks(p, state) {
    const n = p.size
    const rows = new Set<number>()
    const cols = new Set<number>()
    const taken = new Set(Object.values(state.placed))
    for (const cell of taken) {
      const { r, c } = parseCell(cell)
      rows.add(r)
      cols.add(c)
    }
    const out: CellId[] = []
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const id = String.fromCharCode(65 + c) + (r + 1)
        if ((rows.has(r) || cols.has(c)) && !taken.has(id)) out.push(id)
      }
    return out
  },

  isComplete: (p, state) => p.characters.every((c) => state.placed[c.id] !== undefined),

  check(p, state) {
    const wrongChars = p.characters.filter((c) => state.placed[c.id] !== undefined && state.placed[c.id] !== p.solution[c.id]).map((c) => c.id)
    return { correct: this.isComplete(p, state) && wrongChars.length === 0, wrongChars }
  },
}
