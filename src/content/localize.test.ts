import { readdirSync, readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setCurrentLang } from '../i18n/lang'
import type { Puzzle } from '../shared/puzzle'
import { charName, clueLines, objName, puzzleStory, puzzleTitle, roomName } from './localize'

/** Magyar ékezetes betű (ö, ő, ü, ű, á, é, í, ó, ú) — angol szövegben nem állhat. */
const HU_LETTER = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

const load = (dir: string): Puzzle[] =>
  readdirSync(`puzzles/${dir}`)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(`puzzles/${dir}/${f}`, 'utf8')) as Puzzle)
const all = [...load('classic'), ...load('bonus'), ...load('event')]

describe('angol megjelenítés: minden pálya minden szövege lefordítva', () => {
  beforeAll(() => setCurrentLang('en'))
  afterAll(() => setCurrentLang('hu'))

  it('cím és történet', () => {
    const bad: string[] = []
    for (const p of all) {
      const title = puzzleTitle(p)
      const story = puzzleStory(p) ?? ''
      if (HU_LETTER.test(title)) bad.push(`${p.id} cím: ${title}`)
      if (HU_LETTER.test(story)) bad.push(`${p.id} történet: ${story}`)
      if (!title.trim()) bad.push(`${p.id}: üres cím`)
    }
    expect(bad.slice(0, 20)).toEqual([])
  })

  it('szereplők, helyiségek, tárgyak neve', () => {
    const bad = new Set<string>()
    for (const p of all) {
      for (const c of p.characters) if (HU_LETTER.test(charName(c.id, c.name))) bad.add(`szereplő ${c.id}: ${charName(c.id, c.name)}`)
      for (const r of Object.values(p.rooms)) if (HU_LETTER.test(roomName(r))) bad.add(`helyiség ${r}: ${roomName(r)}`)
      for (const o of p.objects) if (HU_LETTER.test(objName(o.type))) bad.add(`tárgy ${o.type}: ${objName(o.type)}`)
    }
    expect([...bad].slice(0, 30)).toEqual([])
  })

  it('minden nyomkártya-szöveg angol (és nem üres), a kitakart nyom is', () => {
    const bad: string[] = []
    for (const p of all)
      for (const c of p.characters)
        clueLines(p, c).forEach((t, i) => {
          if (!t.trim() || HU_LETTER.test(t)) bad.push(`${p.id}/${c.id}#${i}: ${t}`)
          if (c.clueText[i]?.includes('███') && !t.includes('███')) bad.push(`${p.id}/${c.id}#${i}: nincs kitakarva: ${t}`)
        })
    expect(bad.slice(0, 20)).toEqual([])
  })

  it('magyarul a pálya szövege változatlan', () => {
    setCurrentLang('hu')
    const p = all.find((x) => x.mode === 'classic')!
    expect(puzzleTitle(p)).toBe(p.title)
    expect(clueLines(p, p.characters[0]!)).toEqual(p.characters[0]!.clueText)
    setCurrentLang('en')
  })
})
