import { hu } from './hu'
import type { I18nKey } from './hu'

export type { I18nKey }
/** Szöveg kulcsból. Ismeretlen kulcs nem létezhet (típus-ellenőrzött). */
export const t = (key: I18nKey): string => hu[key]
