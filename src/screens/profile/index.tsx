// B3 — Profil (GDD 14.7): fejléc (avatár, rang, XP), fülek; az Áttekintés és a Fiók él, a többi a szinkron/mentés után jön.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudStatus, useCloudUser } from '../../cloud/hooks'
import { content } from '../../content'
import { t } from '../../i18n'
import type { Profile, ProfileStats } from '../../shared/cloud'
import { Avatar, Button, Chip, Modal, Panel, ProgressBar, Tabs, useToast } from '../../ui'
import '../login/form.css'
import { hoursMinutes, rankOf } from './rank'

type Tab = 'overview' | 'cases' | 'collection' | 'achievements' | 'account'

export default function ProfileScreen() {
  const { back, go } = useNav()
  const user = useCloudUser()

  if (!user) {
    return (
      <main className="nd-page">
        <Panel tag={t('profile.title').toUpperCase()}>
          <p>{t('profile.guest')}</p>
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
  return <Signed userId={user.id} />
}

function Signed({ userId }: { userId: string }) {
  const { back, go } = useNav()
  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    void (async () => {
      const [p, s] = await Promise.all([cloud.profile.get(), cloud.profile.stats()])
      if (!live) return
      if (p.ok) setProfile(p.value)
      else setError(errorText(p))
      if (s.ok) setStats(s.value)
    })()
    return () => {
      live = false
    }
  }, [userId])

  const avatar = content.characters().find((c) => c.id === profile?.avatar)
  const rank = rankOf(profile?.xp ?? 0)

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={back}>
            ← {t('common.back')}
          </Button>
        </div>
        <Panel tag={t('profile.title').toUpperCase()}>
          {!profile ? (
            <p className={error ? 'nd-err' : undefined}>{error || t('profile.loading')}</p>
          ) : (
            <div className="nd-pf-head">
              <Avatar id={profile.avatar} emoji={avatar?.emoji} size="4.5rem" />
              <div>
                <h2>{profile.username}</h2>
                <p>
                  {t('profile.rank')}: <b>{t(`rank.${rank.id}`)}</b> · {t('profile.joined')}: {profile.createdAt.slice(0, 10)}
                </p>
                <ProgressBar value={profile.xp - rank.min} max={rank.next === null ? 1 : rank.next - rank.min} />
                <p>
                  XP {profile.xp}
                  {rank.next !== null && ` / ${rank.next}`} · 💀 {profile.coins} {t('profile.coins')} · 🔥 {profile.streak} {t('profile.streak')} ({t('profile.best')}: {profile.bestStreak})
                </p>
              </div>
            </div>
          )}
        </Panel>
        <Tabs
          tabs={[
            { id: 'overview', label: t('profile.tab.overview') },
            { id: 'cases', label: t('profile.tab.cases') },
            { id: 'collection', label: t('profile.tab.collection') },
            { id: 'achievements', label: t('profile.tab.achievements') },
            { id: 'account', label: t('profile.tab.account') },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Panel>
          {tab === 'overview' && <Overview stats={stats} />}
          {(tab === 'cases' || tab === 'achievements') && <p>{t('profile.soon')}</p>}
          {tab === 'collection' && <Button onClick={() => go({ name: 'collection' })}>{t('profile.openCollection')}</Button>}
          {tab === 'account' && profile && <Account profile={profile} onProfile={setProfile} />}
        </Panel>
      </div>
    </main>
  )
}

function Overview({ stats }: { stats: ProfileStats | null }) {
  if (!stats) return <p>{t('profile.loading')}</p>
  const { h, m } = hoursMinutes(stats.playTimeMs)
  const rows: [string, string | number][] = [
    [t('stats.solved'), stats.solvedTotal],
    [t('stats.noHints'), stats.solvedNoHints],
    [t('stats.jumpscares'), stats.jumpscares],
    [t('stats.playTime'), `${h} ${t('time.h')} ${m} ${t('time.m')}`],
    [t('stats.coop'), stats.coopGames],
    [t('stats.killerWins'), stats.winsAsKiller],
    [t('stats.detectiveWins'), stats.winsAsDetective],
  ]
  return (
    <>
      <h3 style={{ margin: '0 0 .6rem', fontFamily: 'var(--display)' }}>{t('stats.title')}</h3>
      <ul className="nd-stats">
        {rows.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </li>
        ))}
      </ul>
    </>
  )
}

function Account({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const toast = useToast()
  const status = useCloudStatus()
  const [name, setName] = useState(profile.username)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save(patch: { username?: string; avatar?: string }) {
    setBusy(true)
    setError('')
    const r = await cloud.profile.update(patch)
    setBusy(false)
    if (r.ok) {
      onProfile(r.value)
      toast(t('account.saved'))
    } else setError(errorText(r))
  }
  const rename = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim() !== profile.username) void save({ username: name.trim() })
  }
  /** A felhős adatok letöltése egy JSON-fájlban (GDD 18.5). */
  async function exportCloud() {
    setError('')
    const r = await cloud.profile.exportData()
    if (!r.ok) {
      setError(errorText(r))
      return
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.value, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nightdoku-fiok-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  async function removeAccount() {
    setConfirmDelete(false)
    setBusy(true)
    const r = await cloud.profile.deleteAccount()
    setBusy(false)
    if (r.ok) toast(t('account.deleted'))
    else setError(errorText(r))
  }

  return (
    <div className="nd-form" style={{ width: 'auto' }}>
      <form className="nd-form" onSubmit={rename} noValidate style={{ width: 'auto' }}>
        <label className="nd-field">
          {t('account.username')}
          <input value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={16} autoComplete="username" />
        </label>
        <p className="nd-err" role="alert">
          {error}
        </p>
        <div className="nd-row">
          <Button type="submit" size="sm" disabled={busy}>
            {t('account.save')}
          </Button>
        </div>
      </form>
      <div className="nd-field">
        {t('account.avatar')}
        <div className="nd-avatars">
          {content.characters().map((c) => (
            <button key={c.id} type="button" title={c.name} aria-pressed={c.id === profile.avatar} disabled={busy} onClick={() => void save({ avatar: c.id })}>
              <Avatar id={c.id} emoji={c.emoji} size="3rem" />
            </button>
          ))}
        </div>
      </div>
      <div className="nd-row">
        {t('account.sync')}: <Chip dot={status === 'idle'}>{t(`status.${status}`)}</Chip>
      </div>
      <div className="nd-row">
        <Button variant="ghost" size="sm" onClick={() => void cloud.auth.signOut().then(() => toast(t('account.signedout')))}>
          {t('account.signout')}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void exportCloud()}>
          {t('account.export')}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmDelete(true)}>
          {t('account.delete')}
        </Button>
      </div>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p>{t('account.delete.ask')}</p>
        <div className="nd-row">
          <Button size="sm" onClick={() => void removeAccount()}>
            {t('account.delete.yes')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            {t('settings.clear.no')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
