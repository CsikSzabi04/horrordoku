import type { Clue, Puzzle } from '../shared/puzzle'
import { CATEGORIES, OBJECTS } from './vocab'
import { CATEGORIES_EN, OBJECTS_EN, ROOMS_EN, TERRAIN_EN } from './vocab.en'

/**
 * Angol nyomkártya-szöveg a nyom szerkezetéből (a magyar `text.ts` angol párja). A `**…**` közötti rész a kártyán félkövér.
 * A mondatok a gyanúsított állításai, alany nélkül („Sat on a bench.”), mint a magyarban.
 */
export interface EnOptions {
  /** A szereplő angol megjelenített neve (azonosító, magyar név → angol név); alapból a puzzle-beli név. */
  nameOf?: (id: string, name: string) => string
  /** A kitakart (rádió / spóra-köd) nyom: a tárgy neve helyén `███` áll, mint a magyar szövegben. */
  redacted?: boolean
}

type Ctx = Pick<Puzzle, 'rooms' | 'characters' | 'objects'>

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const num = (n: number): string => NUM[n] ?? String(n)
export const ordinal = (n: number): string => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}
const a = (w: string): string => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`
const or = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`)

const sits = (type: string): boolean => !!OBJECTS[type]?.sit
export const objEn = (type: string): string => OBJECTS_EN[type] ?? type
/** Helyiség „in the Kitchen” alakja (a magyar helyiségnévből). */
export const roomInEn = (huName: string): string => ROOMS_EN[huName]?.in ?? `in the ${huName}`
export const roomNameEn = (huName: string): string => ROOMS_EN[huName]?.name ?? huName

/** Az angol kategória-nyom: a PÁLYÁN lévő tagok neve, mint a magyar `categoryNames`. */
export function categoryNamesEn(cat: string, objects: Pick<Puzzle, 'objects'>['objects']): string {
  const members = CATEGORIES[cat]?.types ?? []
  const onBoard = [...new Set(objects.map((o) => o.type))].filter((t) => members.includes(t)).map(objEn)
  if (onBoard.length === 0) return CATEGORIES_EN[cat] ?? cat
  return or(onBoard.map(a))
}

export function clueTextEn(clue: Clue, p: Ctx, opt: EnOptions = {}): string {
  const room = (l: string) => roomInEn(p.rooms[l] ?? l)
  const who = (id: string) => {
    const name = p.characters.find((c) => c.id === id)?.name ?? id
    return opt.nameOf ? opt.nameOf(id, name) : name
  }
  const obj = (t: string) => (opt.redacted ? '███' : objEn(t))
  switch (clue.kind) {
    case 'on': {
      const o = sits(clue.object) ? 'Sat' : 'Stood'
      const base = `${o} on ${opt.redacted ? 'a **███**' : `**${a(objEn(clue.object))}**`}`
      return clue.room ? `${base} ${room(clue.room)}.` : `${base}.`
    }
    case 'onlyOn':
      return `Was the **only one** ${sits(clue.object) ? 'sitting' : 'standing'} on **${a(obj(clue.object))}**.`
    case 'in':
      return `Was ${room(clue.room)}.`
    case 'notIn':
      return `Was **not** ${room(clue.room)}.`
    case 'beside':
      return `Was **next to ${a(objEn(clue.object))}**.`
    case 'besideAny':
      return `Was **next to ${or(clue.objects.map((o) => a(objEn(o))))}**.`
    case 'besideChar':
      return `Was **next to ${who(clue.char)}**.`
    case 'sameRoom':
      return `Was in the **same room as ${who(clue.with)}**.`
    case 'leftOf':
      return `Was **to the left of ${who(clue.of)}**.`
    case 'diagonal':
      return `Was **diagonally next to ${who(clue.of)}**.`
    case 'dir':
      return `Was **${{ N: 'north', E: 'east', S: 'south', W: 'west' }[clue.dir]} of ${who(clue.of)}**.`
    case 'notBeside':
      return `Was **not next to ${a(objEn(clue.object))}**.`
    case 'besideCat':
      return `Was **next to ${categoryNamesEn(clue.cat, p.objects)}**.`
    case 'notBesideCat':
      return `Was **not next to ${categoryNamesEn(clue.cat, p.objects)}**.`
    case 'terrain': {
      const w = TERRAIN_EN[clue.style]?.in ?? clue.style
      return clue.not ? `Did **not** stand **${w}**.` : `Stood **${w}**.`
    }
    case 'line': {
      const unit = clue.axis === 'row' ? 'row' : 'column'
      const nth = `the ${ordinal(clue.n)} ${unit}`
      if (clue.op === 'ne') return `Was **not in ${nth}**.`
      const rel = clue.axis === 'row' ? (clue.op === 'lt' ? 'above' : 'below') : clue.op === 'lt' ? 'left of' : 'right of'
      return `Was **${rel} ${nth}**.`
    }
    case 'onlyGender': {
      const who = clue.gender === 'm' ? 'man' : 'woman'
      return clue.room ? `Was the **only ${who}** ${room(clue.room)}.` : `Was the **only ${who}** in their room.`
    }
    case 'withGender':
      return `There was **${clue.gender === 'm' ? 'a man' : 'a woman'}** in their room.`
    case 'notSameRoom':
      return `Was **not in the same room as ${who(clue.with)}**.`
    case 'edge':
      return clue.inner ? 'Was **not** at the edge of the board.' : 'Was at the **edge** of the board.'
    case 'roomCount':
      return `There were **${num(clue.n)} of them** in their room.`
    case 'corner':
      return 'Was in a **corner** of the board.'
    case 'distance': {
      const cells = new Set(p.objects.filter((x) => x.type === clue.fromObject).flatMap((x) => (Array.isArray(x.at) ? x.at : [x.at])))
      const from = cells.size > 1 ? `the nearest ${objEn(clue.fromObject)}` : `the ${objEn(clue.fromObject)}`
      return `Was exactly **${clue.cells} ${clue.cells === 1 ? 'cell' : 'cells'}** from ${from}.`
    }
    case 'col':
      return `Was in the **${ordinal(clue.n)} column**.`
    case 'row':
      return `Was in the **${ordinal(clue.n)} row**.`
    case 'northOf':
      return `Was exactly **${num(clue.rows)} ${clue.rows === 1 ? 'row' : 'rows'} north of ${who(clue.of)}**.`
    case 'southOf':
      return `Was exactly **${num(clue.rows)} ${clue.rows === 1 ? 'row' : 'rows'} south of ${who(clue.of)}**.`
    case 'aloneWith':
      return `Was **alone with ${who(clue.with)}**.`
    case 'aloneWithKiller':
      return clue.room ? `The victim. ${room(clue.room).replace(/^./, (c) => c.toUpperCase())}, **alone** with the killer.` : 'The victim. **Alone** with the killer.'
    case 'roomAlone':
      return 'Was **alone**.'
    case 'liar':
      return 'One of the clues is lying.'
    case 'lit':
      return 'Stood on a lit cell.'
    case 'dark':
      return 'Stood on a dark cell — possessed by the Darkness.'
  }
}

