import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Clue, Difficulty, Puzzle } from '../shared/puzzle'
import { generate } from './generator'
import { makeReference } from './reference'
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
    for (const ch of p.characters) {
      expect(ch.clueText).toHaveLength(ch.clues.length)
      ch.clues.forEach((cl, i) => {
        const text = ch.clueText[i]!.replaceAll('**', '')
        const hidden = text.includes('███') || text.includes('🔒')
        const x = refs(cl)
        if ('cat' in cl) {
          expect(CATEGORIES[cl.cat], `${ch.name}: ismeretlen kategória ${cl.cat}`).toBeTruthy()
          expect(CATEGORIES[cl.cat]!.types.some((t) => onBoard.has(t)), `${ch.name}: nincs ${cl.cat} a pályán`).toBe(true)
          expect(text.includes(CATEGORIES[cl.cat]!.hu), `${ch.name}: „${text}" nem említi: ${CATEGORIES[cl.cat]!.hu}`).toBe(true)
        }
        if (cl.kind === 'terrain') {
          expect(Object.values(p.floors ?? {}), `${ch.name}: nincs ${cl.style} padló a pályán`).toContain(cl.style)
          expect(text.toLowerCase().includes(TERRAIN[cl.style]!.in), `${ch.name}: „${text}" nem említi: ${TERRAIN[cl.style]!.in}`).toBe(true)
        }
        for (const t of x.objects) {
          expect(onBoard.has(t), `${ch.name}: „${text}" — a(z) ${t} nincs a pályán`).toBe(true)
          expect(OBJECTS[t]?.emoji, `${t}: nincs jelkép`).toBeTruthy()
          const o = OBJECTS[t]!
          if (!hidden) expect([o.hu, o.on, o.abl].some((s) => s && text.includes(s)), `${ch.name}: „${text}" nem említi: ${o.hu}`).toBe(true)
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
