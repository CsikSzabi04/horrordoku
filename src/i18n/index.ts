import { en } from './en'
import { hu } from './hu'
import type { I18nKey } from './hu'
import { getLang } from './lang'

export type { I18nKey }
export { getLang, pick, setCurrentLang, subscribeLang, useCurrentLang } from './lang'
export type { Lang } from './lang'
/** Szöveg kulcsból, az aktuális nyelven. Ismeretlen kulcs nem létezhet (típus-ellenőrzött). */
export const t = (key: I18nKey): string => (getLang() === 'en' ? en[key] : hu[key])
