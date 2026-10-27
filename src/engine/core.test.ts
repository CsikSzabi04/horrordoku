import { describe, expect, it } from 'vitest'
import { generate } from './generator'
import type { CastMember } from './generator'

const cast: CastMember[] = ['Aranka', 'Béla', 'Cili', 'Dani', 'Emma', 'Ferkó', 'Gizi', 'Hugó', 'Ica', 'Jenő'].map((name) => ({ id: name.toLowerCase(), name, race: 'human' as const }))
const victim: CastMember = { id: 'aldozat', name: 'Áldozat', race: 'human' }

describe('GenOpts.core: a főszereplők mindig szerepelnek', () => {
  it('a gárda nagyobb, mint a gyanúsítottak száma: a megadott főszereplők minden seedre ott vannak', () => {
    for (let i = 0; i < 25; i++) {
      const p = generate(`CORE${i}`, 2, { size: 5, cast, victim, core: ['hugó', 'jenő', 'aranka'], stand: ['bench', 'sofa'], block: ['tree', 'bell'] })
      const names = new Set(p.characters.map((c) => c.id))
      for (const id of ['hugó', 'jenő', 'aranka']) expect(names.has(id), `${p.id}: ${id}`).toBe(true)
      expect(p.characters).toHaveLength(5)
    }
  })
  it('kényszer nélkül is él a gárda véletlen kiválasztása (nem mindenki van mindig benne)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 25; i++) generate(`FREE${i}`, 2, { size: 5, cast, victim, stand: ['bench', 'sofa'], block: ['tree', 'bell'] }).characters.forEach((c) => seen.add(c.id))
    expect(seen.size).toBeGreaterThan(5)
  })
})
