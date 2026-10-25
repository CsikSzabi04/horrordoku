// B4 — Lobby (GDD 14.10, 0005): tartós szobák. A lista (saját / mások szobái, statisztika) és a szoba belseje külön nézet.
// A szoba nem szűnik meg a kilépéssel: a „← Vissza a szobákhoz" csak lezárja a kapcsolatot, a tagság és a szoba megmarad.
import { useState } from 'react'
import { useNav } from '../../app/nav'
import { useCloudUser } from '../../cloud/hooks'
import { t } from '../../i18n'
import type { RoomMode, RoomSession } from '../../shared/room'
import { Button, Panel } from '../../ui'
import '../login/form.css'
import { RoomList } from './RoomList'
import { RoomView } from './RoomView'

export default function LobbyScreen() {
  const { route, back, go } = useNav()
  const mode: RoomMode = route.name === 'lobby' && route.mode ? route.mode : 'together'
  const user = useCloudUser()
  const [session, setSession] = useState<RoomSession | null>(null)

  if (!user) {
    return (
      <main className="nd-page">
        <Panel tag={t('lobby.title').toUpperCase()}>
          <p>{t('lobby.guest')}</p>
          <div className="nd-row">
            <Button onClick={() => go({ name: 'login' })}>{t('profile.signin')}</Button>
            <Button variant="ghost" onClick={back}>
              ← {t('common.back')}
            </Button>
          </div>
        </Panel>
      </main>
    )
  }
  const close = () => {
    session?.close()
    setSession(null)
  }
  if (session) return <RoomView session={session} meId={user.id} onBack={close} onGone={close} />
  return <RoomList mode={mode} onOpen={setSession} />
}
