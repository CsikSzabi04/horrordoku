import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { SCARES, variantsFor } from '../fx/mix'
import { setCurrentLang } from '../i18n/lang'
import type { Puzzle } from '../shared/puzzle'
import { nextHint } from './hints'
import { LEVELS, levelOf } from './levels'
import { markersOf } from './markers'

const puzzle = JSON.parse(readFileSync(`puzzles/classic/${readdirSync('puzzles/classic')[0]}`, 'utf8')) as Puzzle
const empty = { placed: {}, marks: [], notes: {} }

afterEach(() => setCurrentLang('hu'))

describe('nyelvfüggő rögzített szövegek (nem-React logika)', () => {
  it('a szintek neve és a szó szerinti nehézség az aktuális nyelven jön', () => {
    expect(levelOf(1).name).toBe('Gyakornok')
    expect(levelOf(1).plain).toBe('nagyon könnyű')
    setCurrentLang('en')
    expect(levelOf(1).name).toBe('Trainee')
    expect(levelOf(4).name).toBe('Chief detective')
    expect(LEVELS.map((l) => l.plain)).toEqual(['very easy', 'easy', 'medium', 'hard', 'expert'])
    // a nyelvfüggetlen mezők nem változnak
    expect(levelOf(2).hu).toBe('Járőr')
    expect(levelOf(2).en).toBe('Patrol')
    setCurrentLang('hu')
    expect(levelOf(2).name).toBe('Járőr')
  })

  it('a tippek mondatai angolul is értelmesek, és a nyelvváltást követik', () => {
    const hu = [1, 2, 3].map((st) => nextHint(puzzle, empty, st)!.text)
    expect(hu[0]).toMatch(/^Nézd meg alaposan /)
    expect(hu[1]).toMatch(/ van\.$/)
    expect(hu[2]).toMatch(/ helye: [A-J]\d+\.$/)
    setCurrentLang('en')
    const en = [1, 2, 3].map((st) => nextHint(puzzle, empty, st)!.text)
    expect(en[0]).toMatch(/^Take a close look at .+'s clue: “/)
    expect(en[1]).toMatch(/ is (in|at|on) the .+.$/)
    expect(en[2]).toMatch(/ belongs at [A-J]\d+\.$/)
    expect(en.join(' ')).not.toMatch(/Nézd|helye|helyiség/)
  })

  it('a jumpscare-változatok neve nyelvfüggő', () => {
    expect(SCARES.fnaf![1]!.caption).toBe('Szemek')
    setCurrentLang('en')
    expect(SCARES.fnaf![1]!.caption).toBe('Eyes')
    expect(variantsFor('hollowmere')[0]!.caption).toBe('Vlad')
  })

  it('a jelölő betű az angol „The" névelőt is átugorja', () => {
    const p = { characters: [{ id: 'a', name: 'The Butler' }, { id: 'b', name: 'Mrs. Hale' }] } as Pick<Puzzle, 'characters'>
    const m = markersOf(p)
    expect(m.get('a')).toBe('B')
    expect(m.get('b')).toBe('H')
  })
})
