// B3 — belépés / regisztráció / jelszó-visszaállítás (GDD 14.6). A belépés nem kötelező: a vendég-gomb visszaviszi a menübe.
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudUser } from '../../cloud/hooks'
import { t } from '../../i18n'
import { Button, Panel, Tabs, useToast } from '../../ui'
import './form.css'

type Mode = 'in' | 'up' | 'reset'
type Avail = 'idle' | 'checking' | 'free' | 'taken'

export default function LoginScreen() {
  const { back, go } = useNav()
  const toast = useToast()
  const user = useCloudUser()
  const [mode, setMode] = useState<Mode>('in')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [avail, setAvail] = useState<Avail>('idle')

  // Becenév-ellenőrzés a „Regisztráció" gomb előtt (késleltetve, a lassan érkező válasz nem írja felül az újat).
  useEffect(() => {
    const name = username.trim()
    if (mode !== 'up' || name.length < 3 || name.length > 16) {
      setAvail('idle')
      return
    }
    let live = true
    setAvail('checking')
    const timer = setTimeout(() => {
      void cloud.auth.usernameAvailable(name).then((r) => {
        if (live) setAvail(r.ok ? (r.value ? 'free' : 'taken') : 'idle')
      })
    }, 400)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [username, mode])

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (mode === 'reset') {
      setBusy(true)
      const r = await cloud.auth.sendPasswordReset(email.trim())
      setBusy(false)
      if (r.ok) setInfo(t('login.reset.sent'))
      else setError(errorText(r))
      return
    }
    if (password.length < 6) {
      setError(t('err.password'))
      return
    }
    setBusy(true)
    const r =
      mode === 'in'
        ? await cloud.auth.signIn({ email: email.trim(), password })
        : await cloud.auth.signUp({ email: email.trim(), password, username: username.trim() })
    setBusy(false)
    if (!r.ok) {
      setError(errorText(r))
      return
    }
    if (cloud.auth.current()) {
      toast(t('login.welcome'))
      back()
    } else {
      setInfo(t('login.confirm')) // e-mail-megerősítés be van kapcsolva: még nincs munkamenet
    }
  }

  if (user) {
    return (
      <main className="nd-page">
        <Panel tag={t('login.tag')}>
          <p>
            {t('login.already')} <b>{user.username}</b>
          </p>
          <div className="nd-row">
            <Button onClick={() => go({ name: 'profile' })}>{t('profile.title')}</Button>
            <Button variant="ghost" onClick={back}>
              ← {t('common.back')}
            </Button>
          </div>
        </Panel>
      </main>
    )
  }

  const hint = avail === 'checking' ? t('login.checking') : avail === 'free' ? t('login.free') : avail === 'taken' ? t('login.taken') : ''
  return (
    <main className="nd-page">
      <Panel tag={t('login.tag')}>
        {mode === 'reset' ? (
          <h2 style={{ margin: '0 0 .8rem', fontFamily: 'var(--display)' }}>{t('login.reset.title')}</h2>
        ) : (
          <Tabs
            tabs={[
              { id: 'in', label: t('login.tab.in') },
              { id: 'up', label: t('login.tab.up') },
            ]}
            value={mode}
            onChange={switchMode}
          />
        )}
        <form className="nd-form" onSubmit={(e) => void submit(e)} noValidate>
          {mode === 'up' && (
            <label className="nd-field">
              {t('login.username')}
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" minLength={3} maxLength={16} required />
              <small className={avail === 'free' ? 'ok' : avail === 'taken' ? 'bad' : undefined}>{hint}</small>
            </label>
          )}
          <label className="nd-field">
            {t('login.email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          {mode !== 'reset' && (
            <label className="nd-field">
              {t('login.password')}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required />
            </label>
          )}
          <p className="nd-err" role="alert">
            {error}
          </p>
          {info && <p className="nd-info">{info}</p>}
          <div className="nd-row">
            <Button type="submit" disabled={busy || avail === 'taken'}>
              {mode === 'reset' ? t('login.reset.send') : mode === 'in' ? t('login.submit.in') : t('login.submit.up')}
            </Button>
            {mode === 'in' && (
              <button type="button" className="nd-link" onClick={() => switchMode('reset')}>
                {t('login.forgot')}
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" className="nd-link" onClick={() => switchMode('in')}>
                ← {t('common.back')}
              </button>
            )}
          </div>
        </form>
        <div className="nd-or">{t('login.or')}</div>
        <Button variant="ghost" size="sm" onClick={back} style={{ marginTop: '.8rem' }}>
          {t('login.guest')}
        </Button>
      </Panel>
    </main>
  )
}
