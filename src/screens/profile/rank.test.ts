import { describe, expect, it } from 'vitest'
import { hoursMinutes, rankOf } from './rank'

describe('rankOf', () => {
  it('a küszöbök határán vált rangot', () => {
    expect(rankOf(0)).toEqual({ id: 'rookie', min: 0, next: 500 })
    expect(rankOf(499).id).toBe('rookie')
    expect(rankOf(500)).toEqual({ id: 'guard', min: 500, next: 1500 })
    expect(rankOf(1500).id).toBe('detective')
    expect(rankOf(4000).id).toBe('hunter')
    expect(rankOf(10000)).toEqual({ id: 'ninth', min: 10000, next: null })
    expect(rankOf(99999).next).toBeNull()
  })
})

describe('hoursMinutes', () => {
  it('ms → óra/perc', () => {
    expect(hoursMinutes(0)).toEqual({ h: 0, m: 0 })
    expect(hoursMinutes((6 * 60 + 12) * 60000 + 999)).toEqual({ h: 6, m: 12 })
    expect(hoursMinutes(-5)).toEqual({ h: 0, m: 0 })
  })
})
