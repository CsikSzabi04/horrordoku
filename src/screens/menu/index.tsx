import { useEffect, useState } from 'react'
import { useNav } from '../../app/nav'
import type { Route } from '../../app/routes'
import { cloud } from '../../cloud'
import { useCloudUser } from '../../cloud/hooks'
import { SignOutButton } from '../../components/SignOutButton'
import { t } from '../../i18n'
import type { I18nKey } from '../../i18n'
import { getStorage } from '../../storage'
import { Button, Chip } from '../../ui'
import './menu.css'

const MODES: { emoji: string; key: 'classic' | 'event' | 'random' | 'together' | 'killer'; route: Route }[] = [
  { emoji: '🕯️', key: 'classic', route: { name: 'classic' } },
  { emoji: '🎬', key: 'event', route: { name: 'event' } },
  { emoji: '🎲', key: 'random', route: { name: 'random' } },
  { emoji: '🤝', key: 'together', route: { name: 'lobby', mode: 'together' } },
  { emoji: '🔪', key: 'killer', route: { name: 'lobby', mode: 'killer' } },
]

function useCloudStatus() {
  const [s, setS] = useState(cloud.status())
  useEffect(() => cloud.onStatus(setS), [])
  return s
}

export default function MenuScreen() {
  const { go } = useNav()
  const status = useCloudStatus()
  const user = useCloudUser()
  const [last, setLast] = useState<string | null>(null)
  useEffect(() => {
    void getStorage().getSessions().then((s) => {
      const newest = Object.entries(s.sessions).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))[0]
      setLast(newest?.[0] ?? null)
    })
  }, [])
  return (
    <main className="menu">
      <header>
        <h1>
          NIGH<span>T</span>DOKU
        </h1>
        <p>{t('app.tagline')}</p>
      </header>
      <nav className="modes" aria-label="Játékmódok">
        {MODES.map((m) => (
          <button key={m.key} type="button" className="mode" onClick={() => go(m.route)}>
            <span className="ico">{m.emoji}</span>
            <strong>{t(`menu.${m.key}` as I18nKey)}</strong>
            <small>{t(`menu.${m.key}.sub` as I18nKey)}</small>
          </button>
        ))}
      </nav>
      <div className="more">
        <a className="nd-btn ghost sm" href="/">
          ⌂ {t('menu.home')}
        </a>
        <Button variant="ghost" size="sm" disabled={!last} onClick={() => last && go({ name: 'game', ref: last })} data-act="continue">
          ▶ {t('menu.continue')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go({ name: 'friends' })}>
          👥 {t('menu.friends')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go({ name: 'profile' })}>
          👤 {t('menu.profile')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go({ name: 'collection' })}>
          📖 {t('menu.collection')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go({ name: 'settings' })}>
          ⚙ {t('menu.settings')}
        </Button>
      </div>
      <footer>
        <Chip dot={status === 'idle' || status === 'syncing'}>{t(`status.${status}` as I18nKey)}</Chip>
        <span className="acct">
          {/* belépve a névre koppintva egyből a profil, kilépve a bejelentkezés nyílik */}
          <button type="button" className="link" data-act="account" onClick={() => go({ name: user ? 'profile' : 'login' })}>
            {user ? user.username : 'Bejelentkezés'}
          </button>
          {user && <SignOutButton />}
        </span>
      </footer>
    </main>
  )
}
