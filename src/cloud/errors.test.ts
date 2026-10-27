import { afterEach, describe, expect, it } from 'vitest'
import { setCurrentLang } from '../i18n/lang'
import { errorText } from './errors'

afterEach(() => setCurrentLang('hu'))

describe('hibaszövegek', () => {
  it('az aktuális nyelven jönnek, és a nyelvváltást követik', () => {
    const hu = errorText({ code: 'offline', message: 'timeout' })
    expect(hu).toMatch(/felhő/)
    setCurrentLang('en')
    expect(errorText({ code: 'offline', message: 'timeout' })).toBe('No connection to the cloud — please try again later.')
    expect(errorText({ code: 'conflict', message: 'room is full' })).toBe('The room is full.')
    expect(errorText({ code: 'invalid', message: 'chat_length' })).toBe('A message must be 1–300 characters long.')
    setCurrentLang('hu')
    expect(errorText({ code: 'offline', message: 'timeout' })).toBe(hu)
  })
})
