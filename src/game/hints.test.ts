import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Puzzle } from '../shared/puzzle'
import { nextHint } from './hints'

const all = ['classic', 'bonus', 'event'].flatMap((d) => readdirSync(`puzzles/${d}`).map((f) => JSON.parse(readFileSync(`puzzles/${d}/${f}`, 'utf8')) as Puzzle))

describe('tippek', () => {
  it('a helyiség-tipp értelmes magyar mondat (nincs „a(z)”), és a helyes helyiséget nevezi meg', () => {
    for (const p of all) {
      const empty = { placed: {}, marks: [], notes: {} }
      const h = nextHint(p, empty, 2)!
      expect(h.text, p.id).not.toContain('a(z)')
      expect(h.text, p.id).not.toContain('helyiségben')
      expect(h.text, p.id).toMatch(/ van\.$/)
      expect(h.room, p.id).toBeTruthy()
      expect(nextHint(p, empty, 3)!.ops!.some((o) => o.op === 'place'), p.id).toBe(true)
    }
  })
})
