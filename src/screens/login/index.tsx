// B3 — belépés / regisztráció / jelszó-visszaállítás (GDD 14.6). A belépés nem kötelező: a vendég-gomb visszaviszi a menübe.
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudUser } from '../../cloud/hooks'
import { t } from '../../i18n'
import { Button, Modal, Panel, Tabs, useToast } from '../../ui'
import './form.css'

type Mode = 'in' | 'up' | 'reset'
type Avail = 'idle' | 'checking' | 'free' | 'taken'

/** Melyik fiókoknál kérdeztük már meg, hogy átvigyük-e a vendég-haladást (egyszer kérdezünk). */
const OFFERED = 'nd_guest_offered'
const offeredIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(OFFERED) ?? '[]') as string[]
  } catch {
    return []
  }
}
const wasOffered = (id: string) => offeredIds().includes(id)
const markOffered = (id: string) => {
  try {
    localStorage.setItem(OFFERED, JSON.stringify([...new Set([...offeredIds(), id])]))
  } catch {
    /* tiltott tároló: legfeljebb újra megkérdezzük */
  }
}

export default function LoginScreen() {
  const { back, replace } = useNav()
  const toast = useToast()
  const user = useCloudUser()
  const [mode, setMode] = useState<Mode>('in')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [avail, setAvail] = useState<Avail>('idle')
  const [ask, setAsk] = useState<string | null>(null) // a vendég-átvitel kérdése (a belépett fiók azonosítójával)

  // Már belépve nincs mit itt kezdeni: egyből a profil (a „vissza” így a korábbi képernyőre visz) — akkor is, ha a mentett munkamenet csak most áll helyre.
  // A most, ezen a képernyőn induló belépést a `submit` / `answer` fejezi be (értesítés, vendég-átvitel kérdése, `back()`).
  const inFlow = useRef(false)
  useEffect(() => {
    if (user && !inFlow.current) replace({ name: 'profile' })
  }, [user, replace])

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
    inFlow.current = true
    const r =
      mode === 'in'
        ? await cloud.auth.signIn({ email: email.trim(), password })
        : await cloud.auth.signUp({ email: email.trim(), password, username: username.trim() })
    setBusy(false)
    if (!r.ok) {
      setError(errorText(r))
      return
    }
    const me = cloud.auth.current()
    if (me) {
      // Van vendégként szerzett haladás? Egyszer megkérdezzük, hogy átvigye-e a fiókba (GDD 14.6).
      if (!wasOffered(me.id) && (await cloud.sync.guestData())) {
        setAsk(me.id)
        return
      }
      toast(t('login.welcome'))
      back()
    } else {
      setInfo(t('login.confirm')) // e-mail-megerősítés be van kapcsolva: még nincs munkamenet
    }
  }

  async function answer(yes: boolean) {
    const id = ask
    setAsk(null)
    if (!id) return
    markOffered(id)
    if (yes) {
      const r = await cloud.sync.transferGuest()
      if (!r.ok) {
        setError(errorText(r))
        return
      }
      toast(t('login.transferred'))
    } else toast(t('login.welcome'))
    back()
  }
  const transferModal = (
    <Modal open={ask !== null} onClose={() => void answer(false)}>
      <p>{t('login.transfer.ask')}</p>
      <div className="nd-row">
        <Button size="sm" onClick={() => void answer(true)}>
          {t('login.transfer.yes')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void answer(false)}>
          {t('login.transfer.no')}
        </Button>
      </div>
    </Modal>
  )

  // Belépés után nincs köztes „már be vagy lépve” oldal: a folyamat (vendég-átvitel kérdése, értesítés) a háttérben fut, a végén a `back()` visz tovább.
  if (user) return <main className="nd-page">{transferModal}</main>

  const hint = avail === 'checking' ? t('login.checking') : avail === 'free' ? t('login.free') : avail === 'taken' ? t('login.taken') : ''
  return (
    <main className="nd-page">
      {transferModal}
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
              <span className="nd-pass">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required />
                <button type="button" className="nd-eye" data-act="show-password" aria-pressed={showPw} aria-label={t(showPw ? 'login.hide' : 'login.show')} title={t(showPw ? 'login.hide' : 'login.show')} onClick={() => setShowPw((v) => !v)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPw && <path d="M3 3l18 18" />}
                  </svg>
                </button>
              </span>
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
