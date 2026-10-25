// B4 — Lobby (GDD 14.10): szoba létrehozása / belépés kóddal / meghívók; a szobában tagok, chat, barátok meghívása, indítás (host).
// A közös tábla (Együtt) és a Gyilkos-szerepek a B5/B6-ban érkeznek; az indítás addig csak a szoba állapotát váltja `playing`-re.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { useCloudUser } from '../../cloud/hooks'
import { content } from '../../content'
import { t } from '../../i18n'
import type { Result } from '../../shared/base'
import type { FriendRow } from '../../shared/cloud'
import type { ChatMessage, RoomInfo, RoomInvite, RoomMember, RoomMode, RoomSession } from '../../shared/room'
import { Avatar, Button, Panel, useToast } from '../../ui'
import '../login/form.css'
import '../friends/social.css'

const emoji = (id: string) => content.characters().find((c) => c.id === id)?.emoji
const modeName = (m: RoomMode) => t(`lobby.mode.${m}`)

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
  if (session) return <Room session={session} meId={user.id} onLeft={() => setSession(null)} />
  return <Entry mode={mode} onOpen={setSession} />
}

function Entry({ mode, onOpen }: { mode: RoomMode; onOpen: (s: RoomSession) => void }) {
  const { back, go } = useNav()
  const [invites, setInvites] = useState<RoomInvite[]>([])
  const [refs, setRefs] = useState<{ id: string; title: string }[]>([])
  const [puzzle, setPuzzle] = useState('classic-01-midnight-mass')
  const [max, setMax] = useState(mode === 'killer' ? 4 : 2)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    void content.puzzles().then((p) => {
      if (!live || p.length === 0) return
      setRefs(p.map((x) => ({ id: x.id, title: x.title })))
      setPuzzle((cur) => (p.some((x) => x.id === cur) ? cur : p[0]!.id))
    })
    const load = () => void cloud.rooms.invites().then((r) => live && r.ok && setInvites(r.value))
    load()
    const off = cloud.rooms.onInvite(() => load())
    return () => {
      live = false
      off()
    }
  }, [])

  async function enter(room: Promise<Result<RoomInfo>>) {
    setBusy(true)
    setError('')
    const made = await room
    if (!made.ok) {
      setBusy(false)
      setError(errorText(made))
      return
    }
    const opened = await cloud.rooms.open(made.value.id)
    setBusy(false)
    if (opened.ok) onOpen(opened.value)
    else setError(errorText(opened))
  }

  const maxOptions = mode === 'killer' ? [3, 4, 5, 6] : [2, 3, 4]
  const create = (e: FormEvent) => {
    e.preventDefault()
    void enter(cloud.rooms.create({ mode, puzzleRef: puzzle, maxPlayers: max }))
  }
  const join = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) void enter(cloud.rooms.join(code))
  }

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={back}>
            ← {t('common.back')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => go({ name: 'friends' })}>
            👥 {t('friends.title')}
          </Button>
        </div>
        <Panel tag={`${t('lobby.title').toUpperCase()} · ${modeName(mode).toUpperCase()}`}>
          <p className="nd-err" role="alert">
            {error}
          </p>
          {invites.length > 0 && (
            <section className="nd-sec">
              <h3>{t('lobby.invites')}</h3>
              <ul className="nd-people">
                {invites.map((i) => (
                  <li key={i.roomId} className="nd-person">
                    <span className="nd-person-name">
                      {i.fromUsername} <small>{t('lobby.invite.from')} · {modeName(i.mode)}</small>
                    </span>
                    <Button size="sm" disabled={busy} onClick={() => void enter(cloud.rooms.join(i.code))}>
                      {t('lobby.join')}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="nd-cols">
            <section className="nd-sec">
              <h3>{t('lobby.createTitle')}</h3>
              <form className="nd-form" onSubmit={create}>
                <label className="nd-field">
                  {t('lobby.puzzle')}
                  {refs.length > 0 ? (
                    <select value={puzzle} onChange={(e) => setPuzzle(e.target.value)}>
                      {refs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={puzzle} onChange={(e) => setPuzzle(e.target.value)} />
                  )}
                </label>
                <label className="nd-field">
                  {t('lobby.players')}
                  <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
                    {maxOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="nd-row">
                  <Button type="submit" disabled={busy}>
                    {t('lobby.create')}
                  </Button>
                </div>
              </form>
            </section>
            <section className="nd-sec">
              <h3>{t('lobby.joinTitle')}</h3>
              <form className="nd-form" onSubmit={join}>
                <label className="nd-field">
                  {t('lobby.joinCode')}
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoComplete="off" style={{ textTransform: 'uppercase', letterSpacing: '.3em' }} />
                </label>
                <div className="nd-row">
                  <Button type="submit" disabled={busy || code.trim().length < 6}>
                    {t('lobby.join')}
                  </Button>
                </div>
              </form>
            </section>
          </div>
          <p className="nd-note">{t('lobby.ageNote')}</p>
        </Panel>
      </div>
    </main>
  )
}

function Room({ session, meId, onLeft }: { session: RoomSession; meId: string; onLeft: () => void }) {
  const toast = useToast()
  const [info, setInfo] = useState<RoomInfo>(session.info())
  const [members, setMembers] = useState<RoomMember[]>(session.members())
  const [messages, setMessages] = useState<ChatMessage[]>(session.chat.history())
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const offs = [
      session.onInfo(setInfo),
      session.onMembers(setMembers),
      session.chat.onMessage(() => setMessages(session.chat.history())),
    ]
    return () => offs.forEach((off) => off())
  }, [session])

  const loadFriends = useCallback(() => void cloud.friends.list().then((r) => r.ok && setFriends(r.value.filter((f) => f.status === 'accepted'))), [])
  useEffect(loadFriends, [loadFriends])
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [messages])

  const isHost = info.hostId === meId
  const memberIds = new Set(members.map((m) => m.userId))
  const invitable = friends.filter((f) => !memberIds.has(f.id))
  const playing = info.status !== 'lobby'

  async function send(e: FormEvent) {
    e.preventDefault()
    setError('')
    const r = await session.chat.send(text)
    if (r.ok) setText('')
    else setError(errorText(r))
  }
  async function start() {
    setError('')
    const r = await session.start()
    if (!r.ok) setError(errorText(r))
  }
  async function leave() {
    const r = await session.leave()
    if (r.ok) onLeft()
    else setError(errorText(r))
  }
  async function report(messageId: number) {
    const r = await session.chat.report(messageId)
    if (r.ok) toast(t('lobby.reported'))
    else setError(errorText(r))
  }
  async function mute(userId: string) {
    const r = await session.chat.mute(userId)
    if (r.ok) {
      setMessages(session.chat.history()) // a némított játékos üzenetei eltűnnek
      toast(t('lobby.muted'))
    } else setError(errorText(r))
  }
  async function invite(id: string) {
    const r = await cloud.rooms.invite(info.id, id)
    if (r.ok) toast(t('lobby.invited'))
    else setError(errorText(r))
  }

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <Panel tag={`${t('lobby.title').toUpperCase()} · ${modeName(info.mode).toUpperCase()}`}>
          <div className="nd-row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="nd-note">{t('lobby.code')}</div>
              <div className="nd-code" aria-label={t('lobby.code')}>
                {info.code}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void leave()}>
              {t('lobby.leave')}
            </Button>
          </div>
          <p className="nd-err" role="alert">
            {error}
          </p>
          <div className="nd-cols">
            <section className="nd-sec">
              <h3>
                {t('lobby.members')} ({members.length}/{info.maxPlayers})
              </h3>
              <ul className="nd-people">
                {members.map((m) => (
                  <li key={m.userId} className="nd-person" style={{ borderColor: m.color }}>
                    <Avatar id={m.avatar} emoji={emoji(m.avatar)} size="2.2rem" />
                    <span className="nd-person-name">
                      <i className={m.online ? 'nd-dot-on on' : 'nd-dot-on'} />
                      {m.username} {m.userId === info.hostId && <small>{t('lobby.host')}</small>}
                    </span>
                  </li>
                ))}
              </ul>
              {playing ? (
                <p className="nd-info">{t('lobby.playing')}</p>
              ) : isHost ? (
                <div className="nd-row" style={{ marginTop: '.8rem' }}>
                  <Button disabled={members.length < 2} onClick={() => void start()}>
                    {t('lobby.start')}
                  </Button>
                  {members.length < 2 && <span className="nd-note">{t('lobby.needTwo')}</span>}
                </div>
              ) : (
                <p className="nd-note">{t('lobby.hostOnly')}</p>
              )}
              {!playing && (
                <>
                  <h3 style={{ marginTop: '1.2rem' }}>{t('lobby.inviteFriends')}</h3>
                  {invitable.length === 0 ? (
                    <p className="nd-note">{t('lobby.noFriends')}</p>
                  ) : (
                    <ul className="nd-people">
                      {invitable.map((f) => (
                        <li key={f.id} className="nd-person">
                          <Avatar id={f.avatar} emoji={emoji(f.avatar)} size="2rem" />
                          <span className="nd-person-name">{f.username}</span>
                          <Button size="sm" variant="ghost" onClick={() => void invite(f.id)}>
                            {t('lobby.invite')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
            <section className="nd-sec nd-chat">
              <h3>{t('lobby.chat')}</h3>
              <div className="nd-chat-log" ref={log} aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className="nd-msg">
                    <span>
                      <b style={{ color: members.find((x) => x.userId === m.userId)?.color }}>{m.username}</b>
                      {m.body}
                    </span>
                    {m.userId !== meId && (
                      <span className="nd-msg-act">
                        <button type="button" className="nd-link" title={t('lobby.report')} aria-label={t('lobby.report')} onClick={() => void report(m.id)}>
                          ⚑
                        </button>
                        <button type="button" className="nd-link" title={t('lobby.mute')} aria-label={t('lobby.mute')} onClick={() => void mute(m.userId)}>
                          🔇
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => void send(e)}>
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('lobby.chat.placeholder')} autoComplete="off" />
                <Button type="submit" size="sm" disabled={!text.trim()}>
                  {t('lobby.chat.send')}
                </Button>
              </form>
              <p className="nd-note">{t('lobby.ageNote')}</p>
            </section>
          </div>
        </Panel>
      </div>
    </main>
  )
}
