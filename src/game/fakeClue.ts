// A Gyilkos „Szövegcsere” képessége: egy HIHETŐ, de HAMIS nyomszöveg a kijelölt kártyára (GDD 22.3: tárgy / helyiség / irány kicserélve).
// A hamis szöveget a gyilkos kliense állítja elő a valódi nyom módosításával; a szerver csak az érvényességet és a hűtést ellenőrzi.
import { charName, clueLine, clueLines } from '../content/localize'
import { clueText } from '../engine'
import { clueTextEn } from '../engine/text.en'
import { getLang } from '../i18n/lang'
import type { Clue, Puzzle } from '../shared/puzzle'

const DIR_OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' } as const
const pick = <T,>(arr: readonly T[], rnd: () => number): T | undefined => arr[Math.floor(rnd() * arr.length)]
const other = <T,>(arr: readonly T[], not: T, rnd: () => number): T | undefined => pick(arr.filter((x) => x !== not), rnd)

/** A valódi nyomból egy megváltoztatott (hamis) nyom; `null`, ha ennek a fajtának nincs értelmes hamisítása. */
export function falsify(puzzle: Puzzle, ownerId: string, clue: Clue, rnd: () => number = Math.random): Clue | null {
  const types = [...new Set(puzzle.objects.map((o) => o.type))]
  const rooms = Object.keys(puzzle.rooms)
  const others = puzzle.characters.filter((c) => !c.victim && c.id !== ownerId).map((c) => c.id)
  const n = puzzle.size
  switch (clue.kind) {
    case 'on':
    case 'beside': {
      const object = other(types, clue.object, rnd)
      return object ? { ...clue, object } : null
    }
    case 'onlyOn': {
      const object = other(types, clue.object, rnd)
      return object ? { ...clue, object } : null
    }
    case 'notBeside': {
      const object = other(types, clue.object, rnd)
      return object ? { ...clue, object } : null
    }
    case 'besideAny': {
      const object = other(types, clue.objects[0] ?? '', rnd)
      return object ? { ...clue, objects: [object, ...clue.objects.slice(1)] } : null
    }
    case 'in':
    case 'notIn': {
      const room = other(rooms, clue.room, rnd)
      return room ? { ...clue, room } : null
    }
    case 'col':
    case 'row': {
      const m = clue.n + (clue.n > 1 && (clue.n >= n || rnd() < 0.5) ? -1 : 1)
      return { ...clue, n: m }
    }
    case 'northOf':
      return rnd() < 0.5 ? { kind: 'southOf', of: clue.of, rows: clue.rows } : { ...clue, rows: clue.rows + 1 }
    case 'southOf':
      return rnd() < 0.5 ? { kind: 'northOf', of: clue.of, rows: clue.rows } : { ...clue, rows: clue.rows + 1 }
    case 'dir':
      return { ...clue, dir: DIR_OPPOSITE[clue.dir] }
    case 'leftOf':
      return { kind: 'dir', of: clue.of, dir: 'N' }
    case 'line': {
      const m = clue.n + (clue.n > 1 && (clue.n >= n || rnd() < 0.5) ? -1 : 1)
      return rnd() < 0.5 ? { ...clue, n: m } : { ...clue, op: clue.op === 'lt' ? 'gt' : 'lt' }
    }
    case 'besideChar': {
      const c = other(others, clue.char, rnd)
      return c ? { ...clue, char: c } : null
    }
    case 'diagonal': {
      const c = other(others, clue.of, rnd)
      return c ? { ...clue, of: c } : null
    }
    case 'sameRoom':
    case 'aloneWith':
    case 'notSameRoom': {
      const c = other(others, clue.with, rnd)
      return c ? { ...clue, with: c } : null
    }
    case 'besideCat':
      return { kind: 'notBesideCat', cat: clue.cat }
    case 'notBesideCat':
      return { kind: 'besideCat', cat: clue.cat }
    case 'edge':
      return { kind: 'edge', ...(clue.inner ? {} : { inner: true }) }
    case 'onlyGender':
      return { ...clue, gender: clue.gender === 'm' ? 'f' : 'm' }
    case 'roomCount':
      return { kind: 'roomCount', n: Math.max(2, clue.n + (rnd() < 0.5 ? 1 : -1)) }
    default:
      return null // távolság / fény / hazug / terep / sarok / szobában egyedül / nem: nincs egyszerű hamisítás — a hívó tartalék-nyomot kap
  }
}

/**
 * A kártyára kerülő hamis szöveg (a kártyák szövege `**kiemeléssel**` jelölt, mint a valódi). Mindig különbözik a valódi szövegtől;
 * ha a nyom fajtája nem hamisítható, egy helyiséges tartalék-nyom készül. `null`, ha a karakter nem hamisítható (áldozat / nincs nyoma).
 */
export function fakeClueText(puzzle: Puzzle, charId: string, rnd: () => number = Math.random): string | null {
  const ch = puzzle.characters.find((c) => c.id === charId)
  if (!ch || ch.victim || ch.clues.length === 0) return null
  const real = clueLines(puzzle, ch).join(' ')
  const rooms = Object.keys(puzzle.rooms)
  for (let i = 0; i < 12; i++) {
    const clue = ch.clues[Math.floor(rnd() * ch.clues.length)]!
    const fake = falsify(puzzle, ch.id, clue, rnd) ?? (rooms.length > 1 ? ({ kind: 'in', room: pick(rooms, rnd)! } as Clue) : null)
    if (!fake) return null
    const text = getLang() === 'en' ? clueTextEn(fake, puzzle, { nameOf: charName }) : clueText(fake, puzzle)
    if (text !== real && text !== clueLine(puzzle, ch, 0)) return text
  }
  return null
}
