import { describe, expect, it } from 'vitest'
import { createStorage, memoryKV } from '../storage'
import { nextPuzzle } from './next'
import { awardSolve, xpFor } from './rewards'

describe('XP (GDD 14.7)', () => {
  it('pályánként 50 / 100 / 200 / 350 / 600, tipp nélkül +25%', () => {
    expect([1, 2, 3, 4, 5].map((d) => xpFor(d, 1))).toEqual([50, 100, 200, 350, 600])
    expect([1, 2, 3, 4, 5].map((d) => xpFor(d, 0))).toEqual([63, 125, 250, 438, 750])
  })

  it('az első megoldás XP-t ad a profilba, az ismételt nem', async () => {
    const s = createStorage(memoryKV())
    expect(await awardSolve(s, { difficulty: 2 }, 0, false)).toEqual({ xp: 125, first: true })
    expect((await s.getProfile()).xp).toBe(125)
    expect(await awardSolve(s, { difficulty: 2 }, 0, true)).toEqual({ xp: 0, first: false })
    expect((await s.getProfile()).xp).toBe(125)
  })
})

describe('Folytatás: a következő ügy', () => {
  it('a Klasszikusban a következő sorszám, a szint végén a következő szint eleje', () => {
    expect(nextPuzzle({ id: 'classic-1-01-flower-store', mode: 'classic' })?.id).toMatch(/^classic-1-02-/)
    expect(nextPuzzle({ id: 'classic-1-20-office', mode: 'classic' })?.id).toMatch(/^classic-2-01-/)
  })
  it('az Eseményben a világ következő ügye, a világ végén a következő világ; az utolsónak és a bónusznak nincs következője', () => {
    expect(nextPuzzle({ id: 'event-01-night-pizzeria-1', mode: 'event' })?.id).toBe('event-01-night-pizzeria-2')
    expect(nextPuzzle({ id: 'event-01-night-pizzeria-5', mode: 'event' })?.id).toBe('event-02-toy-factory-1')
    expect(nextPuzzle({ id: 'event-19-wizard-school-5', mode: 'event' })).toBeNull()
    expect(nextPuzzle({ id: 'bonus-1', mode: 'bonus' })).toBeNull()
    expect(nextPuzzle({ id: 'gen:1:2:ABC', mode: 'generated' })).toBeNull()
  })
})
