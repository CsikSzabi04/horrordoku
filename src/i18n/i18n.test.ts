import { describe, expect, it } from 'vitest'
import { hu } from './hu'
import { t } from './index'

describe('i18n', () => {
  it('minden kulcsnak van szövege', () => {
    for (const [k, v] of Object.entries(hu)) expect(v.trim(), k).not.toBe('')
  })
  it('t() a kulcs szövegét adja', () => expect(t('app.tagline')).toBe('Ahol a sudoku vért ont.'))
})
