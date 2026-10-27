import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Avatar, HAIRSTYLES } from './Portrait'

const ids = Array.from({ length: 300 }, (_, i) => `szereplo-${i}`)
const FEMALE_SHOULDERS = 'M15 120'
const MALE_SHOULDERS = 'M6 120'

describe('Klasszikus arcképek: a nemhez illő megjelenés', () => {
  it('a női és a férfi frizura-választék különbözik (nincs közös, kétértelmű fej)', () => {
    expect(HAIRSTYLES.f.filter((s) => (HAIRSTYLES.m as readonly string[]).includes(s))).toEqual([])
  })
  it('női szereplő mindig női arcot kap (keskeny váll, női frizura), férfi mindig férfiasat', () => {
    for (const id of ids) {
      const f = renderToStaticMarkup(createElement(Avatar, { id, gender: 'f' }))
      const m = renderToStaticMarkup(createElement(Avatar, { id, gender: 'm' }))
      expect(f, id).toContain(FEMALE_SHOULDERS)
      expect(f, id).not.toContain(MALE_SHOULDERS)
      expect(m, id).toContain(MALE_SHOULDERS)
      expect(m, id).not.toContain(FEMALE_SHOULDERS)
      expect(f, id).not.toMatch(/<rect x="26" y="40"/) // a sapka (férfi) nincs a női arcon
    }
  })
  it('a női arcon a hosszú / félhosszú frizura valamelyike látszik (nincs „rövid hajú” nő)', () => {
    // a női frizurák mind a hátsó rétegben rajzolnak hajat (hosszú, bob, kontyos, copfos vagy hullámos) — a férfiaknál ilyen réteg nincs
    for (const id of ids) {
      const f = renderToStaticMarkup(createElement(Avatar, { id, gender: 'f' }))
      const hasBack = /d="M25 52 Q20 16|d="M25 54 Q20 16|<circle cx="76" cy="46" r="9"|<circle cx="50" cy="15" r="9"|<circle cx="2[2-4]" cy="(50|63|76|89)" r="10"/.test(f)
      expect(hasBack, id).toBe(true)
    }
  })
})
