import { afterEach, describe, expect, it } from 'vitest'
import { KILLER_STRINGS } from '../game/killerStrings'
import { STRINGS } from '../game/strings'
import { en } from './en'
import { hu } from './hu'
import { getLang, pick, setCurrentLang } from './lang'
import { t } from './index'

type Dict = Record<string, string>

/**
 * Where an English value may be identical to the Hungarian one: international words, brand names, symbol-only strings.
 * (Strings without any letter, such as emoji-only or numbers-only values, are always allowed.) Anything else that is
 * identical is almost certainly an untranslated leftover.
 */
const SAME_ALLOWED: Record<string, string> = {
  'menu.random': 'international word',
  'lobby.chat': 'international word',
  'lobby.host': 'international word',
  'lobby.title': 'international word',
  'rooms.state.lobby': 'international word',
  'friends.online': 'international word',
  'settings.online': 'international word',
  'settings.scare': 'international word (jumpscare)',
  'settings.lang.en': 'language name, shown in its own language',
  // game/strings.ts
  coopChat: 'international word',
}

/** Real franchises must not appear anywhere in the player-visible text (see franchise.md). */
const BANNED = /five nights|freddy|poppy playtime|huggy|stranger things|murdoku|resident evil|silent hill|harry potter|hogwarts|game of thrones|walking dead|last of us|dead space|alan wake|rick and morty|vampire diaries/i

const HUNGARIAN_LETTERS = /[áéíóöőúüű]/i
const placeholders = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort()

/** Shared completeness checks for a pair of dictionaries. */
function checkPair(label: string, huDict: Dict, enDict: Dict): void {
  describe(`${label}: hu ↔ en`, () => {
    it('has exactly the same keys in both languages', () => {
      expect(Object.keys(enDict).sort()).toEqual(Object.keys(huDict).sort())
    })
    it('has no empty value', () => {
      for (const [k, v] of Object.entries(huDict)) expect(v.trim(), `hu ${k}`).not.toBe('')
      for (const [k, v] of Object.entries(enDict)) expect(v.trim(), `en ${k}`).not.toBe('')
    })
    it('has no English value that is just the Hungarian text (except the allow-list)', () => {
      for (const [k, v] of Object.entries(enDict)) {
        if (!/\p{L}/u.test(v)) continue // emoji-only / numbers-only
        if (k in SAME_ALLOWED) continue
        expect(v, `en ${k} is identical to hu`).not.toBe(huDict[k])
      }
    })
    it('has no Hungarian letters left in the English text', () => {
      for (const [k, v] of Object.entries(enDict)) expect(HUNGARIAN_LETTERS.test(v), `en ${k}: ${v}`).toBe(false)
    })
    it('keeps the {placeholders} identical in both languages', () => {
      for (const [k, v] of Object.entries(huDict)) expect(placeholders(enDict[k] ?? ''), k).toEqual(placeholders(v))
    })
    it('mentions no real franchise', () => {
      for (const [k, v] of Object.entries(huDict)) expect(BANNED.test(v), `hu ${k}: ${v}`).toBe(false)
      for (const [k, v] of Object.entries(enDict)) expect(BANNED.test(v), `en ${k}: ${v}`).toBe(false)
    })
  })
}

checkPair('UI dictionary', hu, en)
checkPair('game screen strings', STRINGS.hu, STRINGS.en)
checkPair('killer mode strings', KILLER_STRINGS.hu, KILLER_STRINGS.en)

describe('i18n', () => {
  afterEach(() => setCurrentLang('hu'))

  it('minden kulcsnak van szövege', () => {
    for (const [k, v] of Object.entries(hu)) expect(v.trim(), k).not.toBe('')
  })
  it('t() a kulcs szövegét adja', () => expect(t('app.tagline')).toBe('Ahol a sudoku vért ont.'))
  it('t() follows the current language', () => {
    expect(getLang()).toBe('hu')
    expect(t('menu.classic')).toBe('Klasszikus')
    setCurrentLang('en')
    expect(t('menu.classic')).toBe('Classic')
    expect(t('menu.event.sub')).toBe(en['menu.event.sub'])
    setCurrentLang('hu')
    expect(t('menu.classic')).toBe('Klasszikus')
  })
  it('pick() chooses by the current language', () => {
    expect(pick('igen', 'yes')).toBe('igen')
    setCurrentLang('en')
    expect(pick('igen', 'yes')).toBe('yes')
  })
  it('the Event menu line mentions no real franchise', () => {
    expect(hu['menu.event.sub']).toBe('19 világ × 5 ügy eredeti horror-történetekből')
    expect(en['menu.event.sub']).toBe('19 worlds × 5 cases from original horror stories')
  })
})
