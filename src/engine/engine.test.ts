import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { BoardState } from '../shared/board'
import type { Difficulty, Puzzle } from '../shared/puzzle'
import { boardEngine } from './board'
import { codeOf, dailyRef, generate, generateFromRef, isDailyRef, makeRef, parseRef, refFromCode } from './generator'
import { verifySolution } from './rules'
import { solve } from './solver'

const midnight = JSON.parse(readFileSync('src/engine/fixtures/midnight-mass.json', 'utf8')) as Puzzle

describe('megoldó', () => {
  it('Éjféli Mise: pontosan 1 megoldás, az a közölt', () => {
    const r = solve(midnight, 5)
    expect(r.solutions).toEqual([midnight.solution])
    expect(verifySolution(midnight, midnight.solution)).toBe(true)
  })
  it('nyom törlése → több megoldás; ellentmondó nyom → 0', () => {
    const loose = structuredClone(midnight)
    for (const c of loose.characters.slice(0, 5)) c.clues = []
    expect(solve(loose, 5).solutions.length).toBeGreaterThan(1)
    const bad = structuredClone(midnight)
    bad.characters[4].clues = [{ kind: 'in', room: 'K' }]
    expect(solve(bad, 5).solutions).toHaveLength(0)
  })
})

describe('tábla', () => {
  const e = boardEngine
  const ok = (r: ReturnType<typeof e.apply>): BoardState => {
    if (!r.ok) throw new Error(r.error)
    return r.state
  }
  it('lerak, felvesz, sor/oszlop és foglalt tárgy szabály', () => {
    let s: BoardState = e.empty()
    s = ok(e.apply(midnight, s, { op: 'place', char: 'vlad', cell: 'E1' }))
    expect(e.apply(midnight, s, { op: 'place', char: 'silas', cell: 'B1' })).toEqual({ ok: false, error: 'row_col_conflict' })
    expect(e.apply(midnight, s, { op: 'place', char: 'silas', cell: 'E3' })).toEqual({ ok: false, error: 'row_col_conflict' })
    expect(e.apply(midnight, s, { op: 'place', char: 'silas', cell: 'A4' })).toEqual({ ok: false, error: 'blocked_object' })
    expect(e.apply(midnight, s, { op: 'place', char: 'nobody', cell: 'B2' })).toEqual({ ok: false, error: 'unknown_char' })
    expect(e.apply(midnight, s, { op: 'place', char: 'silas', cell: 'Z9' })).toEqual({ ok: false, error: 'unknown_cell' })
    expect(e.autoMarks(midnight, s)).toContain('E4')
    expect(e.autoMarks(midnight, s)).not.toContain('E1')
    s = ok(e.apply(midnight, s, { op: 'move', char: 'vlad', to: 'D1' }))
    expect(s.placed).toEqual({ vlad: 'D1' })
  })
  it('jelölés, jegyzet, törlés; a lerakás törli a jelölést', () => {
    let s: BoardState = e.empty()
    s = ok(e.apply(midnight, s, { op: 'mark', cell: 'B2', on: true }))
    s = ok(e.apply(midnight, s, { op: 'note', cell: 'C3', chars: ['vlad', 'silas'] }))
    expect(s.marks).toEqual(['B2'])
    s = ok(e.apply(midnight, s, { op: 'place', char: 'silas', cell: 'B2' }))
    expect(s.marks).toEqual([])
    s = ok(e.apply(midnight, s, { op: 'erase', cell: 'B2' }))
    expect(s.placed).toEqual({})
  })
  it('check / isComplete a megoldásra', () => {
    let s: BoardState = e.empty()
    for (const [char, cell] of Object.entries(midnight.solution)) s = ok(e.apply(midnight, s, { op: 'place', char, cell }))
    expect(e.isComplete(midnight, s)).toBe(true)
    expect(e.check(midnight, s)).toEqual({ correct: true, wrongChars: [] })
    s = ok(e.apply(midnight, s, { op: 'unplace', char: 'vlad' }))
    s = ok(e.apply(midnight, s, { op: 'unplace', char: 'ezekiel' }))
    expect(e.isComplete(midnight, s)).toBe(false)
    s = ok(e.apply(midnight, s, { op: 'place', char: 'vlad', cell: 'F4' }))
    s = ok(e.apply(midnight, s, { op: 'place', char: 'ezekiel', cell: 'E1' }))
    expect(e.check(midnight, s)).toEqual({ correct: false, wrongChars: ['vlad', 'ezekiel'] })
  })
})

describe('generátor', () => {
  it('ref formátum', () => {
    expect(makeRef(2, 'ABC123')).toBe('gen:1:2:ABC123')
    expect(parseRef('gen:1:2:ABC123')).toEqual({ difficulty: 2, seed: 'ABC123' })
    expect(parseRef('gen:9:2:ABC123')).toBeNull()
    expect(generateFromRef('classic-01')).toBeNull()
  })
  it('ügykód és napi ügy', () => {
    expect(codeOf('gen:1:3:7F3K92')).toBe('3-7F3K92')
    expect(refFromCode(' 3-7f3k92 ')).toBe('gen:1:3:7F3K92')
    expect(refFromCode('gen:1:2:ABC123')).toBe('gen:1:2:ABC123')
    expect(refFromCode('9-xyz')).toBeNull()
    expect(refFromCode('nonsense')).toBeNull()
    const d = dailyRef(new Date('2026-10-25T12:00:00Z'))
    expect(d).toMatch(/^gen:1:[1-5]:D20261025$/)
    expect(isDailyRef(d)).toBe(true)
    expect(dailyRef(new Date('2026-10-25T12:00:00Z'))).toBe(d)
    expect(generateFromRef(d)!.characters).toHaveLength(generateFromRef(d)!.size)
  })
  it('determinisztikus', () => {
    expect(generate('SEED01', 3)).toEqual(generate('SEED01', 3))
    expect(generate('SEED01', 3)).not.toEqual(generate('SEED02', 3))
  })
  const N = Number(process.env.GEN_N ?? 40)
  for (const d of [1, 2, 3, 4, 5] as Difficulty[])
    it(`nehézség ${d}: ${N} seed érvényes, pontosan 1 megoldású`, () => {
      for (let i = 0; i < N; i++) {
        const p = generate(`T${d}x${i}`, d)
        expect(p.size).toBe(p.characters.length)
        expect(p.characters.filter((c) => c.victim)).toHaveLength(1)
        expect(p.layout).toHaveLength(p.size)
        expect(verifySolution(p, p.solution)).toBe(true)
        expect(solve(p, 3).solutions).toEqual([p.solution])
        expect(p.characters.every((c) => c.clues.length === 1 && c.clueText.length === 1)).toBe(true)
      }
    }, 120_000)
})
