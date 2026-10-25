import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { solve, verifySolution } from '../engine'
import { MURDOKU_KINDS } from '../engine/generator'
import index from './classic-index.json'
import eventIndex from './event-index.json'
import { puzzleFingerprint } from '../game/fingerprint'
import type { Puzzle } from '../shared/puzzle'

/** Katalógus-validálás: `npm run validate:puzzles`. Minden `puzzles/**\/*.json` fájl érvényes és pontosan 1 megoldású. */
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.json') ? [join(d, f)] : []))

const files = walk('puzzles')
const puzzles = files.map((f) => ({ f, p: JSON.parse(readFileSync(f, 'utf8')) as Puzzle }))
const CLASSIC_KINDS: string[] = [...MURDOKU_KINDS, 'aloneWithKiller']

describe('katalógus', () => {
  it('Klasszikus: 5 szint × 20 pálya + 2 bónusz; az index egyezik a fájlokkal', () => {
    const classic = puzzles.filter((x) => x.p.mode === 'classic')
    expect(classic).toHaveLength(100)
    for (const d of [1, 2, 3, 4, 5]) {
      const level = classic.filter((x) => x.p.difficulty === d)
      expect(level, `szint ${d}`).toHaveLength(20)
      for (const x of level) expect(x.p.id.startsWith(`classic-${d}-`)).toBe(true)
    }
    expect(puzzles.filter((x) => x.p.mode === 'bonus')).toHaveLength(2)
    const fromFiles = puzzles.filter((x) => x.p.mode === 'classic' || x.p.mode === 'bonus').map((x) => `${x.p.id}|${x.p.title}|${x.p.size}|${x.p.difficulty}`).sort()
    const fromIndex = (index as { id: string; title: string; size: number; difficulty: number }[]).map((r) => `${r.id}|${r.title}|${r.size}|${r.difficulty}`).sort()
    expect(fromIndex).toEqual(fromFiles)
    expect(new Set(classic.map((x) => x.p.title)).size).toBe(100)
  })
  it('Esemény: 19 világ × 5 ügy sorban (nő a nehézség), mindegyiknek saját áldozata, címe és története; az index egyezik', () => {
    const events = puzzles.filter((x) => x.p.mode === 'event').map((x) => x.p)
    expect(events).toHaveLength(95)
    const worlds = new Map<string, Puzzle[]>()
    for (const p of events) worlds.set(p.world, [...(worlds.get(p.world) ?? []), p])
    expect(worlds.size).toBe(19)
    for (const [w, ps] of worlds) {
      const cases = ps.sort((a, b) => a.id.localeCompare(b.id))
      expect(cases.map((p) => p.id.slice(-2)), w).toEqual(['-1', '-2', '-3', '-4', '-5'])
      const diffs = cases.map((p) => p.difficulty)
      expect(diffs, `${w}: a nehézség nem csökken`).toEqual([...diffs].sort((a, b) => a - b))
      expect(diffs[4]! > diffs[0]!, `${w}: az utolsó ügy nehezebb az elsőnél`).toBe(true)
      expect(new Set(cases.map((p) => p.title)).size, `${w}: egyedi címek`).toBe(5)
      expect(new Set(cases.map((p) => p.story)).size, `${w}: egyedi történetek`).toBe(5)
      expect(new Set(cases.map((p) => p.characters.find((c) => c.victim)!.id)).size, `${w}: más-más áldozat`).toBe(5)
      for (const p of cases) expect(p.story?.length ?? 0, p.id).toBeGreaterThan(30)
    }
    const fromIndex = (eventIndex as { id: string; fp: string }[]).map((r) => `${r.id}|${r.fp}`).sort()
    expect(fromIndex).toEqual(events.map((p) => `${p.id}|${puzzleFingerprint(p)}`).sort())
    const cls = (index as { id: string; fp: string }[]).map((r) => `${r.id}|${r.fp}`).sort()
    expect(cls).toEqual(puzzles.filter((x) => x.p.mode === 'classic' || x.p.mode === 'bonus').map((x) => `${x.p.id}|${puzzleFingerprint(x.p)}`).sort())
  })
  it('az azonosítók egyediek és egyeznek a fájlnévvel', () => {
    expect(new Set(puzzles.map((x) => x.p.id)).size).toBe(puzzles.length)
    for (const { f, p } of puzzles) expect(basename(f)).toBe(`${p.id}.json`)
  })
  for (const { p } of puzzles)
    describe(p.id, () => {
      it('szerkezet', () => {
        expect(p.v).toBe(1)
        expect(p.characters).toHaveLength(p.size)
        expect(p.layout).toHaveLength(p.size)
        for (const row of p.layout) {
          expect(row).toHaveLength(p.size)
          for (const ch of row) expect(p.rooms[ch]).toBeDefined()
        }
        expect(p.characters.filter((c) => c.victim)).toHaveLength(1)
        for (const c of p.characters) expect(c.clueText).toHaveLength(c.clues.length)
        expect(new Set(p.characters.map((c) => c.id)).size).toBe(p.size)
      })
      it('pontosan 1 megoldás, az a közölt; a gyilkos stimmel', () => {
        expect(verifySolution(p, p.solution)).toBe(true)
        expect(solve(p, 3).solutions).toEqual([p.solution])
        const roomAt = (cell: string) => p.layout[Number(cell.slice(1)) - 1]![cell.charCodeAt(0) - 65]!
        const victim = p.characters.find((c) => c.victim)!
        if (!victim.clues.some((cl) => cl.kind === 'aloneWithKiller')) throw new Error('az áldozat kártyája aloneWithKiller')
        const inRoom = p.characters.filter((c) => !c.victim && roomAt(p.solution[c.id]!) === roomAt(p.solution[victim.id]!))
        expect(inRoom.map((c) => c.id)).toEqual([p.murderer])
      })
      if (p.mode === 'event')
        it('Esemény: a világ-szabály adatai a pályán vannak', () => {
          const all = p.characters.flatMap((c) => c.clues)
          const types = new Set(p.objects.map((o) => o.type))
          const rule = p.worldRule
          expect(rule).toBeTruthy()
          if (rule === 'grab') expect(types.has('panel')).toBe(true)
          if (rule === 'doors') expect([...types].filter((t) => t.startsWith('door')).length).toBeGreaterThanOrEqual(2)
          if (rule === 'motion') expect(all.filter((c) => c.kind === 'distance').length).toBeGreaterThanOrEqual(2)
          if (rule === 'totems') expect(p.characters.filter((c) => c.hidden).length).toBeGreaterThanOrEqual(1)
          if (rule === 'vacuum') {
            expect(p.vacuumRooms?.length).toBeGreaterThan(0)
            expect(p.characters.some((c) => !c.armored)).toBe(true)
          }
          if (rule === 'radio') expect(p.characters.some((c) => c.clueText.some((t) => t.includes('███')))).toBe(true)
          if (rule === 'generators') expect(types.has('generator')).toBe(true)
          if (rule === 'light') {
            expect(types.has('lamp')).toBe(true)
            expect(all.some((c) => c.kind === 'dark' || c.kind === 'lit')).toBe(true)
          }
        })
      if (p.mode === 'classic' || p.mode === 'bonus')
        it('Klasszikus: csak Murdoku-nyomok, nincs Erő-szabály', () => {
          expect(p.activePowers).toEqual([])
          expect(p.worldRule).toBeUndefined()
          for (const c of p.characters) for (const cl of c.clues) expect(CLASSIC_KINDS).toContain(cl.kind)
          // hétköznapi nevek: egyedi kezdőbetű, nem és az áldozat „V"
          expect(new Set(p.characters.map((c) => c.name[0])).size).toBe(p.size)
          expect(p.characters.every((c) => c.gender === 'm' || c.gender === 'f')).toBe(true)
          expect(p.characters.find((c) => c.victim)!.name.startsWith('V')).toBe(true)
        })
    })
})
