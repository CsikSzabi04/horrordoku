import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boardEngine } from '../engine'
import { buildGrid } from '../engine/grid'
import type { Puzzle } from '../shared/puzzle'
import type { KillerState } from '../shared/room'
import { fakeClueText } from './fakeClue'
import { clockSpeed, clockText, remainingMs } from './killerClock'
import { kt } from './killerStrings'

const load = (dir: string): Puzzle[] =>
  readdirSync(`puzzles/${dir}`)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`puzzles/${dir}/${f}`, 'utf8')) as Puzzle)

describe('Gyilkos óra: a szerver képlete (kg_remaining_ms)', () => {
  const base: KillerState = { running: true, now: 0, startedAt: 1_000_000, timeLimitMs: 600_000, penaltyMs: 0, speed: [] }
  it('határidő − eltelt idő', () => {
    expect(remainingMs(base, 1_000_000)).toBe(600_000)
    expect(remainingMs(base, 1_100_000)).toBe(500_000)
  })
  it('a lopott idő és a leleplezés (negatív büntetés) módosítja', () => {
    expect(remainingMs({ ...base, penaltyMs: 20_000 }, 1_100_000)).toBe(480_000)
    expect(remainingMs({ ...base, penaltyMs: -60_000 }, 1_100_000)).toBe(560_000)
  })
  it('a háromszoros szakasz alatt kétszeres többlet fogy, utána a többlet megmarad', () => {
    const s = { ...base, speed: [{ from: 1_100_000, until: 1_110_000, factor: 3 }] }
    expect(remainingMs(s, 1_105_000)).toBe(600_000 - 105_000 - 2 * 5_000) // félúton: 5 mp × (3−1)
    expect(remainingMs(s, 1_200_000)).toBe(600_000 - 200_000 - 2 * 10_000) // a szakasz vége után is levonva
    expect(clockSpeed(s, 1_105_000)).toBe(3)
    expect(clockSpeed(s, 1_200_000)).toBe(1)
  })
  it('időkorlát nélkül / futó játék híján nincs hátralévő idő', () => {
    expect(remainingMs({ ...base, timeLimitMs: null }, 1_100_000)).toBeNull()
    expect(remainingMs({ running: false, now: 0 }, 5)).toBeNull()
    expect(remainingMs(null, 5)).toBeNull()
  })
  it('a kijelzés: mm:ss, lejáratkor 00:00', () => {
    expect(clockText(461_000)).toBe('07:41')
    expect(clockText(-5000)).toBe('00:00')
    expect(clockText(null)).toBe('--:--')
  })
})

describe('Szövegcsere: hihető, de hamis nyom', () => {
  const rnd = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  it('a Klasszikus és az Esemény pályák minden gyanúsítottjához készíthető, és sosem azonos a valódival', () => {
    let made = 0
    let total = 0
    for (const p of [...load('classic'), ...load('event')]) {
      for (const ch of p.characters) {
        if (ch.victim) {
          expect(fakeClueText(p, ch.id, rnd(1))).toBeNull() // az áldozat kártyáját nem hamisítjuk
          continue
        }
        total++
        const fake = fakeClueText(p, ch.id, rnd(total))
        if (fake === null) continue
        made++
        expect(fake, `${p.id}/${ch.id}`).not.toBe(ch.clueText.join(' '))
        expect(fake).not.toMatch(/undefined|null|\[object/)
        expect(fake.length).toBeGreaterThan(5)
      }
    }
    expect(made / total).toBeGreaterThan(0.97) // gyakorlatilag mindenhez van hamis változat
  })
  it('ismeretlen karakterhez nincs', () => {
    const p = load('classic')[0]!
    expect(fakeClueText(p, 'nincs-ilyen')).toBeNull()
  })
})

describe('Eltüntetés: a motor csak „trap” jelzéssel enged foglalt mezőre', () => {
  const p = JSON.parse(readFileSync('puzzles/classic/classic-1-01-flower-store.json', 'utf8')) as Puzzle
  const g = buildGrid(p)
  let blocked = ''
  for (let r = 0; r < p.size; r++) for (let c = 0; c < p.size; c++) if (g.blocked[r]![c] && !blocked) blocked = `${String.fromCharCode(65 + c)}${r + 1}`
  const empty = boardEngine.empty()
  const who = p.characters.find((c) => !c.victim)!.id
  it('jelzés nélkül: foglalt tárgy', () => {
    expect(boardEngine.apply(p, empty, { op: 'place', char: who, cell: blocked })).toEqual({ ok: false, error: 'blocked_object' })
  })
  it('trap jelzéssel: lerakható (a többi szabály érvényben marad)', () => {
    const r = boardEngine.apply(p, empty, { op: 'place', char: who, cell: blocked, trap: true })
    expect(r.ok && r.state.placed[who]).toBe(blocked)
  })
  it('a trap jelzés szabad mezőn semmit sem változtat', () => {
    const r = boardEngine.apply(p, empty, { op: 'place', char: who, cell: p.solution[who]!, trap: true })
    expect(r.ok).toBe(true)
  })
})

describe('Gyilkos szövegek', () => {
  it('hu és en ugyanazokat a kulcsokat tartalmazza, a helyőrzők cserélődnek', () => {
    expect(kt('hu', 'logMeeting', { name: 'Anna' })).toContain('Anna')
    expect(kt('en', 'logLife', { n: 2 })).toContain('2')
    expect(kt('hu', 'cardKillerTitle')).toContain('GYILKOS')
    expect(kt('en', 'cardKillerTitle')).toContain('KILLER')
  })
})
