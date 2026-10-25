import { describe, expect, it } from 'vitest'
import { level, scareAllowed, scarePlan, variantsFor } from './mix'
import type { ScareInput } from './mix'

const base: ScareInput = { mode: 'on', photosensitive: false, screenShake: true, streamerMode: false, variants: 5 }
const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length]!
}

describe('hangerő', () => {
  it('a plafont sosem lépi át', () => {
    for (const req of [0, 0.3, 0.8, 1, 5, -1, NaN])
      for (const cap of [0, 0.2, 0.5, 1, 3]) expect(level(req, cap)).toBeLessThanOrEqual(Math.min(1, Math.max(0, cap)) + 1e-12)
    expect(level(1, 0.3)).toBe(0.3)
    expect(level(0.2, 0.9)).toBe(0.2)
    expect(level(NaN, 1)).toBe(0)
  })
})

describe('jumpscare-terv', () => {
  it('kikapcsolva nincs terv', () => expect(scarePlan({ ...base, mode: 'off' }, Math.random)).toBeNull())
  it('késleltetés mindig 0,5–6 mp; a változat a tartományban', () => {
    for (let i = 0; i < 500; i++) {
      const p = scarePlan(base, Math.random)!
      expect(p.delayMs).toBeGreaterThanOrEqual(500)
      expect(p.delayMs).toBeLessThanOrEqual(6000)
      expect(p.variant).toBeGreaterThanOrEqual(0)
      expect(p.variant).toBeLessThan(5)
    }
  })
  it('módok: csak hang / csak kép / lágy; a nyugodt mód nem villog és nem rázkódik', () => {
    const r = seq(0.5)
    expect(scarePlan({ ...base, mode: 'soundOnly' }, r)).toMatchObject({ image: false, sound: true, flash: false })
    expect(scarePlan({ ...base, mode: 'imageOnly' }, r)).toMatchObject({ image: true, sound: false })
    expect(scarePlan({ ...base, mode: 'soft' }, r)).toMatchObject({ flash: false, shake: false, loudness: 0.35 })
    expect(scarePlan({ ...base, photosensitive: true }, r)).toMatchObject({ flash: false, shake: false })
    expect(scarePlan({ ...base, screenShake: false }, r)).toMatchObject({ shake: false })
    expect(scarePlan(base, r)).toMatchObject({ flash: true, shake: true, loudness: 1 })
  })
  it('arany ≈5%, kamu csak „Be" módban; a streamer-mód jelzést kér', () => {
    let gold = 0
    for (let i = 0; i < 4000; i++) gold += scarePlan(base, Math.random)!.golden ? 1 : 0
    expect(gold / 4000).toBeGreaterThan(0.03)
    expect(gold / 4000).toBeLessThan(0.08)
    expect(scarePlan({ ...base, mode: 'soft' }, seq(0.9, 0.01))!.fake).toBe(false)
    expect(scarePlan({ ...base, streamerMode: true }, seq(0.5))!.cue).toBe(true)
  })
  it('Klasszikusban és bónuszban soha; világonként legalább 3 változat', () => {
    expect(scareAllowed('classic')).toBe(false)
    expect(scareAllowed('bonus')).toBe(false)
    expect(['event', 'generated', 'community'].every(scareAllowed)).toBe(true)
    for (const w of ['hollowmere', 'fnaf', 'poppy-playtime', 'ismeretlen']) expect(variantsFor(w).length).toBeGreaterThanOrEqual(3)
  })
})
