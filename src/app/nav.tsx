import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Route } from './routes'

interface Nav {
  route: Route
  go: (r: Route) => void
  /** Az aktuális útvonal cseréje (a „Folytatás” a következő pályára lép, a „vissza” így a listához visz). */
  replace: (r: Route) => void
  back: () => void
}
const NavCtx = createContext<Nav>({ route: { name: 'menu' }, go: () => undefined, replace: () => undefined, back: () => undefined })
export const useNav = () => useContext(NavCtx)

/** Egyszerű, függőség nélküli navigáció: egy előzmény-verem. */
export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'menu' }])
  const value: Nav = {
    route: stack[stack.length - 1]!,
    go: (r) => setStack((s) => [...s, r]),
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
  }
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}
