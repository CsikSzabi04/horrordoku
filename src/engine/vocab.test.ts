import { describe, expect, it } from 'vitest'
import { WORLDS } from '../game/worlds'
import { THEME_ICONS } from '../content/classic'
import { FAITHFUL, hasDrawnIcon } from '../components/ObjectIcon'
import { OBJECTS, ROOM_IN } from './vocab'

describe('szótár', () => {
  it('minden tárgynak egyedi jele van (különben két tárgy összetéveszthető: pad ≠ szék)', () => {
    const seen = new Map<string, string>()
    for (const [type, o] of Object.entries(OBJECTS)) {
      expect(seen.get(o.emoji), `${type} és ${seen.get(o.emoji)} ugyanazt a jelet használja: ${o.emoji}`).toBeUndefined()
      seen.set(o.emoji, type)
    }
  })
  it('minden tárgynak egyedi neve van', () => {
    const names = Object.values(OBJECTS).map((o) => o.hu)
    expect(new Set(names).size).toBe(names.length)
  })
  it('minden tárgynak van ragozott alakja, a helyiségeknek -ban/-ben alakja', () => {
    for (const [type, o] of Object.entries(OBJECTS)) {
      expect(o.on, type).toBeTruthy()
      expect(o.art.startsWith('a ') || o.art.startsWith('az '), type).toBe(true)
    }
    for (const [name, form] of Object.entries(ROOM_IN)) expect(form.length, name).toBeGreaterThan(name.length - 3)
  })
  it('a jelek mind régi (Unicode ≤ 12) emojik: az újabbak sok gépen (Windows 10) üres négyzetként jelennek meg', () => {
    const tooNew = (e: string) => [...e].some((ch) => { const c = ch.codePointAt(0)!; return c >= 0x1fa96 || (c >= 0x1f6dd && c <= 0x1f6df) || c === 0x1fa86 })
    const all = [...Object.entries(OBJECTS).map(([k, o]) => [k, o.emoji] as const), ...Object.entries(WORLDS).map(([k, w]) => [k, w.emoji] as const), ...Object.entries(THEME_ICONS).map(([k, e]) => [k, e] as const)]
    for (const [k, e] of all) expect(tooNew(e), `${k}: ${e} túl új emoji`).toBe(false)
  })
  it('minden tárgy jele azt ábrázolja, aminek a neve: rajzolt, vagy kifejezetten jóváhagyott emoji', () => {
    for (const type of Object.keys(OBJECTS)) expect(hasDrawnIcon(type) || FAITHFUL.has(type), `${type} (${OBJECTS[type]!.hu}): nincs rajzolt jele és nincs jóváhagyva`).toBe(true)
  })
})
