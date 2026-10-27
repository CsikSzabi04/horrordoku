// Globális meghívó-értesítés (jobb felső sarok, minden képernyőn): „Szabj04 meghívott" + Belépés gomb.
// Az App gyökerében él. Élő meghívót a Realtime (onInvite) hoz, a korábban érkezetteket (és a Realtime-kimaradást) a lekérdezés pótolja.
// A `my_invites` a már belépett szobák meghívóját is visszaadja (a sor a belépés után sem törlődik), ezért a tagságra szűrünk.
import { useCallback, useEffect, useState } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudUser } from '../../cloud/hooks'
import { t } from '../../i18n'
import type { RoomInvite } from '../../shared/room'
import { Button, useToast } from '../../ui'
import './invite-banner.css'

const POLL_MS = 30_000
const MAX_SHOWN = 3
const KEY = 'nd_dismissed_invites'

const readDismissed = (): Set<string> => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
const writeDismissed = (s: Set<string>) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    /* tiltott tároló: az elhessentés ebben a lapban így is megmarad (állapot) */
  }
}

export function InviteBanner() {
  const user = useCloudUser()
  const { route, go, replace } = useNav()
  const toast = useToast()
  const [invites, setInvites] = useState<RoomInvite[]>([])
  const [dismissed, setDismissed] = useState(readDismissed)
  const [busy, setBusy] = useState<string | null>(null)
  const userId = user?.id

  const load = useCallback(async (alive: () => boolean) => {
    const [inv, mine] = await Promise.all([cloud.rooms.invites(), cloud.rooms.mine()])
    if (!alive() || !inv.ok) return
    const member = new Set(mine.ok ? mine.value.filter((r) => r.isOwner || r.isMember).map((r) => r.id) : [])
    setInvites(inv.value.filter((i) => !member.has(i.roomId)))
  }, [])

  useEffect(() => {
    if (!userId) {
      setInvites([])
      return
    }
    let live = true
    const alive = () => live
    void load(alive)
    const off = cloud.rooms.onInvite((i) => {
      // élő meghívás: akkor is megjelenik, ha ugyanezt a szobát korábban elhessentetted
      setDismissed((d) => {
        if (!d.has(i.roomId)) return d
        const n = new Set(d)
        n.delete(i.roomId)
        writeDismissed(n)
        return n
      })
      void load(alive)
    })
    const timer = setInterval(() => document.visibilityState !== 'hidden' && void load(alive), POLL_MS)
    return () => {
      live = false
      off()
      clearInterval(timer)
    }
  }, [userId, load])

  const dismiss = (roomId: string) =>
    setDismissed((d) => {
      const n = new Set(d).add(roomId)
      writeDismissed(n)
      return n
    })

  async function join(i: RoomInvite) {
    setBusy(i.roomId)
    const j = await cloud.rooms.join(i.code)
    setBusy(null)
    const target = { name: 'lobby', mode: i.mode } as const
    if (!j.ok) {
      toast(errorText(j)) // zárt / tele / már elindult: a Lobby listája mutatja a szoba állapotát
      dismiss(i.roomId)
      go(target)
      return
    }
    dismiss(i.roomId)
    setInvites((all) => all.filter((x) => x.roomId !== i.roomId))
    const next = { ...target, room: j.value.id }
    if (route.name === 'lobby') replace(next)
    else go(next)
  }

  const shown = invites.filter((i) => !dismissed.has(i.roomId))
  if (!userId || shown.length === 0) return null
  return (
    <div className="nd-invites" role="region" aria-live="polite" aria-label={t('lobby.invites')}>
      {shown.slice(0, MAX_SHOWN).map((i) => (
        <div key={i.roomId} className="nd-invite">
          <span className="nd-invite-ico" aria-hidden="true">
            🕯
          </span>
          <span className="nd-invite-txt">
            <b>{i.fromUsername}</b> {t('lobby.invite.from')}
            <small>{t(`lobby.mode.${i.mode}`)}</small>
          </span>
          <Button size="sm" disabled={busy === i.roomId} onClick={() => void join(i)}>
            {t('lobby.join')}
          </Button>
          <button type="button" className="nd-invite-x" title={t('invite.dismiss')} aria-label={t('invite.dismiss')} onClick={() => dismiss(i.roomId)}>
            ✕
          </button>
        </div>
      ))}
      {shown.length > MAX_SHOWN && <div className="nd-invite-more">+{shown.length - MAX_SHOWN}</div>}
    </div>
  )
}
