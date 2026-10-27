// Egy szoba belseje (lobby): tagok, chat, barátok meghívása; a tulajdonosnak ajtó-nyitás, beállítás, indítás, törlés, statisztika.
// A közös tábla (Együtt: B5, Gyilkos: B6 — a szabályok a szerveren futnak) a `screens/coop/CoopGame`-ben él; a Gyilkos-szabályokat (idő, életek, képességek…) a tulajdonos itt állítja.
import { useCallback, useEffect, useRef, useState } from 'react'
import { puzzleTitle } from '../../content/localize'
import type { FormEvent } from 'react'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { content } from '../../content'
import { listPuzzles } from '../../content/catalog'
import { t } from '../../i18n'
import type { FriendRow } from '../../shared/cloud'
import type { ChatMessage, RoomInfo, RoomMember, RoomSession, RoomSettings } from '../../shared/room'
import { Avatar, Button, Chip, Modal, Panel, useToast } from '../../ui'
import '../login/form.css'
import '../friends/social.css'
import { CoopGame } from '../coop/CoopGame'
import { KillerRules, defaultKillerSettings } from './KillerRules'
import { MemberMenu } from './MemberMenu'
import { StatsBlock } from './StatsBlock'

const emoji = (id: string) => content.characters().find((c) => c.id === id)?.emoji

export function RoomView({ session, meId, onBack, onGone }: { session: RoomSession; meId: string; onBack: () => void; onGone: () => void }) {
  const toast = useToast()
  const [info, setInfo] = useState<RoomInfo>(session.info())
  const [members, setMembers] = useState<RoomMember[]>(session.members())
  const [messages, setMessages] = useState<ChatMessage[]>(session.chat.history())
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [refs, setRefs] = useState<{ id: string; title: string; diff: number }[]>([])
  const [rules, setRules] = useState<RoomSettings>(info.settings)
  const [text, setText] = useState('')
  const [name, setName] = useState(info.name)
  const [puzzle, setPuzzle] = useState(info.puzzleRef)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [statsKey, setStatsKey] = useState(0)
  const [mutedIds, setMutedIds] = useState(() => new Set(session.chat.muted()))
  const [menu, setMenu] = useState<{ userId: string; x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const log = useRef<HTMLDivElement>(null)
  const killerMode = info.mode === 'killer'
  // a közös játék a szobából indul; a „← Vissza” csak a szoba nézetére visz, a játék a szobában marad
  const [inGame, setInGame] = useState(info.status === 'playing')
  useEffect(() => {
    if (info.status === 'playing') setInGame(true)
  }, [info.status])

  useEffect(() => {
    const offs = [
      session.onInfo((i) => {
        setInfo(i)
        setRules(i.settings)
        setStatsKey((k) => k + 1)
      }),
      session.onMembers(setMembers),
      session.chat.onMessage(() => setMessages(session.chat.history())),
    ]
    return () => offs.forEach((off) => off())
  }, [session])

  const loadFriends = useCallback(() => void cloud.friends.list().then((r) => r.ok && setFriends(r.value.filter((f) => f.status === 'accepted'))), [])
  useEffect(loadFriends, [loadFriends])
  useEffect(() => {
    const p = listPuzzles()
    if (p.length > 0) setRefs(p.map((x) => ({ id: x.id, title: `${puzzleTitle(x)} · ${x.size}×${x.size} · ${'★'.repeat(x.difficulty)}`, diff: x.difficulty })))
  }, [])
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [messages])

  const isOwner = info.hostId === meId
  const memberIds = new Set(members.map((m) => m.userId))
  const invitable = friends.filter((f) => !memberIds.has(f.id))
  const playing = info.status === 'playing'

  const fail = (r: { ok: false; code: never; message: string } | { ok: false; code: string; message: string }) => setError(errorText(r as { code: never; message: string }))

  async function send(e: FormEvent) {
    e.preventDefault()
    setError('')
    const r = await session.chat.send(text)
    if (r.ok) setText('')
    else fail(r)
  }
  async function start() {
    setError('')
    // Gyilkos: ami az űrlapon látszik (az alapértékekkel együtt), az lép életbe — indítás előtt automatikusan mentjük a szabályokat
    if (killerMode && isOwner) {
      const c = await cloud.rooms.configure(info.id, { name: name.trim(), puzzleRef: puzzle, settings: { ...defaultKillerSettings(refs.find((x) => x.id === puzzle)?.diff ?? 3), ...rules } })
      if (!c.ok) return fail(c)
      setInfo(c.value)
    }
    const r = await session.start()
    if (!r.ok) fail(r)
  }
  async function toggleDoor() {
    setBusy(true)
    setError('')
    const r = await cloud.rooms.setOpen(info.id, !info.isOpen)
    setBusy(false)
    if (r.ok) setInfo(r.value)
    else fail(r)
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await cloud.rooms.configure(info.id, { name: name.trim(), puzzleRef: puzzle, ...(killerMode ? { settings: { ...defaultKillerSettings(refs.find((x) => x.id === puzzle)?.diff ?? 3), ...rules } } : {}) })
    setBusy(false)
    if (r.ok) {
      setInfo(r.value)
      toast(t('rooms.saved'))
    } else fail(r)
  }
  async function endGame() {
    setError('')
    const r = await session.finish({ solved: false, ms: 0 }) // amíg nincs közös tábla (B5), így lehet visszatérni a lobbyba
    if (!r.ok) fail(r)
    else setStatsKey((k) => k + 1)
  }
  async function remove() {
    setConfirmDelete(false)
    const r = await cloud.rooms.remove(info.id)
    if (r.ok) {
      toast(t('rooms.deleted'))
      onGone()
    } else fail(r)
  }
  async function leaveForever() {
    const r = await session.leave()
    if (r.ok) {
      toast(t('rooms.left'))
      onGone()
    } else fail(r)
  }
  async function report(messageId: number) {
    const r = await session.chat.report(messageId)
    if (r.ok) toast(t('lobby.reported'))
    else fail(r)
  }
  async function mute(userId: string) {
    const r = await session.chat.mute(userId)
    if (r.ok) {
      setMessages(session.chat.history()) // a némított játékos üzenetei eltűnnek
      setMutedIds(new Set(session.chat.muted()))
      toast(t('lobby.muted'))
    } else fail(r)
  }
  async function unmute(userId: string) {
    const r = await session.chat.unmute(userId)
    if (r.ok) {
      setMessages(session.chat.history()) // a játékos üzenetei visszatérnek
      setMutedIds(new Set(session.chat.muted()))
      toast(t('lobby.unmuted'))
    } else fail(r)
  }
  const toggleMute = (userId: string) => void (mutedIds.has(userId) ? unmute(userId) : mute(userId))
  async function invite(id: string) {
    const r = await cloud.rooms.invite(info.id, id)
    if (r.ok) toast(t('lobby.invited'))
    else fail(r)
  }

  if (inGame) return <CoopGame session={session} meId={meId} onExit={() => setInGame(false)} />

  return (
    <main className="nd-page top">
      <div className="nd-pf">
        <div className="nd-row">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← {t('rooms.back')}
          </Button>
        </div>
        <Panel tag={`${t('lobby.title').toUpperCase()} · ${t(`lobby.mode.${info.mode}`).toUpperCase()}`}>
          <div className="nd-row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="nd-note">{info.name || t('rooms.unnamed')}</div>
              <div className="nd-code" aria-label={t('lobby.code')}>
                {info.code}
              </div>
            </div>
            <span className="nd-row">
              <Chip dot={info.isOpen}>{info.isOpen ? t('rooms.state.open') : t('rooms.state.closed')}</Chip>
              <Chip>{playing ? t('rooms.state.playing') : t('rooms.state.lobby')}</Chip>
            </span>
          </div>
          <p className="nd-err" role="alert">
            {error}
          </p>

          {isOwner && (
            <section className="nd-sec">
              <p className="nd-note">{info.isOpen ? t('rooms.doorOpen') : t('rooms.doorClosed')}</p>
              <div className="nd-row">
                <Button size="sm" disabled={busy || (playing && info.isOpen)} onClick={() => void toggleDoor()}>
                  {info.isOpen ? t('rooms.close') : t('rooms.open')}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  {t('rooms.delete')}
                </Button>
              </div>
            </section>
          )}

          <div className="nd-cols">
            <section className="nd-sec">
              <h3>
                {t('lobby.members')} ({members.length}/{info.maxPlayers})
              </h3>
              <ul className="nd-people">
                {members.map((m) => {
                  const other = m.userId !== meId
                  const isMuted = mutedIds.has(m.userId)
                  return (
                    <li
                      key={m.userId}
                      className={isMuted ? 'nd-person is-muted' : 'nd-person'}
                      style={{ borderColor: m.color }}
                      onContextMenu={other ? (e) => { e.preventDefault(); setMenu({ userId: m.userId, x: e.clientX, y: e.clientY }) } : undefined}
                    >
                      <Avatar id={m.avatar} emoji={emoji(m.avatar)} size="2.2rem" />
                      <span className="nd-person-name">
                        <i className={m.online ? 'nd-dot-on on' : 'nd-dot-on'} />
                        {m.username} {m.userId === info.hostId && <small>{t('lobby.host')}</small>}
                        {isMuted && <small>🔇 {t('lobby.mutedTag')}</small>}
                      </span>
                      {other && (
                        <button
                          type="button"
                          className="nd-person-mute"
                          title={isMuted ? t('lobby.unmute') : t('lobby.mute')}
                          aria-label={`${isMuted ? t('lobby.unmute') : t('lobby.mute')}: ${m.username}`}
                          aria-pressed={isMuted}
                          onClick={() => toggleMute(m.userId)}
                        >
                          {isMuted ? '🔊' : '🔇'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
              {playing ? (
                <>
                  <p className="nd-info">{t('lobby.playing')}</p>
                  <div className="nd-row">
                    <Button size="sm" onClick={() => setInGame(true)}>{t('lobby.backToGame')}</Button>
                  </div>
                  {isOwner && (
                    <div className="nd-row">
                      <Button size="sm" variant="ghost" onClick={() => void endGame()}>
                        {t('rooms.endGame')}
                      </Button>
                    </div>
                  )}
                </>
              ) : isOwner ? (
                <div className="nd-row" style={{ marginTop: '.8rem' }}>
                  <Button disabled={members.length < 2} onClick={() => void start()} data-act="room-start">
                    {t('lobby.start')}
                  </Button>
                  {members.length < 2 ? <span className="nd-note">{t('lobby.needTwo')}</span> : killerMode && members.length < 3 && <span className="nd-note">{t('lobby.killerTwo')}</span>}
                </div>
              ) : (
                <p className="nd-note">{t('lobby.hostOnly')}</p>
              )}
              {killerMode && !playing && <p className="nd-note">{t('lobby.killerSecret')}</p>}

              {isOwner && !playing && (
                <form className="nd-form" onSubmit={(e) => void saveSettings(e)} style={{ marginTop: '1.2rem' }}>
                  <h3 style={{ margin: 0 }}>{t('rooms.settings')}</h3>
                  <label className="nd-field">
                    {t('rooms.name')}
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="off" />
                  </label>
                  <label className="nd-field">
                    {t('lobby.puzzle')}
                    {refs.length > 0 ? (
                      <select value={puzzle} onChange={(e) => setPuzzle(e.target.value)}>
                        {!refs.some((r) => r.id === puzzle) && <option value={puzzle}>{puzzle}</option>}
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
                  {killerMode && <KillerRules value={rules} onChange={setRules} difficulty={refs.find((x) => x.id === puzzle)?.diff ?? 3} maxPlayers={info.maxPlayers} />}
                  <div className="nd-row">
                    <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                      {t('rooms.save')}
                    </Button>
                  </div>
                </form>
              )}

              {!playing && invitable.length > 0 && (
                <>
                  <h3 style={{ marginTop: '1.2rem' }}>{t('lobby.inviteFriends')}</h3>
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
                </>
              )}
              {!isOwner && (
                <div className="nd-row" style={{ marginTop: '1.2rem' }}>
                  <Button size="sm" variant="ghost" onClick={() => void leaveForever()}>
                    {t('rooms.leaveForever')}
                  </Button>
                </div>
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
              {members.some((m) => mutedIds.has(m.userId)) && (
                <p className="nd-note nd-mute-note">
                  🔇 {members.filter((m) => mutedIds.has(m.userId)).map((m) => m.username).join(', ')}: {t('lobby.muteHint')}
                </p>
              )}
              <form onSubmit={(e) => void send(e)}>
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t('lobby.chat.placeholder')} autoComplete="off" />
                <Button type="submit" size="sm" disabled={!text.trim()}>
                  {t('lobby.chat.send')}
                </Button>
              </form>
              <p className="nd-note">{t('lobby.ageNote')}</p>
            </section>
          </div>

          <section className="nd-sec" style={{ marginTop: '1.2rem' }}>
            <h3>{t('costats.title')}</h3>
            <StatsBlock roomId={info.id} refreshKey={statsKey} />
          </section>
        </Panel>
      </div>
      {menu && (
        <MemberMenu
          x={menu.x}
          y={menu.y}
          name={members.find((m) => m.userId === menu.userId)?.username ?? '?'}
          muted={mutedIds.has(menu.userId)}
          onToggle={() => {
            toggleMute(menu.userId)
            closeMenu()
          }}
          onClose={closeMenu}
        />
      )}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p>{t('rooms.delete.ask')}</p>
        <div className="nd-row">
          <Button size="sm" onClick={() => void remove()}>
            {t('rooms.delete.yes')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            {t('settings.clear.no')}
          </Button>
        </div>
      </Modal>
    </main>
  )
}
