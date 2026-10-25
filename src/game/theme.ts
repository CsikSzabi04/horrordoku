import { useSyncExternalStore } from 'react'

/**
 * A Klasszikus játék „sötét mód" kapcsolója: alapból a keret fekete (mint az app többi része) és a játék maga fehér;
 * a kapcsolóval a játék is sötét lesz. Per-böngésző kényelmi érték (localStorage), a lista és a játékképernyő közös.
 */
const KEY = 'nd_gamedark'
const read = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
let dark = read()
const subs = new Set<() => void>()

export function setGameDark(v: boolean): void {
  dark = v
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* tiltott tároló: csak az oldal életére érvényes */
  }
  subs.forEach((cb) => cb())
}

export function useGameDark(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => dark,
  )
  return [v, setGameDark]
}
