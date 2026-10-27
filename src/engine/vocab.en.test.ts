import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BONUS, THEMES } from '../content/classic'
import { CATEGORIES, OBJECTS, ROOM_IN, ROOM_POOL, TERRAIN } from './vocab'
import { CATEGORIES_EN, OBJECTS_EN, ROOMS_EN, TERRAIN_EN } from './vocab.en'

/** Hungarian-only accented letters: none of them may leak into the English texts. */
const HU_ONLY = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

/** Every `rooms` value of the shipped catalogue (classic, bonus, event), per puzzle. */
const puzzleRooms: { file: string; rooms: string[] }[] = ['classic', 'bonus', 'event'].flatMap((dir) =>
  readdirSync(join('puzzles', dir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const p = JSON.parse(readFileSync(join('puzzles', dir, f), 'utf8')) as { rooms: Record<string, string> }
      return { file: `${dir}/${f}`, rooms: Object.values(p.rooms) }
    }),
)

const allRooms = new Set<string>([
  ...puzzleRooms.flatMap((p) => p.rooms),
  ...Object.keys(ROOM_IN),
  ...ROOM_POOL.map((r) => r.name),
  ...THEMES.flatMap((t) => t.rooms),
  ...BONUS.flatMap((b) => b.opts.rooms ?? []),
])

const sameKeys = (a: object, b: object): { missing: string[]; extra: string[] } => ({
  missing: Object.keys(a).filter((k) => !(k in b)),
  extra: Object.keys(b).filter((k) => !(k in a)),
})

describe('English vocabulary (vocab.en)', () => {
  it('every object type has an English name, and there are no stray keys', () => {
    expect(sameKeys(OBJECTS, OBJECTS_EN)).toEqual({ missing: [], extra: [] })
  })

  it('object names are unique, so two objects can never be confused by name', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const [type, name] of Object.entries(OBJECTS_EN)) {
      const other = owner.get(name.toLowerCase())
      if (other) clashes.push(`${other} / ${type}: "${name}"`)
      owner.set(name.toLowerCase(), type)
    }
    expect(clashes, `duplicate English object names: ${clashes.join('; ')}`).toEqual([])
  })

  it('every room name in the catalogue (puzzles, ROOM_IN, ROOM_POOL, themes) has an English entry', () => {
    const missing = [...allRooms].filter((r) => !ROOMS_EN[r])
    expect(missing, `rooms without an English entry: ${missing.join(', ')}`).toEqual([])
    expect(allRooms.size).toBeGreaterThan(200)
  })

  it('ROOMS_EN has no stray keys (every key is a real Hungarian room name)', () => {
    const extra = Object.keys(ROOMS_EN).filter((r) => !allRooms.has(r))
    expect(extra, `unknown room keys: ${extra.join(', ')}`).toEqual([])
  })

  it('every room has a Title Case name and a prepositional phrase that ends with that name', () => {
    const bad: string[] = []
    for (const [hu, r] of Object.entries(ROOMS_EN)) {
      if (!/^[A-Z]/.test(r.name)) bad.push(`${hu}: name "${r.name}" does not start with a capital`)
      if (!/^(in|at|on|beyond)\b/.test(r.in)) bad.push(`${hu}: "${r.in}" has no preposition`)
      if (hu !== 'A Gáton túl' && !r.in.endsWith(r.name)) bad.push(`${hu}: "${r.in}" does not end with "${r.name}"`)
    }
    expect(bad, bad.join('; ')).toEqual([])
  })

  it('two rooms of the same puzzle never share an English name', () => {
    const bad: string[] = []
    for (const p of puzzleRooms) {
      const names = p.rooms.map((r) => ROOMS_EN[r]?.name)
      const dup = names.filter((n, i) => names.indexOf(n) !== i)
      if (dup.length) bad.push(`${p.file}: ${dup.join(', ')}`)
    }
    expect(bad, bad.join('; ')).toEqual([])
  })

  it('TERRAIN_EN and CATEGORIES_EN have exactly the keys of TERRAIN and CATEGORIES', () => {
    expect(sameKeys(TERRAIN, TERRAIN_EN)).toEqual({ missing: [], extra: [] })
    expect(sameKeys(CATEGORIES, CATEGORIES_EN)).toEqual({ missing: [], extra: [] })
  })

  it('terrain legend names are unique and never collide with an object name', () => {
    const terrain = Object.values(TERRAIN_EN).map((t) => t.name.toLowerCase())
    expect(new Set(terrain).size).toBe(terrain.length)
    const objects = new Set(Object.values(OBJECTS_EN).map((n) => n.toLowerCase()))
    expect(terrain.filter((n) => objects.has(n))).toEqual([])
  })

  it('no value contains Hungarian-only accented letters (áéíóöőúüű)', () => {
    const bad: string[] = []
    const check = (where: string, s: string) => {
      if (HU_ONLY.test(s)) bad.push(`${where}: "${s}"`)
    }
    for (const [k, v] of Object.entries(OBJECTS_EN)) check(`OBJECTS_EN.${k}`, v)
    for (const [k, v] of Object.entries(ROOMS_EN)) {
      check(`ROOMS_EN[${k}].name`, v.name)
      check(`ROOMS_EN[${k}].in`, v.in)
    }
    for (const [k, v] of Object.entries(TERRAIN_EN)) {
      check(`TERRAIN_EN.${k}.in`, v.in)
      check(`TERRAIN_EN.${k}.name`, v.name)
    }
    for (const [k, v] of Object.entries(CATEGORIES_EN)) check(`CATEGORIES_EN.${k}`, v)
    expect(bad, `Hungarian-only letters found in: ${bad.join('; ')}`).toEqual([])
  })

  it('no value is empty or has stray whitespace', () => {
    const values = [
      ...Object.values(OBJECTS_EN),
      ...Object.values(ROOMS_EN).flatMap((r) => [r.name, r.in]),
      ...Object.values(TERRAIN_EN).flatMap((t) => [t.name, t.in]),
      ...Object.values(CATEGORIES_EN),
    ]
    expect(values.filter((v) => !v || v !== v.trim() || /\s{2,}/.test(v))).toEqual([])
  })
})
