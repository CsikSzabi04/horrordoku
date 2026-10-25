import { describe, expect, it } from 'vitest'
import { fmtDate, fmtMs } from './format'

describe('fmtMs', () => {
  it('perc:másodperc, óra felett ó:pp:mm', () => {
    expect(fmtMs(0)).toBe('0:00')
    expect(fmtMs(90000)).toBe('1:30')
    expect(fmtMs(59999)).toBe('1:00') // kerekítés
    expect(fmtMs(3725000)).toBe('1:02:05')
  })
  it('hiányzó vagy érvénytelen érték: gondolatjel', () => {
    expect(fmtMs(undefined)).toBe('—')
    expect(fmtMs(-5)).toBe('—')
    expect(fmtMs(Number.NaN)).toBe('—')
  })
})

describe('fmtDate', () => {
  it('hiányzó / hibás dátum: gondolatjel', () => {
    expect(fmtDate(undefined)).toBe('—')
    expect(fmtDate('nem-dátum')).toBe('—')
    expect(fmtDate('2026-10-25T21:19:44Z')).toMatch(/2026/)
  })
})
