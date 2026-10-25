import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generate, solve } from '../engine'
import type { Puzzle } from '../shared/puzzle'
import { puzzleFingerprint } from '../game/fingerprint'
import { CLASSICS, THEME_ICONS } from './classic'
import { EVENTS } from './events'

/**
 * Szerzői eszköz (nem teszt): a Klasszikus (5×20) / bónusz / Esemény pályák egyszeri legyártása a generátorral, rögzített seedekkel.
 * Futtatás: `AUTHOR=1 npx vitest run src/content/author.test.ts` → `puzzles/{classic,bonus,event}/*.json` + `src/content/classic-index.json`.
 * Ha egy seedből nem jön létre egyértelmű pálya, a következő változatot (`a`, `b`, …) próbáljuk — determinisztikusan.
 * A kész JSON-t a `validate:puzzles` ellenőrzi.
 */
describe.skipIf(!process.env.AUTHOR)('szerzői eszköz', () => {
  for (const def of CLASSICS)
    it(def.file, () => {
      let p: Puzzle | null = null
      for (const suffix of ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g']) {
        try {
          p = generate(def.seed + suffix, def.d, def.opts)
          break
        } catch {
          /* következő seed-változat */
        }
      }
      if (!p) throw new Error(`nincs érvényes pálya: ${def.file}`)
      p.difficulty = def.d
      expect(solve(p, 3).solutions).toEqual([p.solution])
      writeFileSync(`puzzles/${def.dir}/${def.file}.json`, `${JSON.stringify(p, null, 2)}\n`)
    }, 240_000)

  it('index (a lista ebből épül, a pályák betöltése lusta)', () => {
    const rows = ['classic', 'bonus'].flatMap((dir) =>
      readdirSync(`puzzles/${dir}`)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => {
          const p = JSON.parse(readFileSync(`puzzles/${dir}/${f}`, 'utf8')) as Puzzle
          const slug = p.id.replace(/^[a-z]+-(\d+-)?\d+-/, '')
          return { id: p.id, mode: p.mode, title: p.title, size: p.size, difficulty: p.difficulty, icon: THEME_ICONS[slug] ?? '🔎', fp: puzzleFingerprint(p) }
        }),
    )
    writeFileSync('src/content/classic-index.json', `${JSON.stringify(rows)}\n`)
    expect(rows.filter((r) => r.mode === 'classic')).toHaveLength(100)
  })

  for (const def of EVENTS)
    it(def.file, () => {
      let p: Puzzle | null = null
      // a seed-változatok közül a legösszetettebb nyomkészletűt választjuk (sok égtáj / átlós / kapcsolat / tagadás, kevés sima „tárgyon / mellett”)
      const PLAIN = new Set(['on', 'onlyOn', 'in', 'beside', 'besideAny', 'line'])
      const score = (q: Puzzle) => {
        const kinds = q.characters.filter((c) => !c.victim).map((c) => c.clues[0]!.kind)
        return kinds.filter((k) => !PLAIN.has(k)).length * 10 + new Set(kinds).size
      }
      let best = -1
      let accepted = 0
      for (const suffix of ['', ...'abcdefghijklmnopqrstuvwxyz']) {
        if (accepted >= 4) break // elég jelölt: a legösszetettebb nyomkészletűt választjuk
        try {
          const q = generate(def.seed + suffix, def.d, def.opts)
          // a világ-szabálynak látszania kell a pályán (pl. a rádiónál legalább egy kitakart nyom)
          if (def.opts.redact && !q.characters.some((c) => c.clueText.some((t) => t.includes('███')))) continue
          const all = q.characters.flatMap((c) => c.clues)
          if (q.worldRule === 'light' && !all.some((c) => c.kind === 'dark' || c.kind === 'lit')) continue
          if (q.worldRule === 'motion' && all.filter((c) => c.kind === 'distance').length < 2) continue
          accepted++
          if (score(q) > best) {
            best = score(q)
            p = q
          }
        } catch {
          /* következő seed-változat */
        }
      }
      if (!p) throw new Error(`nincs érvényes pálya: ${def.file}`)
      for (const c of p.characters) c.source = { game: def.game }
      expect(solve(p, 3).solutions).toEqual([p.solution])
      writeFileSync(`puzzles/event/${def.file}.json`, `${JSON.stringify(p, null, 2)}\n`)
    }, 120_000)

  it('Esemény-index (világonként 5 ügy; a lista és a Gyűjtemény ebből épül)', () => {
    const ps = readdirSync('puzzles/event')
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => JSON.parse(readFileSync(`puzzles/event/${f}`, 'utf8')) as Puzzle)
    const rows = ps.map((p) => ({ id: p.id, mode: p.mode, title: p.title, size: p.size, difficulty: p.difficulty, world: p.world, worldRule: p.worldRule ?? null, no: Number(p.id.slice(p.id.lastIndexOf('-') + 1)), fp: puzzleFingerprint(p) }))
    writeFileSync('src/content/event-index.json', `${JSON.stringify(rows)}
`)
    const seen = new Set<string>()
    const chars = ps.flatMap((p) =>
      p.characters.flatMap((c) => {
        if (seen.has(c.id)) return []
        seen.add(c.id)
        return [{ id: c.id, name: c.name, race: c.race, world: p.world, ...(c.source ? { source: c.source } : {}) }]
      }),
    )
    writeFileSync('src/content/event-characters.json', `${JSON.stringify(chars)}
`)
    expect(rows).toHaveLength(EVENTS.length)
  })
})
