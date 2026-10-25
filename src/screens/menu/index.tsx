import { useEffect, useState } from 'react'
import { useNav } from '../../app/nav'
import type { Route } from '../../app/routes'
import { cloud } from '../../cloud'
import { t } from '../../i18n'
import type { I18nKey } from '../../i18n'
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
        <Button variant="ghost" size="sm" disabled>
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
        <button type="button" className="link" onClick={() => go({ name: 'login' })}>
          {cloud.auth.current() ? cloud.auth.current()!.username : 'Bejelentkezés'}
        </button>
      </footer>
    </main>
  )
}
