import { useEffect } from 'react'
import { setCurrentLang, useCurrentLang } from '../i18n/lang'
import { getStorage } from '../storage'
import { ToastProvider } from '../ui'
import { ErrorBoundary } from './ErrorBoundary'
import { NavProvider, useNav } from './nav'
import { AddLinkHandler } from '../screens/friends/addLink'
import { InviteBanner } from '../screens/lobby/InviteBanner'
import { prefetchScreens, ScreenOutlet } from './screens'

function Shell() {
  const { route } = useNav()
  return <ScreenOutlet name={route.name} />
}

/** A nyelv a beállításokból (helyi tároló, bejelentkezve a felhő-profillal szinkronban): induláskor betölti és követi a változást. */
function useLanguageSync(): void {
  useEffect(() => {
    const load = () => void getStorage().getSettings().then((st) => setCurrentLang(st.language))
    load()
    return getStorage().onChange((e) => e.type === 'settings' && load())
  }, [])
}

export default function App() {
  useLanguageSync()
  useEffect(prefetchScreens, [])
  useCurrentLang() // a nyelvváltáskor az egész fa újrarajzolódik, hogy a t() hívások az új nyelvet adják
  return (
    <ErrorBoundary>
      <ToastProvider>
        <NavProvider>
          <AddLinkHandler />
          <InviteBanner />
          <Shell />
        </NavProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
