import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULES, WORLDS, ruleInfo } from '../game/worlds'
import { BONUS, THEMES } from './classic'
import {
  EN_BONUS,
  EN_CHARACTERS,
  EN_CLASSIC_STORY,
  EN_EVENT_CASES,
  EN_RULES,
  EN_THEMES,
  EN_WHEN,
  EN_WORLD_RULES,
  EN_WORLDS,
} from './en'
import { LOOKS } from './looks'

/** English content coverage + legal hygiene (see franchise.md): `npx vitest run src/content/en.test.ts`. */
interface EventFile {
  id: string
  world: string
  story: string
  characters: Array<{ id: string; name: string; victim?: boolean }>
}

const EVENT_DIR = join('puzzles', 'event')
const events: EventFile[] = readdirSync(EVENT_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(EVENT_DIR, f), 'utf8')) as EventFile)

const sorted = (xs: Iterable<string>): string[] => [...xs].sort()

/** Franchise words that must never appear in any English value (lower case, substring match). */
const FORBIDDEN = [
  'stranger',
  'hopper',
  'vecna',
  'hogwarts',
  'potter',
  'hermione',
  'dumbledore',
  'voldemort',
  'freddy',
  'fazbear',
  'poppy',
  'huggy',
  'silent hill',
  'pyramid head',
  'outlast',
  'alan wake',
  'until dawn',
  'dead space',
  'resident evil',
  'raccoon',
  'alien',
  'xenomorph',
  'last of us',
  'clicker',
  'walking dead',
  'grimes',
  'negan',
  'thrones',
  'winterfell',
  'targaryen',
  'lannister',
  'rick and morty',
  'meeseeks',
  'vampire diaries',
  'mystic falls',
  'salvatore',
  'twilight',
  'cullen',
  'adventure time',
  'murdoku',
]

/**
 * Extra originals that the Hungarian content replaced (franchise.md) — also forbidden in English.
 * (The character names were later changed, by the user's decision of 2026-10-27, to recognizable, slightly altered versions — e.g. "Rich Granger";
 * so only whole-word originals are forbidden here. "Maggie" and "Granger" are not listed: both are ordinary names and are used ("Maggie Thompson", "Rich Granger").)
 */
const FORBIDDEN_ORIGINALS = [
  'bonnie',
  'chica',
  'foxy',
  'golden freddy',
  'marionette',
  'kissy missy',
  'long legs',
  'bunzo',
  'catnap',
  'dogday',
  'pyramid',
  'cauldron lake',
  'blackwood',
  'mount massive',
  'ishimura',
  'sevastopol',
  'bright falls',
  'starcourt',
  'upside down',
  'eleven',
  'winter',
  'night king',
  'ice king',
  'bubblegum',
  'marceline',
  'lumpy',
  'ooo',
  'forks',
  'volturi',
  'hagrid',
  'griffin',
  'gryffin',
  'hufflepuff',
  'slytherin',
  'ravenclaw',
  'quidditch',
  'muggle',
  'squanch',
  'poopybutthole',
  'birdperson',
  'citadel',
  'lucille',
  'fireflies',
  'half-blood',
  'kennedy',
  'redfield',
  'ripley',
  'sunderland',
  'snape',
  'weasley',
  'malfoy',
  'longbottom',
  'lovegood',
  'mcgonagall',
  'sanchez',
  'gilbert',
  'stefan',
  'damon',
  'katherine pierce',
  'arya',
  'sansa',
  'cersei',
  'jaime',
  'tyrion',
  'daenerys',
  'jon snow',
  'michonne',
  'daryl',
  'glenn',
  'carol',
  'joel',
  'ellie',
  'tess',
  'hawkins',
]

/** The Hungarian-only accented letters (ő/ű are the telltale ones; the rest are checked too). */
const HU_ACCENTS = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

/** Everything player-visible in en.ts as one flat list of strings (template functions are evaluated against every theme). */
function allStrings(): string[] {
  const out: string[] = []
  for (const w of Object.values(EN_WORLDS)) out.push(w.title, w.game)
  for (const r of [...Object.values(EN_RULES), ...Object.values(EN_WORLD_RULES)]) out.push(r.name, r.text)
  out.push(...Object.values(EN_CHARACTERS))
  for (const c of [...Object.values(EN_EVENT_CASES), ...Object.values(EN_BONUS)]) out.push(c.title, c.story)
  for (const t of Object.values(EN_THEMES)) {
    out.push(t.title, t.place, t.who, t.whoObj)
    for (const s of EN_CLASSIC_STORY) out.push(s(t))
  }
  out.push(...EN_WHEN)
  return out
}

describe('English content: coverage', () => {
  it('EN_WORLDS has exactly the WORLDS keys, with non-empty title and game', () => {
    expect(sorted(Object.keys(EN_WORLDS))).toEqual(sorted(Object.keys(WORLDS)))
    for (const [k, w] of Object.entries(EN_WORLDS)) {
      expect(w.title.length, k).toBeGreaterThan(1)
      expect(w.game.length, k).toBeGreaterThan(1)
    }
  })

  it('EN_RULES has exactly the RULES keys', () => {
    expect(sorted(Object.keys(EN_RULES))).toEqual(sorted(Object.keys(RULES)))
    for (const [k, r] of Object.entries(EN_RULES)) {
      expect(r.name.length, k).toBeGreaterThan(1)
      expect(r.text.length, k).toBeGreaterThan(10)
    }
  })

  it('EN_WORLD_RULES has exactly the worlds that override a rule in worlds.ts', () => {
    // WORLD_RULES is private in worlds.ts: a world overrides the rule iff ruleInfo() does not return the shared RULES entry
    const overriding = Object.keys(WORLDS).filter((w) =>
      Object.keys(RULES).some((r) => ruleInfo(w, r) !== RULES[r]),
    )
    expect(overriding.length).toBeGreaterThan(0)
    expect(sorted(Object.keys(EN_WORLD_RULES))).toEqual(sorted(overriding))
    for (const [k, r] of Object.entries(EN_WORLD_RULES)) {
      expect(r.name.length, k).toBeGreaterThan(1)
      expect(r.text.length, k).toBeGreaterThan(10)
    }
  })

  it('EN_EVENT_CASES covers every puzzles/event id (95), no more, no less', () => {
    expect(events).toHaveLength(95)
    expect(sorted(Object.keys(EN_EVENT_CASES))).toEqual(sorted(events.map((e) => e.id)))
    for (const [k, c] of Object.entries(EN_EVENT_CASES)) {
      expect(c.title.length, `${k} title`).toBeGreaterThan(2)
      expect(c.story.length, `${k} story`).toBeGreaterThan(40)
    }
  })

  it('EN_CHARACTERS covers every event character id and every LOOKS key', () => {
    const ids = new Set(events.flatMap((e) => e.characters.map((c) => c.id)))
    expect(ids.size).toBe(179)
    for (const id of ids) expect(EN_CHARACTERS[id], `character ${id}`).toBeTruthy()
    for (const id of Object.keys(LOOKS)) expect(EN_CHARACTERS[id], `look ${id}`).toBeTruthy()
    for (const [id, name] of Object.entries(EN_CHARACTERS)) expect(name.trim().length, id).toBeGreaterThan(1)
  })

  it('EN_THEMES covers the 30 everyday themes plus the two bonus themes', () => {
    expect(THEMES).toHaveLength(30)
    expect(sorted(Object.keys(EN_THEMES))).toEqual(
      sorted([...THEMES.map((t) => t.slug), 'last-call', 'sunken-mill']),
    )
    for (const [k, t] of Object.entries(EN_THEMES)) {
      expect(t.title.startsWith('The ') || k === 'last-call', `${k} title`).toBe(true)
      expect(t.place, k).toMatch(/^(at|in|on) /)
      expect(t.who.length, k).toBeGreaterThan(3)
      expect(t.whoObj.length, k).toBeGreaterThan(3)
    }
  })

  it('EN_BONUS covers the bonus puzzle ids', () => {
    expect(BONUS.length).toBeGreaterThan(0)
    expect(sorted(Object.keys(EN_BONUS))).toEqual(sorted(BONUS.map((b) => b.file)))
  })

  it('EN_WHEN mirrors WHEN in classic.ts (same length, empty first entry)', () => {
    const src = readFileSync(join('src', 'content', 'classic.ts'), 'utf8')
    const decl = /const WHEN = \[([^\]]*)\]/.exec(src)
    expect(decl, 'WHEN declaration').toBeTruthy()
    const hu = [...decl![1]!.matchAll(/'([^']*)'/g)].map((m) => m[1]!)
    expect(EN_WHEN).toHaveLength(hu.length)
    expect(EN_WHEN[0]).toBe('')
    for (const w of EN_WHEN.slice(1)) expect(w.startsWith(' – ')).toBe(true)
  })

  it('EN_CLASSIC_STORY has four templates that use the theme', () => {
    expect(EN_CLASSIC_STORY).toHaveLength(4)
    const t = EN_THEMES['flower-store']!
    const stories = EN_CLASSIC_STORY.map((f) => f(t))
    expect(new Set(stories).size).toBe(4)
    for (const s of stories) {
      expect(s).toContain(t.place)
      expect(s).toContain(t.who)
      expect(s).not.toContain('undefined')
    }
  })
})

describe('English content: consistency with the Hungarian puzzles', () => {
  it('a story names every character the Hungarian story names (using the English name)', () => {
    for (const e of events) {
      const en = EN_EVENT_CASES[e.id]!.story.toLowerCase()
      for (const c of e.characters) {
        if (!e.story.includes(c.name)) continue
        expect(en, `${e.id}: ${c.name} -> ${EN_CHARACTERS[c.id]}`).toContain(
          EN_CHARACTERS[c.id]!.toLowerCase(),
        )
      }
    }
  })

  it('the victim of every case is named in its English story', () => {
    for (const e of events) {
      const v = e.characters.find((c) => c.victim)
      if (!v || !e.story.includes(v.name)) continue
      expect(EN_EVENT_CASES[e.id]!.story.toLowerCase(), e.id).toContain(EN_CHARACTERS[v.id]!.toLowerCase())
    }
  })
})

describe('English content: hygiene', () => {
  it('has no Hungarian accented letters in any value', () => {
    for (const s of allStrings()) expect(HU_ACCENTS.test(s), s).toBe(false)
  })

  it('has no franchise words (word list from the brief)', () => {
    for (const s of allStrings()) {
      const low = s.toLowerCase()
      for (const f of FORBIDDEN) expect(low.includes(f), `"${f}" in "${s}"`).toBe(false)
    }
  })

  it('does not reuse any original that franchise.md says was replaced', () => {
    for (const s of allStrings()) {
      const words = s.toLowerCase().replace(/[^a-z' -]/g, ' ')
      for (const f of FORBIDDEN_ORIGINALS) {
        const re = new RegExp(`(^|[^a-z])${f.replace(/[-]/g, '\\-')}([^a-z]|$)`)
        expect(re.test(words), `"${f}" in "${s}"`).toBe(false)
      }
    }
  })

  it('has no markdown, no double spaces and no stray whitespace', () => {
    for (const s of allStrings()) {
      expect(s, s).not.toMatch(/[*_`#]/)
      expect(s, s).not.toMatch(/ {2}/)
      if (s !== '' && !s.startsWith(' – ')) expect(s, s).toBe(s.trim())
    }
  })

  it('gives every character of a world a different English name and first name', () => {
    const byWorld = new Map<string, Set<string>>()
    for (const e of events) {
      const set = byWorld.get(e.world) ?? new Set<string>()
      for (const c of e.characters) set.add(c.id)
      byWorld.set(e.world, set)
    }
    expect(byWorld.size).toBe(19)
    const first = (n: string) =>
      n
        .replace(/^(the|dr\.|mr\.|father|princess)\s+/i, '')
        .split(/\s+/)[0]!
        .toLowerCase()
    for (const [world, ids] of byWorld) {
      const names = [...ids].map((id) => EN_CHARACTERS[id]!)
      expect(new Set(names.map((n) => n.toLowerCase())).size, `${world}: full names`).toBe(names.length)
      expect(new Set(names.map(first)).size, `${world}: first names ${names.join(', ')}`).toBe(names.length)
    }
  })

  it('uses a different English name for every Hollowmere character', () => {
    const hollow = [
      'vlad',
      'morrigan',
      'silas',
      'lilith',
      'ezekiel',
      'abel',
      'corvin',
      'selene',
      'damian',
      'isolde',
      'nyx',
      'rowan',
      'cassian',
      'elara',
    ]
    const names = hollow.map((id) => EN_CHARACTERS[id])
    expect(new Set(names).size).toBe(hollow.length)
  })
})
