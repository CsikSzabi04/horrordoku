import { boardEngine } from '../engine'
import { roomIn } from '../engine/vocab'
import { parseCell } from '../engine/grid'
import type { CellId, CharId } from '../shared/base'
import type { BoardState, Op } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'

export interface Hint {
  text: string
  char: CharId
  /** Az 1. szinten a kártyát, a 2. szinten a helyiség mezőit emeljük ki. */
  room?: string
  ops?: Op[]
}

/** A következő tipp 3 szinten: (1) melyik nyomot nézd, (2) melyik helyiségben van, (3) a helyére is teszi. */
export function nextHint(p: Puzzle, s: BoardState, stage: number, prefer?: CharId): Hint | null {
  const pending = p.characters.filter((c) => s.placed[c.id] !== p.solution[c.id])
  const target = pending.find((c) => c.id === prefer) ?? pending.find((c) => s.placed[c.id] === undefined) ?? pending[0]
  if (!target) return null
  const cell = p.solution[target.id]!
  const { r, c } = parseCell(cell)
  const room = p.layout[r]![c]!
  // a zárolt (totemmel feltárható) nyomot a tipp sem árulja el
  if (stage <= 1) return { text: `Nézd meg alaposan ${target.name} nyomát: „${target.clueText.filter((_, i) => !target.hidden?.includes(i)).join(' / ')}”`, char: target.id }
  if (stage === 2) return { text: `${target.name} ${roomIn(p.rooms[room]!)} van.`, char: target.id, room }
  const ops: Op[] = []
  let cur = s
  const clear = (ch: CharId) => {
    ops.push({ op: 'unplace', char: ch })
    const r2 = boardEngine.apply(p, cur, { op: 'unplace', char: ch })
    if (r2.ok) cur = r2.state
  }
  for (const [id, at] of Object.entries(cur.placed)) {
    const o = parseCell(at as CellId)
    if (id !== target.id && (o.r === r || o.c === c) && at !== p.solution[id]) clear(id)
  }
  ops.push({ op: 'place', char: target.id, cell })
  return { text: `${target.name} helye: ${cell}.`, char: target.id, room, ops }
}
