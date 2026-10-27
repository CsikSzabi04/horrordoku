import type { Clue, Puzzle } from '../shared/puzzle'
import { abl, cap, count, ins, together } from './hu'
import { CATEGORIES, OBJECTS, roomIn, TERRAIN } from './vocab'

const obj = (t: string) => OBJECTS[t] ?? { hu: t, art: `a(z) ${t}`, on: `${t} tárgyon`, sit: false }

/**
 * A kategória-nyom („állat", „ülőhely"…) szövege a PÁLYÁN ténylegesen lévő tárgyak nevével — ugyanazzal, ami a térképen és a
 * jelmagyarázatban áll („kerekesszék", nem „ülőhely"): 1 tárgy → „kerekesszék", 2 → „szék vagy pad", 3+ → „oroszlán, pingvin vagy elefánt".
 * A nyom jelentése nem változik (a kategória bármelyik tagja számít); a sorrend a pályán megjelenés szerinti, mint a jelmagyarázatban.
 */
export function categoryNames(cat: string, objects: Pick<Puzzle, 'objects'>['objects']): string {
  const members = CATEGORIES[cat]?.types ?? []
  const onBoard = [...new Set(objects.map((o) => o.type))].filter((t) => members.includes(t)).map((t) => obj(t).hu)
  if (onBoard.length === 0) return CATEGORIES[cat]?.hu ?? cat // ilyen pályát az audit nem enged át
  return onBoard.length === 1 ? onBoard[0]! : `${onBoard.slice(0, -1).join(', ')} vagy ${onBoard[onBoard.length - 1]}`
}

/**
 * Nyomkártya-szöveg sablonból. A `**…**` közötti rész a kártyán félkövér (a Murdoku-stílus: a lényeg kiemelve).
 * A generált pályák `clueText`-je ebből készül; a kézzel írt pályák saját szöveget használhatnak.
 */
export function clueText(clue: Clue, p: Pick<Puzzle, 'rooms' | 'characters' | 'objects'>): string {
  // a mondat elején a névelős név („a Látogatóval”) is nagybetűs
  return rawClueText(clue, p).replace(/^(\*\*)?(\p{L})/u, (_m, a: string | undefined, b: string) => (a ?? '') + b.toUpperCase())
}

function rawClueText(clue: Clue, p: Pick<Puzzle, 'rooms' | 'characters' | 'objects'>): string {
  const room = (l: string) => roomIn(p.rooms[l] ?? l)
  const who = (id: string) => p.characters.find((c) => c.id === id)?.name ?? id
  switch (clue.kind) {
    case 'on': {
      const o = obj(clue.object)
      const base = `egy **${o.on}** ${o.sit ? 'ült' : 'volt'}.`
      return clue.room ? `${cap(room(clue.room))} ${base}` : cap(base)
    }
    case 'onlyOn': {
      const o = obj(clue.object)
      return `Ő volt az egyetlen, aki **${o.on}** ${o.sit ? 'ült' : 'volt'}.`
    }
    case 'in':
      return `${cap(room(clue.room))} volt.`
    case 'notIn':
      return `**Nem** ${room(clue.room)} volt.`
    case 'beside':
      return `Egy **${obj(clue.object).hu} mellett** volt.`
    case 'besideAny':
      return `Egy **${clue.objects.map((o) => obj(o).hu).join(' vagy ')} mellett** volt.`
    case 'besideChar':
      return `**${who(clue.char)} mellett** volt.`
    case 'sameRoom':
      return `**${ins(who(clue.with))}** egy helyiségben volt.`
    case 'leftOf':
      return `**${abl(who(clue.of))} balra** volt.`
    case 'diagonal':
      return `Átlósan szomszédos volt **${ins(who(clue.of))}**.`
    case 'dir':
      return `**${abl(who(clue.of))} ${{ N: 'északra', E: 'keletre', S: 'délre', W: 'nyugatra' }[clue.dir]}** volt.`
    case 'notBeside':
      return `**Nem** volt **${obj(clue.object).hu} mellett**.`
    case 'besideCat':
      return `Egy **${categoryNames(clue.cat, p.objects)} mellett** volt.`
    case 'notBesideCat':
      return `**Nem** volt **${categoryNames(clue.cat, p.objects)} mellett**.`
    case 'terrain': {
      const w = TERRAIN[clue.style]?.in ?? clue.style
      return clue.not ? `**Nem** volt **${w}**.` : `**${cap(w)}** volt.`
    }
    case 'line': {
      const nth = clue.n === 1 ? 'első' : `${clue.n}.`
      const art = clue.n === 1 || clue.n === 5 ? 'az' : 'a'
      const unit = clue.axis === 'row' ? 'sor' : 'oszlop'
      if (clue.op === 'ne') return `**Nem** ${art} **${nth} ${unit}ban** volt.`
      const rel = clue.axis === 'row' ? (clue.op === 'lt' ? 'sor fölött' : 'sor alatt') : clue.op === 'lt' ? 'oszloptól balra' : 'oszloptól jobbra'
      return `${cap(art)} **${nth} ${rel}** volt.`
    }
    case 'onlyGender': {
      const who = clue.gender === 'm' ? 'férfi' : 'nő'
      return clue.room ? `${cap(room(clue.room))} ő volt az **egyetlen ${who}**.` : `A helyiségében ő volt az **egyetlen ${who}**.`
    }
    case 'withGender':
      return `A helyiségében volt egy **${clue.gender === 'm' ? 'férfi' : 'nő'}**.`
    case 'notSameRoom':
      return `**Nem** volt egy helyiségben **${ins(who(clue.with))}**.`
    case 'edge':
      return clue.inner ? '**Nem** a pálya szélén volt.' : 'A pálya **szélén** volt.'
    case 'roomCount':
      return `A helyiségében **${together(clue.n)}** voltak.`
    case 'corner':
      return 'A pálya egyik **sarkában** volt.'
    case 'distance': {
      const o = OBJECTS[clue.fromObject]
      if (!o?.abl) return `A legközelebbi ${obj(clue.fromObject).hu} ${clue.cells} mezőre volt tőle.`
      // több ilyen tárgy a pályán: a legközelebbitől számít („a legközelebbi szellőzőrácstól")
      const cells = new Set(p.objects.filter((x) => x.type === clue.fromObject).flatMap((x) => (Array.isArray(x.at) ? x.at : [x.at])))
      const from = cells.size > 1 ? o.abl.replace(/^(az?) /, '$1 legközelebbi ') : o.abl
      return `${from} pontosan **${clue.cells} mezőre** volt.`
    }
    case 'col':
      return clue.n === 1 ? 'Az **első oszlopban** volt.' : `${clue.n === 5 ? 'Az' : 'A'} **${clue.n}. oszlopban** volt.`
    case 'row':
      return clue.n === 1 ? 'Az **első sorban** volt.' : `${clue.n === 5 ? 'Az' : 'A'} **${clue.n}. sorban** volt.`
    case 'northOf':
      return `Pontosan ${count(clue.rows)} sorral **${abl(who(clue.of))} északra** volt.`
    case 'southOf':
      return `Pontosan ${count(clue.rows)} sorral **${abl(who(clue.of))} délre** volt.`
    case 'aloneWith':
      return `**Egyedül** volt **${ins(who(clue.with))}**.`
    case 'aloneWithKiller':
      return clue.room ? `Az áldozat. ${cap(room(clue.room))} **egyedül** volt a gyilkossal.` : 'Az áldozat. **Egyedül** volt a gyilkossal.'
    case 'roomAlone':
      return '**Egyedül** volt.'
    case 'liar':
      return 'Az egyik nyom hazudik.'
    case 'lit':
      return 'Fényes mezőn állt.'
    case 'dark':
      return 'Sötét mezőn állt — a Sötétség megszállta.'
  }
}
