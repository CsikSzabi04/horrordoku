import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { BoardState } from '../shared/board'
import type { Puzzle } from '../shared/puzzle'
import { boardEngine } from './board'

const p = JSON.parse(readFileSync('src/engine/fixtures/midnight-mass.json', 'utf8')) as Puzzle
const base = (notes: BoardState['notes']): BoardState => ({ placed: {}, marks: [], notes })

describe('lerakáskor a karakter betű-jegyzetei mindenhonnan lekerülnek', () => {
  it('a lerakott karakter betűje minden mezőről eltűnik; a többi karakter jegyzete marad', () => {
    const s = base({ A1: ['vlad'], C3: ['vlad', 'silas'], D3: ['lilith'], E5: ['vlad', 'lilith', 'silas'] })
    const r = boardEngine.apply(p, s, { op: 'place', char: 'vlad', cell: 'E1' })
    expect(r.ok && r.state.notes).toEqual({ C3: ['silas'], D3: ['lilith'], E5: ['lilith', 'silas'] })
  })
  it('a mozgatás után sem marad régi jegyzet; az eredeti állapot változatlan (tiszta függvény)', () => {
    const s = base({ B4: ['vlad'] })
    const r = boardEngine.apply(p, s, { op: 'place', char: 'vlad', cell: 'E1' })
    expect(r.ok && r.state.notes).toEqual({})
    expect(s.notes).toEqual({ B4: ['vlad'] })
  })
  it('sikertelen lerakás nem töröl jegyzetet', () => {
    const s = base({ B4: ['vlad'] })
    const r = boardEngine.apply(p, s, { op: 'place', char: 'vlad', cell: 'A4' }) // foglalt mező
    expect(r.ok).toBe(false)
    expect(s.notes).toEqual({ B4: ['vlad'] })
  })
})
