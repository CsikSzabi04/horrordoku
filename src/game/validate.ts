// A hálózatról érkező (más játékosok által küldött) adat ellenőrzése: bármi érkezhet, a kliens ne szálljon el és ne fogadjon el hamisítványt.
import type { BoardState, Op, OpEnvelope } from '../shared/board'

const MAX_ID = 80
const MAX_KEY = 40
const str = (x: unknown, max = MAX_KEY): x is string => typeof x === 'string' && x.length > 0 && x.length <= max
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => k !== '__proto__')

export function isOp(x: unknown): x is Op {
  if (!isObj(x)) return false
  switch (x.op) {
    case 'place':
      return str(x.char) && str(x.cell)
    case 'move':
      return str(x.char) && str(x.to)
    case 'unplace':
      return str(x.char)
    case 'mark':
      return str(x.cell) && typeof x.on === 'boolean'
    case 'note':
      return str(x.cell) && Array.isArray(x.chars) && x.chars.length <= 24 && x.chars.every((c) => str(c))
    case 'erase':
      return str(x.cell)
    default:
      return false
  }
}

export function isEnvelope(x: unknown): x is OpEnvelope {
  return (
    isObj(x) &&
    str(x.id, MAX_ID) &&
    str(x.by, MAX_ID) &&
    typeof x.seq === 'number' &&
    Number.isInteger(x.seq) &&
    x.seq >= 0 &&
    x.seq < 1e9 &&
    typeof x.at === 'number' &&
    Number.isFinite(x.at) &&
    isOp(x.op)
  )
}

export function isEnvelopeLog(x: unknown, max = 6000): x is OpEnvelope[] {
  return Array.isArray(x) && x.length <= max && x.every(isEnvelope)
}

export function isBoardState(x: unknown): x is BoardState {
  if (!isObj(x) || !isObj(x.placed) || !Array.isArray(x.marks) || !isObj(x.notes)) return false
  const placed = x.placed
  if (keys(placed).length > 64 || !keys(placed).every((k) => str(k) && str(placed[k]))) return false
  if (x.marks.length > 400 || !x.marks.every((m) => str(m))) return false
  const notes = x.notes
  const nk = keys(notes)
  if (nk.length > 400) return false
  return nk.every((k) => {
    const v = notes[k]
    return str(k) && Array.isArray(v) && v.length <= 24 && v.every((c) => str(c))
  })
}
