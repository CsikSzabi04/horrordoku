import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import type { RouteName } from './routes'
import MenuScreen from '../screens/menu'

/**
 * A képernyők külön csomagokba kerülnek, és csak akkor töltődnek le, amikor kellenek — a főmenü így azonnal megjelenik.
 * Az első kép után a böngésző üresjáratában a többit is előre letöltjük (`prefetchScreens`), így a következő kattintás azonnali.
 *
 * Nem `React.lazy` + `Suspense`: az a már letöltött képernyőnél is egy „tartalék” képkockát mutat, és a React a felfedését ~300 ms-ig
 * visszatartja (villogás-gátló). Itt a letöltött képernyő szinkron, azonnal rajzolódik.
 */
type Loader = () => Promise<{ default: ComponentType }>
const loaders: Record<RouteName, Loader> = {
  menu: () => Promise.resolve({ default: MenuScreen }),
  classic: () => import('../screens/classic'),
  event: () => import('../screens/event'),
  random: () => import('../screens/random'),
  game: () => import('../screens/game'),
  collection: () => import('../screens/collection'),
  settings: () => import('../screens/settings'),
  login: () => import('../screens/login'),
  profile: () => import('../screens/profile'),
  friends: () => import('../screens/friends'),
  lobby: () => import('../screens/lobby'),
  coop: () => import('../screens/coop'),
}

const loaded = new Map<RouteName, ComponentType>([['menu', MenuScreen]])
const pending = new Map<RouteName, Promise<ComponentType | null>>()

/** Egy képernyő csomagjának betöltése (egyszer; hiba esetén a következő híváskor újra próbálja). */
function load(name: RouteName): Promise<ComponentType | null> {
  const known = loaded.get(name)
  if (known) return Promise.resolve(known)
  let p = pending.get(name)
  if (!p) {
    p = loaders[name]()
      .then((m) => {
        loaded.set(name, m.default)
        return m.default
      })
      .catch(() => null)
      .finally(() => pending.delete(name))
    pending.set(name, p)
  }
  return p
}

export const prefetch = (name: RouteName): void => void load(name)

/** Az aktuális útvonal képernyője: letöltve azonnal, különben a letöltés végéig üres, sötét lap. */
export function ScreenOutlet({ name }: { name: RouteName }) {
  const ready = loaded.get(name)
  const [, force] = useState(0)
  useEffect(() => {
    if (ready) return
    let live = true
    void load(name).then(() => live && force((n) => n + 1))
    return () => {
      live = false
    }
  }, [name, ready])
  const Screen = loaded.get(name)
  return Screen ? <Screen /> : <main className="game-msg" aria-busy="true" />
}

/** Az első kép után, a böngésző üresjáratában: a leggyakoribb képernyők sorban (a listák, a játék), majd a többi. */
export function prefetchScreens(): void {
  const order: RouteName[] = ['classic', 'game', 'event', 'random', 'settings', 'lobby', 'login', 'profile', 'friends', 'collection']
  const idle: (cb: () => void) => void = typeof requestIdleCallback === 'function' ? (cb) => requestIdleCallback(cb, { timeout: 3000 }) : (cb) => setTimeout(cb, 1200)
  let i = 0
  const next = () => {
    const name = order[i++]
    if (!name) return
    prefetch(name)
    idle(next)
  }
  idle(next)
}
