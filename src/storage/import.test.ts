import { describe, expect, it } from 'vitest'
import { createStorage, memoryKV, validImportEntry } from '.'

const prog = JSON.stringify({ v: 1, updatedAt: 'x', puzzles: {}, recentRuns: [] })

describe('mentés betöltése: idegen fájl ellenőrzése', () => {
  it('csak ismert kulcs, érvényes JSON és a várt alak fogadható el', () => {
    expect(validImportEntry('nd:v1:guest:progress', prog)).toBe(true)
    expect(validImportEntry('nd:v1:u_1a2b3c4d:progress', prog)).toBe(true)
    expect(validImportEntry('nd:v1:settings', '{}')).toBe(true)
    expect(validImportEntry('nd:v1:guest:language', '"hu"')).toBe(true)
    // rossz alak / érték / kulcs
    expect(validImportEntry('nd:v1:guest:progress', '{"puzzles":null}')).toBe(false)
    expect(validImportEntry('nd:v1:guest:progress', 'nem json')).toBe(false)
    expect(validImportEntry('nd:v1:guest:language', '"xx"')).toBe(false)
    expect(validImportEntry('nd:v1:guest:ismeretlen', '{}')).toBe(false)
    expect(validImportEntry('nd:v1:bárki:progress', prog)).toBe(false) // a hatókör csak guest / u_<8 hex>
    expect(validImportEntry('masik-app:kulcs', prog)).toBe(false)
    expect(validImportEntry('nd:v1:guest:progress', 5 as never)).toBe(false)
    expect(validImportEntry('nd:v1:guest:progress', `{"puzzles":{},"recentRuns":[],"x":"${'a'.repeat(2_000_001)}"}`)).toBe(false)
  })

  it('az importálás eldobja a rossz bejegyzéseket, és hibát ad, ha semmi használható nincs', async () => {
    const kv = memoryKV()
    const st = createStorage(kv)
    await st.importData({ v: 1, exportedAt: 'x', entries: { 'nd:v1:guest:progress': prog, 'nd:v1:guest:sessions': '"rossz"', 'evil': prog } })
    expect(kv.get('nd:v1:guest:progress')).toBe(prog)
    expect(kv.get('nd:v1:guest:sessions')).toBeNull()
    expect(kv.get('evil')).toBeNull()
    await expect(st.importData({ v: 1, exportedAt: 'x', entries: { 'nd:v1:guest:sessions': '[]' } })).rejects.toThrow()
    await expect(st.importData(null as never)).rejects.toThrow()
  })
})
