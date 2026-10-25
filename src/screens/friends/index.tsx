// B4 — Barátok (GDD 14.9): profil-keresés (300 ms debounce, min. 2 karakter), beérkező/elküldött kérések, barátlista; élő frissítés Realtime-mal.
import { useCallback, useEffect, useState } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudUser } from '../../cloud/hooks'
import { content } from '../../content'
import { t } from '../../i18n'
import type { Result } from '../../shared/base'
import type { FriendRow } from '../../shared/cloud'
import { Avatar, Button, Panel, useToast } from '../../ui'
import '../login/form.css'
import './social.css'

type Person = { id: string; username: string; avatar: string; xp: number }
const emoji = (id: string) => content.characters().find((c) => c.id === id)?.emoji

function Row({ p, online, children }: { p: Person; online?: boolean; children?: React.ReactNode }) {
  return (
    <li className="nd-person">
      <Avatar id={p.avatar} emoji={emoji(p.avatar)} size="2.4rem" />
      <span className="nd-person-name">
        {online !== undefined && <i className={online ? 'nd-dot-on on' : 'nd-dot-on'} title={online ? t('friends.online') : t('friends.offline')} />}
        {p.username} <small>{p.xp} XP</small>
      </span>
      <span className="nd-row">{children}</span>
    </li>
  )
}

export default function FriendsScreen() {
  const { back, go } = useNav()
  const user = useCloudUser()
  if (!user) {
    return (
      <main className="nd-page">
        <Panel tag={t('friends.title').toUpperCase()}>
          <p>{t('friends.guest')}</p>
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
  return <Signed />
}

function Signed() {
  const { back } = useNav()
  const toast = useToast()
  const [rows, setRows] = useState<FriendRow[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await cloud.friends.list()
    if (r.ok) setRows(r.value)
    else setError(errorText(r))
  }, [])

  useEffect(() => {
    void load()
    return cloud.friends.onChange(() => void load()) // új kérés / elfogadás élőben
  }, [load])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    let live = true
    const timer = setTimeout(() => {
      void cloud.friends.search(q).then((r) => {
        if (!live) return
        setSearched(true)
        if (r.ok) setResults(r.value)
        else setError(errorText(r))
      })
    }, 300)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [query])

  /** Végrehajt egy műveletet; siker esetén újratölti a listát. */
  async function act(fn: () => Promise<Result<unknown>>): Promise<boolean> {
    setError('')
    const r = await fn()
    if (!r.ok) {
      setError(errorText(r))
      return false
    }
    await load()
    return true
  }

  const known = new Set(rows.map((r) => r.id))
  const incoming = rows.filter((r) => r.status === 'pending' && !r.requestedByMe)
  const outgoing = rows.filter((r) => r.status === 'pending' && r.requestedByMe)
  const friends = rows.filter((r) => r.status === 'accepted')

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={back}>
            ← {t('common.back')}
          </Button>
        </div>
        <Panel tag={t('friends.title').toUpperCase()}>
          <label className="nd-field">
            {t('friends.search')}
            <input value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          </label>
          <p className="nd-err" role="alert">
            {error}
          </p>
          {searched && (
            <section className="nd-sec">
              <h3>{t('friends.results')}</h3>
              {results.length === 0 ? (
                <p className="nd-note">{t('friends.noResults')}</p>
              ) : (
                <ul className="nd-people">
                  {results.map((p) => (
                    <Row key={p.id} p={p}>
                      {known.has(p.id) ? (
                        <span className="nd-note">{t('friends.requested')}</span>
                      ) : (
                        <Button size="sm" onClick={() => void act(() => cloud.friends.request(p.id)).then((done) => done && toast(t('friends.requested')))}>
                          {t('friends.add')}
                        </Button>
                      )}
                    </Row>
                  ))}
                </ul>
              )}
            </section>
          )}
          {incoming.length > 0 && (
            <section className="nd-sec">
              <h3>{t('friends.incoming')}</h3>
              <ul className="nd-people">
                {incoming.map((p) => (
                  <Row key={p.id} p={p}>
                    <Button size="sm" onClick={() => void act(() => cloud.friends.respond(p.id, true))}>
                      {t('friends.accept')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void act(() => cloud.friends.respond(p.id, false))}>
                      {t('friends.decline')}
                    </Button>
                  </Row>
                ))}
              </ul>
            </section>
          )}
          {outgoing.length > 0 && (
            <section className="nd-sec">
              <h3>{t('friends.outgoing')}</h3>
              <ul className="nd-people">
                {outgoing.map((p) => (
                  <Row key={p.id} p={p}>
                    <Button size="sm" variant="ghost" onClick={() => void act(() => cloud.friends.remove(p.id))}>
                      {t('friends.cancel')}
                    </Button>
                  </Row>
                ))}
              </ul>
            </section>
          )}
          <section className="nd-sec">
            <h3>{t('friends.list')}</h3>
            {friends.length === 0 ? (
              <p className="nd-note">{t('friends.empty')}</p>
            ) : (
              <ul className="nd-people">
                {friends.map((p) => (
                  <Row key={p.id} p={p} online={p.online}>
                    <Button size="sm" variant="ghost" onClick={() => void act(() => cloud.friends.remove(p.id))}>
                      {t('friends.remove')}
                    </Button>
                  </Row>
                ))}
              </ul>
            )}
          </section>
        </Panel>
      </div>
    </main>
  )
}
