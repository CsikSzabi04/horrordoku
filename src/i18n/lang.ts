import { useSyncExternalStore } from 'react'

/**
 * Az app aktuális nyelve (egyetlen igazság). A forrása a `settings.language` (helyi tároló, bejelentkezve a felhő-profillal
 * szinkronban); az `App` tölti be és követi a változást. A `t()` és minden nyelvfüggő segéd ezt olvassa.
 */
export type Lang = 'hu' | 'en'

let current: Lang = 'en' // alapból angol mindenkinek; a profil nyelvét az `App` tölti be
const subs = new Set<() => void>()

export const getLang = (): Lang => current

export function setCurrentLang(l: Lang): void {
  if (l === current) return
  current = l
  if (typeof document !== 'undefined') document.documentElement.lang = l
  subs.forEach((f) => f())
}

export const subscribeLang = (f: () => void): (() => void) => {
  subs.add(f)
  return () => void subs.delete(f)
}

/** Reaktív nyelv: a komponens újrarajzolódik, ha a nyelv megváltozik. */
export const useCurrentLang = (): Lang => useSyncExternalStore(subscribeLang, getLang, getLang)

/** Nem-React kódban: a magyar vagy az angol változat, az aktuális nyelv szerint. */
export const pick = <T,>(hu: T, en: T): T => (current === 'en' ? en : hu)
