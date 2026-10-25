// Barát-link: a profilon megosztható `…/play/?add=<kód>` cím. Megnyitva (bejelentkezve) egyből a Barátok képernyő nyílik, a kódhoz tartozó
// játékossal, akit ott fel lehet venni; kijelentkezve előbb a belépés jön, utána ugyanide ér.
import { useEffect, useRef, useState } from 'react'
import { useNav } from '../../app/nav'
import { useCloudUser } from '../../cloud/hooks'

const KEY = 'nd_pending_add'
const PARAM = 'add'

/** A megosztható link egy barát-kódhoz (az írásjelek kódolva). */
export const friendLink = (code: string): string => `${location.origin}${location.pathname.replace(/index\.html$/, '')}?${PARAM}=${encodeURIComponent(code)}`

/** Vágólapra másol; false, ha a böngésző nem engedi. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const read = (): string | null => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
const write = (code: string | null) => {
  try {
    if (code) sessionStorage.setItem(KEY, code)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* tiltott tároló: a link ebben a lapban így is egyszer működik */
  }
}

/** Van-e a böngészőben mentett Supabase-munkamenet (akkor a belépés nemsokára helyreáll). */
const hasSavedSession = (): boolean => {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch {
    return false
  }
}

/** Kiveszi a `?add=` paramétert a címből (és eltárolja, hogy a belépésen át is megmaradjon). */
function capture(): string | null {
  const params = new URLSearchParams(location.search)
  const code = params.get(PARAM)
  if (code) {
    write(code)
    params.delete(PARAM)
    const rest = params.toString()
    history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`)
    return code
  }
  return read()
}

/** Az alkalmazás gyökerében él: a barát-linkkel érkezőt a Barátok képernyőre (vagy előbb a belépésre) viszi. */
export function AddLinkHandler() {
  const { route, go } = useNav()
  const user = useCloudUser()
  const [pending, setPending] = useState<string | null>(capture)
  const askedLogin = useRef(false)
  const opened = useRef(false)
  useEffect(() => {
    if (!pending || opened.current || route.name !== 'menu') return
    if (user) {
      opened.current = true
      write(null)
      setPending(null)
      go({ name: 'friends', add: pending })
    } else if (!askedLogin.current) {
      // A mentett munkamenet helyreállítása aszinkron: ha van mentett belépés, várunk rá egy kicsit, mielőtt kilépettnek vennénk.
      const id = setTimeout(
        () => {
          askedLogin.current = true // kilépve egyszer visszük a belépésre; ha onnan visszalép, nem erőltetjük
          go({ name: 'login' })
        },
        hasSavedSession() ? 4000 : 0,
      )
      return () => clearTimeout(id)
    }
  }, [pending, user, route.name, go])
  return null
}
