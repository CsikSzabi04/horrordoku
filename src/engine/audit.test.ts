import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Clue, Difficulty, Puzzle } from '../shared/puzzle'
import { generate } from './generator'
import { buildGrid } from './grid'
import { makeReference } from './reference'
import { unaryOk } from './rules'
import { CATEGORIES, OBJECTS, roomIn, TERRAIN } from './vocab'

/**
 * „Játszható-e?" — minden pálya (Klasszikus, bónusz, Esemény, és generált Random-minták) ellenőrzése egy FÜGGETLEN
 * referencia-értelmezővel (`reference.ts`), úgy, ahogy a játékos látja a pályát:
 *  1. a tárolt megoldás kielégít minden nyomot és szabályt;
 *  2. pontosan 1 megoldás van (a referencia szerint is);
 *  3. minden tárgy / helyiség / szereplő, amire nyom utal, tényleg ott van a pályán, és a nyomszöveg ki is mondja;
 *  4. a kitakart (███) nyomú pályák a LÁTHATÓ információból is egyértelműek.
 */
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.json') ? [join(d, f)] : []))
const catalog: Puzzle[] = walk('puzzles').map((f) => JSON.parse(readFileSync(f, 'utf8')) as Puzzle)

const randoms: Puzzle[] = []
for (const d of [1, 2, 3, 4, 5] as Difficulty[]) for (let i = 0; i < Number(process.env.AUDIT_N ?? 12); i++) randoms.push(generate(`AUD${d}x${i}`, d))

function refs(cl: Clue): { objects: string[]; rooms: string[]; chars: string[] } {
  const objects: string[] = []
  const rooms: string[] = []
  const chars: string[] = []
  if ('object' in cl) objects.push(cl.object)
  if ('objects' in cl) objects.push(...cl.objects)
  if ('fromObject' in cl) objects.push(cl.fromObject)
  if ('room' in cl && cl.room) rooms.push(cl.room)
  for (const k of ['char', 'with', 'of'] as const) if (k in cl) chars.push((cl as unknown as Record<string, string>)[k]!)
  return { objects, rooms, chars }
}

const UNARY_KINDS = new Set<string>(['on', 'onlyOn', 'in', 'notIn', 'beside', 'besideAny', 'notBeside', 'besideCat', 'notBesideCat', 'terrain', 'line', 'edge', 'corner', 'distance', 'col', 'row', 'lit', 'dark'])
const SAME_ROOM_AS_VICTIM = new Set<string>(['sameRoom', 'aloneWith', 'besideChar', 'diagonal', 'notSameRoom'])

/**
 * Elárulja-e egy gyanúsított nyoma a gyilkost (vagy zár ki valakit)? Az áldozat kártyája „egyedül volt a gyilkossal", ezért:
 *  - az áldozattal egy helyiségben lévő (egyedül / mellette / átlósan vele) vagy NEM ott lévő szereplő nyoma egyből a gyilkost adja ki / zárja ki;
 *  - ha a kártya a helyiséget is kimondja: az a nyom, ami a szereplőt KIZÁRÓLAG ebbe a helyiségbe teszi („A Lépcsőházban volt", vagy egy csak ott álló tárgy mellett),
 *    illetve a „nem ott volt" nyom ugyanezt teszi.
 * Visszatérés: az ok szövege, vagy `null`, ha rendben van.
 */
function killerLeak(p: Puzzle, g: ReturnType<typeof buildGrid>, cl: Clue): string | null {
  const victim = p.characters.find((c) => c.victim)
  const target = (cl as { with?: string; of?: string; char?: string }).with ?? (cl as { of?: string }).of ?? (cl as { char?: string }).char
  if (victim && target === victim.id && SAME_ROOM_AS_VICTIM.has(cl.kind)) return 'az áldozattal egy helyiségben (nem) lévő szereplő nyoma'
  const stated = victim?.clues.find((c) => c.kind === 'aloneWithKiller')
  const room = stated && stated.kind === 'aloneWithKiller' ? stated.room : undefined
  if (!room) return null // Murdoku-stílus: az áldozat szobája nincs kimondva
  if (cl.kind === 'notIn' && cl.room === room) return 'az áldozat szobájában „nem" volt'
  if (cl.kind === 'onlyGender') {
    if (cl.room) return cl.room === room ? 'az áldozat szobáját nevezi meg' : null
    return victim?.gender === cl.gender ? 'az áldozattal azonos nemű „egyetlen"-nyom: kizárja az áldozat szobáját' : null
  }
  if (!UNARY_KINDS.has(cl.kind)) return null
  let any = false
  for (let r = 0; r < g.n; r++)
    for (let c = 0; c < g.n; c++) {
      if (g.blocked[r]![c]! || !unaryOk(g, cl, r, c)) continue
      any = true
      if (g.room[r]![c] !== room) return null
    }
  return any ? 'a nyom csak az áldozat szobájában lehet igaz' : null
}

function audit(p: Puzzle) {
  it(`${p.id}: a megoldás kielégíti a referencia-szabályokat, és egyértelmű`, () => {
    const ref = makeReference(p)
    expect(ref.violations(p.solution)).toEqual([])
    const r = ref.count(2, 60_000_000)
    expect(r.exhausted, 'a keresési keret elfogyott').toBe(false)
    expect(r.count).toBe(1)
  }, 120_000)

  it(`${p.id}: a nyomok csak létező tárgyra / helyiségre / szereplőre utalnak, és a szöveg kimondja`, () => {
    const onBoard = new Set(p.objects.map((o) => o.type))
    const grid = buildGrid(p)
    for (const ch of p.characters) {
      expect(ch.clueText).toHaveLength(ch.clues.length)
      ch.clues.forEach((cl, i) => {
        const text = ch.clueText[i]!.replaceAll('**', '')
        const hidden = text.includes('███') || text.includes('🔒')
        const x = refs(cl)
        if (!ch.victim) expect(killerLeak(p, grid, cl), `${ch.name}: „${text}" — a nyom elárulja a gyilkost (vagy kizár valakit)`).toBeNull()
        if ('cat' in cl) {
          expect(CATEGORIES[cl.cat], `${ch.name}: ismeretlen kategória ${cl.cat}`).toBeTruthy()
          expect(CATEGORIES[cl.cat]!.types.some((t) => onBoard.has(t)), `${ch.name}: nincs ${cl.cat} a pályán`).toBe(true)
          // a kártya a PÁLYÁN lévő tagok nevét mondja ki (mint a térkép felirata), nem a kategória általános szavát
          for (const t of CATEGORIES[cl.cat]!.types.filter((t) => onBoard.has(t)))
            expect(text.includes(OBJECTS[t]!.hu), `${ch.name}: „${text}" nem említi a pályán lévő tárgyat: ${OBJECTS[t]!.hu}`).toBe(true)        }
        if (cl.kind === 'terrain') {
          expect(Object.values(p.floors ?? {}), `${ch.name}: nincs ${cl.style} padló a pályán`).toContain(cl.style)
          expect(text.toLowerCase().includes(TERRAIN[cl.style]!.in), `${ch.name}: „${text}" nem említi: ${TERRAIN[cl.style]!.in}`).toBe(true)
        }
        for (const t of x.objects) {
          expect(onBoard.has(t), `${ch.name}: „${text}" — a(z) ${t} nincs a pályán`).toBe(true)
          expect(OBJECTS[t]?.emoji, `${t}: nincs jelkép`).toBeTruthy()
          const o = OBJECTS[t]!
          // a ragozott alak is jó (kapszula → kapszulától), névelő nélkül és kis/nagybetűre érzéketlenül („A legközelebbi kapszulától…")
          const named = [o.hu, o.on, o.abl?.replace(/^az? /, '')].some((s) => s && text.toLowerCase().includes(s.toLowerCase()))
          if (!hidden) expect(named, `${ch.name}: „${text}" nem említi: ${o.hu}`).toBe(true)
        }
        for (const r of x.rooms) {
          expect(p.rooms[r], `${ch.name}: ismeretlen helyiség ${r}`).toBeTruthy()
          expect(text.toLowerCase().includes(roomIn(p.rooms[r]!).toLowerCase()), `${ch.name}: „${text}" nem említi: ${p.rooms[r]}`).toBe(true)
        }
        for (const id of x.chars) {
          const who = p.characters.find((c) => c.id === id)
          expect(who, `${ch.name}: ismeretlen szereplő ${id}`).toBeTruthy()
          expect(text.toLowerCase().includes(/^Az?\s/.test(who!.name) ? who!.name.split(' ').pop()!.slice(0, 3).toLowerCase() : who!.name.replace(/^(a|az)\s+/i, '').slice(0, 2).toLowerCase()), `${ch.name}: „${text}" nem említi: ${who!.name}`).toBe(true)
        }
      })
    }
  })

  if (p.characters.some((c) => c.clueText.some((t) => t.includes('███'))))
    it(`${p.id}: kitakart nyomnál a látható információból is egyértelmű`, () => {
      const override = new Map(
        p.characters.map((c) => [
          c.id,
          c.clues.map((cl, i) => (c.clueText[i]!.includes('███') && cl.kind === 'on' && cl.room ? ({ kind: 'in', room: cl.room } as Clue) : cl)),
        ]),
      )
      const r = makeReference(p).count(2, 60_000_000, override)
      expect(r.exhausted).toBe(false)
      expect(r.count).toBe(1)
    }, 120_000)
}

describe('audit: katalógus', () => {
  it('a katalógus nem üres', () => expect(catalog.length).toBeGreaterThan(100))
  for (const p of catalog) describe(p.id, () => audit(p))
})
describe('audit: generált (Random) minták', () => {
  for (const p of randoms) describe(p.id, () => audit(p))
})
