import { describe, expect, it, vi } from 'vitest'

describe('alapértelmezett nyelv', () => {
  it('az app alapból angolul indul mindenkinek (a tesztek közös beállítása magyar, ezért friss modul-példányt töltünk)', async () => {
    vi.resetModules()
    const fresh = await import('./lang')
    expect(fresh.getLang()).toBe('en')
  })
})
