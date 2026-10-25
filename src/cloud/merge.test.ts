import { describe, expect, it } from 'vitest'
import { mergeEntry, mergeGuestProfile, mergeProfile, mergeProgress, mergeSessions, mergeSettings, mergeUnlocks } from './merge'
import type { ProfileSnapshot, ProgressEntry, ProgressFile, RunRecord, SessionState, SessionsFile, Settings, UnlocksFile } from '../shared/storage'

// Determinisztikus álvéletlen (mulberry32), hogy a tulajdonság-tesztek reprodukálhatók legyenek.
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)]!
const time = (r: () => number) => new Date(Date.UTC(2026, 9, 1 + Math.floor(r() * 5), Math.floor(r() * 3))).toISOString()

const entry = (r: () => number): ProgressEntry => {
  const solved = r() < 0.6
  const e: ProgressEntry = { solved, wrongSubmits: Math.floor(r() * 4) }
  if (solved) {
    e.bestMs = pick(r, [60000, 90000, 90000, 120000])
    if (r() < 0.8) e.hints = Math.floor(r() * 3)
    e.firstSolvedAt = time(r)
  } else if (r() < 0.3) e.hints = Math.floor(r() * 3)
  return e
}
const run = (r: () => number): RunRecord => ({ id: pick(r, ['r1', 'r2', 'r3', 'r4']), ref: 'classic-01', kind: 'catalog', solved: true, hints: 0, wrongSubmits: 0, at: time(r) })
const progress = (r: () => number): ProgressFile => ({
  v: 1,
  updatedAt: time(r),
  puzzles: Object.fromEntries(['classic-01', 'classic-02', 'classic-03'].filter(() => r() < 0.6).map((k) => [k, entry(r)])),
  // az azonos azonosítójú futás azonos tartalmú (a futás-napló csak hozzáfűzés)
  recentRuns: [...new Map([run(r), run(r)].map((x) => [x.id, { ...x, at: `2026-10-0${x.id.slice(1)}T10:00:00.000Z` }])).values()],
})
const session = (r: () => number): SessionState => ({ elapsedMs: Math.floor(r() * 3) * 1000, hintsUsed: 0, wrongSubmits: 0, board: {} as SessionState['board'], updatedAt: time(r) })
const sessions = (r: () => number): SessionsFile => ({ v: 1, sessions: Object.fromEntries(['a', 'b', 'c'].filter(() => r() < 0.6).map((k) => [k, session(r)])) })
const unlocks = (r: () => number): UnlocksFile => ({
  v: 1,
  items: ['vlad', 'silas', 'lilith'].filter(() => r() < 0.6).map((id) => ({ kind: 'character' as const, id, at: time(r) })),
})
const settings = (r: () => number): Settings => ({
  v: 1, language: 'hu', theme: 'dark', audio: { music: pick(r, [0.2, 0.6]), sfx: 0.8, volumeCap: 0.8 }, jumpscare: pick(r, ['off', 'soft'] as const),
  photosensitive: r() < 0.5, screenShake: true, streamerMode: false, invisible: false, updatedAt: time(r),
})
const profile = (r: () => number): ProfileSnapshot => ({ v: 1, id: 'u1', username: 'n', avatar: 'vlad', xp: Math.floor(r() * 3) * 100, coins: 0, streak: 0, bestStreak: 0, updatedAt: time(r) })

/** kommutatív · idempotens · asszociatív — 200 véletlen hármasra */
function laws<T>(gen: (r: () => number) => T, merge: (a: T, b: T) => T) {
  const r = rng(42)
  for (let i = 0; i < 200; i++) {
    const [a, b, c] = [gen(r), gen(r), gen(r)]
    expect(merge(a, b)).toEqual(merge(b, a))
    expect(merge(merge(a, a), a)).toEqual(merge(a, a))
    expect(merge(merge(a, b), b)).toEqual(merge(a, b))
    expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)))
  }
}

describe('tulajdonság-tesztek (kommutatív / idempotens / asszociatív)', () => {
  it('haladás', () => laws(progress, mergeProgress))
  it('félbehagyott játékok', () => laws(sessions, mergeSessions))
  it('feloldások', () => laws(unlocks, mergeUnlocks))
  it('beállítások', () => laws(settings, mergeSettings))
  it('profil', () => laws(profile, mergeProfile))
})

describe('mergeEntry — a GDD 17.5 szabályai', () => {
  it('solved = VAGY, bestMs = MIN, hints a legjobb idejű futásé, wrongSubmits = MAX', () => {
    const local: ProgressEntry = { solved: false, wrongSubmits: 4 }
    const cloud: ProgressEntry = { solved: true, bestMs: 90000, hints: 2, wrongSubmits: 1, firstSolvedAt: '2026-10-02T00:00:00Z' }
    expect(mergeEntry(local, cloud)).toEqual({ solved: true, bestMs: 90000, hints: 2, wrongSubmits: 4, firstSolvedAt: '2026-10-02T00:00:00Z' })
    const a: ProgressEntry = { solved: true, bestMs: 100000, hints: 0, wrongSubmits: 0 }
    const b: ProgressEntry = { solved: true, bestMs: 80000, hints: 3, wrongSubmits: 0 }
    expect(mergeEntry(a, b)).toMatchObject({ bestMs: 80000, hints: 3 }) // a gyorsabb futás tippjei, nem a kevesebb tipp
  })
  it('a recentRuns azonosító szerint egyesül, legfeljebb 20, újabb elöl', () => {
    const mk = (n: number): RunRecord => ({ id: `r${String(n).padStart(2, '0')}`, ref: 'x', kind: 'catalog', solved: true, hints: 0, wrongSubmits: 0, at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString() })
    const a: ProgressFile = { v: 1, updatedAt: '2026-10-01T00:00:00Z', puzzles: {}, recentRuns: Array.from({ length: 15 }, (_, i) => mk(i)) }
    const b: ProgressFile = { v: 1, updatedAt: '2026-10-01T00:00:00Z', puzzles: {}, recentRuns: Array.from({ length: 15 }, (_, i) => mk(i + 10)) }
    const m = mergeProgress(a, b)
    expect(m.recentRuns).toHaveLength(20)
    expect(m.recentRuns[0]!.id).toBe('r24')
    expect(new Set(m.recentRuns.map((x) => x.id)).size).toBe(20)
  })
})

describe('vendég → fiók', () => {
  it('a fiók XP-jét nem írja felül egy 0-ról induló vendég-profil, a becenév a fiókból marad', () => {
    const account: ProfileSnapshot = { v: 1, id: 'u1', username: 'Vlad', avatar: 'vlad', xp: 900, coins: 5, streak: 3, bestStreak: 7, updatedAt: '2026-10-01T00:00:00Z' }
    const guest: ProfileSnapshot = { v: 1, id: null, username: '', avatar: 'candle', xp: 50, coins: 9, streak: 1, bestStreak: 1, lastDaily: '2026-10-03', updatedAt: '2026-10-03T00:00:00Z' }
    expect(mergeGuestProfile(guest, account)).toEqual({
      v: 1, id: 'u1', username: 'Vlad', avatar: 'vlad', xp: 900, coins: 9, streak: 1, bestStreak: 7, lastDaily: '2026-10-03', updatedAt: '2026-10-03T00:00:00Z',
    })
  })
})
