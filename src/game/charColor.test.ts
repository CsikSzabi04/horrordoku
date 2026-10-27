import { describe, expect, it } from 'vitest'
import { LOOKS } from '../content/looks'
import { charColor, lift } from './charColor'

const hue = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx === mn) return -1
  const d = mx - mn
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60
  return h
}
const lum = (hex: string) => (Math.max(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))) + Math.min(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)))) / 510

describe('karakter-színek (a térképi kezdőbetű saját színe)', () => {
  it('az arany medve arany, a csirke sárga', () => {
    const gold = hue(charColor('arany-brumi', false))
    const yellow = hue(charColor('csibi', false))
    expect(gold).toBeGreaterThan(38) // narancsos arany
    expect(gold).toBeLessThan(50)
    expect(yellow).toBeGreaterThan(44)
    expect(yellow).toBeLessThan(58) // tisztább sárga
    expect(charColor('arany-brumi', false)).not.toBe(charColor('csibi', false))
  })
  it('minden Esemény-szereplő kap érvényes, olvasható színt (nem túl sötét, nem kifehéredő)', () => {
    for (const id of Object.keys(LOOKS)) {
      const c = charColor(id, false)
      expect(c, id).toMatch(/^#[0-9a-f]{6}$/)
      expect(lum(c), id).toBeGreaterThanOrEqual(0.5)
      expect(lum(c), id).toBeLessThanOrEqual(0.82)
    }
  })
  it('a Klasszikus szereplő az arckép pólójának színét kapja, stabilan', () => {
    expect(charColor('amir', true)).toBe(charColor('amir', true))
    expect(charColor('amir', true)).toMatch(/^#[0-9a-f]{6}$/)
  })
  it('a lift a sötét színeket világosítja, a világosakat visszafogja', () => {
    expect(lum(lift('#111111'))).toBeGreaterThanOrEqual(0.5)
    expect(lum(lift('#ffffff'))).toBeLessThanOrEqual(0.82)
  })
  it('ismeretlen azonosító: alap arany', () => {
    expect(charColor('nincs-ilyen', false)).toBe('#c9a228')
  })
})
