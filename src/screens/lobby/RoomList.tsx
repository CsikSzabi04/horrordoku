// Szobák listája (0005): saját szobáim (nyitás/zárás, belépés, statisztika, törlés), mások szobái, belépés kóddal, összesített statisztika.
// A zárt szoba is látszik a listában — de belépni csak a tulajdonos megnyitása után lehet.
import { useCallback, useEffect, useRef, useState } from 'react'
import { puzzleTitle } from '../../content/localize'
import type { FormEvent } from 'react'
import { useNav } from '../../app/nav'
import { cloud } from '../../cloud'
import { errorText } from '../../cloud/errors'
import { listPuzzles } from '../../content/catalog'
import { t } from '../../i18n'
import type { ProfileStats } from '../../shared/cloud'
import type { RoomInvite, RoomMode, RoomPeek, RoomSession, RoomSummary } from '../../shared/room'
import { Button, Chip, Modal, Panel, useToast } from '../../ui'
import '../login/form.css'
import '../friends/social.css'
import { StatsBlock } from './StatsBlock'

const REFRESH_MS = 5000

function Card({ r, busy, onEnter, onToggle, onDelete, onLeave }: {
  r: RoomSummary
  busy: boolean
  onEnter: (r: RoomSummary) => void
  onToggle: (r: RoomSummary) => void
  onDelete: (r: RoomSummary) => void
  onLeave: (r: RoomSummary) => void
}) {
  const [showStats, setShowStats] = useState(false)
  const playing = r.status === 'playing'
  const canEnter = r.isOwner || (r.isOpen && (r.isMember || !playing))
  return (
    <li className={`nd-room${r.isOwner ? ' own' : ''}`}>
      <div className="nd-room-head">
        <div>
          <b>{r.name || t('rooms.unnamed')}</b> <span className="nd-code-s">{r.code}</span>
          <div className="nd-note">
            {r.isOwner ? '' : `${t('rooms.by')}: ${r.ownerUsername} · `}
            {r.memberCount}/{r.maxPlayers} {t('rooms.members')} · {r.gamesPlayed} {t('rooms.games')} · {r.puzzleRef}
          </div>
        </div>
        <span className="nd-row">
          <Chip dot={r.isOpen}>{r.isOpen ? t('rooms.state.open') : t('rooms.state.closed')}</Chip>
          <Chip>{playing ? t('rooms.state.playing') : t('rooms.state.lobby')}</Chip>
        </span>
      </div>
      {!r.isOpen && !r.isOwner && <p className="nd-info">{t('rooms.closedHint')}</p>}
      <div className="nd-row">
        {canEnter && (
          <Button size="sm" disabled={busy} onClick={() => onEnter(r)}>
            {t('rooms.enter')}
          </Button>
        )}
        {r.isOwner && (
          <Button size="sm" variant="ghost" disabled={busy || (playing && r.isOpen)} onClick={() => onToggle(r)}>
            {r.isOpen ? t('rooms.close') : t('rooms.open')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowStats((v) => !v)} disabled={!r.isOwner && !r.isMember}>
          {t('rooms.stats')}
        </Button>
        {r.isOwner ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(r)}>
            {t('rooms.delete')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onLeave(r)}>
            {r.isMember ? t('rooms.leave') : t('rooms.unfollow')}
          </Button>
        )}
      </div>
      {showStats && (r.isOwner || r.isMember) && <StatsBlock roomId={r.id} />}
    </li>
  )
}

export function RoomList({ mode, onOpen }: { mode: RoomMode; onOpen: (s: RoomSession) => void }) {
  const { back, go } = useNav()
  const toast = useToast()
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loaded, setLoaded] = useState(false)
  const [invites, setInvites] = useState<RoomInvite[]>([])
  const [profile, setProfile] = useState<ProfileStats | null>(null)
  const [refs, setRefs] = useState<{ id: string; title: string }[]>([])
  const [name, setName] = useState('')
  const [puzzle, setPuzzle] = useState('classic-1-01-flower-store')
  const [max, setMax] = useState(mode === 'killer' ? 4 : 2)
  const [code, setCode] = useState('')
  const [peek, setPeek] = useState<RoomPeek | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<RoomSummary | null>(null)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    const r = await cloud.rooms.mine()
    if (!alive.current) return
    if (r.ok) setRooms(r.value.filter((x) => x.mode === mode))
    else setError(errorText(r))
    setLoaded(true)
  }, [mode])

  useEffect(() => {
    alive.current = true
    void refresh()
    // a zárt szobák nem küldenek eseményt a nem-tagoknak, ezért a lista időnként frissül (megnyitásnál így jelenik meg a „Belépés")
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') void refresh()
    }, REFRESH_MS)
    void cloud.profile.stats().then((s) => alive.current && s.ok && setProfile(s.value))
    // a pálya-választó az indexből épül (nem töltjük be mind a ~200 pályát)
    const p = listPuzzles()
    if (p.length > 0) {
      setRefs(p.map((x) => ({ id: x.id, title: `${puzzleTitle(x)} · ${x.size}×${x.size} · ${'★'.repeat(x.difficulty)}` })))
      setPuzzle((cur) => (p.some((x) => x.id === cur) ? cur : p[0]!.id))
    }
    const loadInvites = () => void cloud.rooms.invites().then((r) => alive.current && r.ok && setInvites(r.value.filter((i) => i.mode === mode)))
    loadInvites()
    const off = cloud.rooms.onInvite(loadInvites)
    return () => {
      alive.current = false
      clearInterval(timer)
      off()
    }
  }, [refresh, mode])

  async function openSession(roomId: string) {
    const s = await cloud.rooms.open(roomId)
    if (s.ok) onOpen(s.value)
    else setError(errorText(s))
  }
  async function enter(r: RoomSummary) {
    setBusy(true)
    setError('')
    if (!r.isMember) {
      const j = await cloud.rooms.join(r.code)
      if (!j.ok) {
        setBusy(false)
        setError(errorText(j))
        void refresh()
        return
      }
    }
    await openSession(r.id)
    setBusy(false)
  }
  async function toggle(r: RoomSummary) {
    setBusy(true)
    const res = await cloud.rooms.setOpen(r.id, !r.isOpen)
    setBusy(false)
    if (!res.ok) setError(errorText(res))
    await refresh()
  }
  async function confirmDelete() {
    const r = toDelete
    setToDelete(null)
    if (!r) return
    setBusy(true)
    const res = await cloud.rooms.remove(r.id)
    setBusy(false)
    if (res.ok) toast(t('rooms.deleted'))
    else setError(errorText(res))
    await refresh()
  }
  async function leave(r: RoomSummary) {
    setBusy(true)
    const res = await (r.isMember ? cloud.rooms.leave(r.id) : cloud.rooms.unfollow(r.id))
    setBusy(false)
    if (res.ok) toast(t('rooms.left'))
    else setError(errorText(res))
    await refresh()
  }
  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await cloud.rooms.create({ mode, puzzleRef: puzzle, name: name.trim(), maxPlayers: max })
    setBusy(false)
    if (!res.ok) {
      setError(errorText(res))
      return
    }
    setName('')
    await refresh()
  }
  async function lookup(e: FormEvent) {
    e.preventDefault()
    setError('')
    const res = await cloud.rooms.peek(code)
    if (res.ok) setPeek(res.value)
    else setError(errorText(res))
  }
  async function joinPeeked() {
    if (!peek) return
    setBusy(true)
    const j = await cloud.rooms.join(peek.code)
    if (!j.ok) {
      setBusy(false)
      setError(errorText(j))
      return
    }
    await openSession(j.value.id)
    setBusy(false)
  }
  /** Meghívóból: a „Belépés" egyből bevisz a szobába (a kódot nem kell begépelni). Ha nem lehet (zárt / tele / elindult), a hibát és a szoba állapotát mutatjuk. */
  async function joinInvite(i: RoomInvite) {
    setBusy(true)
    setError('')
    const j = await cloud.rooms.join(i.code)
    if (!j.ok) {
      setBusy(false)
      setError(errorText(j))
      setCode(i.code)
      void cloud.rooms.peek(i.code).then((p) => p.ok && setPeek(p.value))
      return
    }
    await openSession(j.value.id)
    setBusy(false)
  }
  async function followPeeked() {
    if (!peek) return
    const res = await cloud.rooms.follow(peek.code)
    if (res.ok) {
      toast(t('rooms.followed'))
      setPeek(undefined)
      setCode('')
      await refresh()
    } else setError(errorText(res))
  }

  const own = rooms.filter((r) => r.isOwner)
  const others = rooms.filter((r) => !r.isOwner)
  const roomGames = own.reduce((n, r) => n + r.gamesPlayed, 0)
  const maxOptions = mode === 'killer' ? [3, 4, 5, 6] : [2, 3, 4]
  const modeLabel = t(`lobby.mode.${mode}`)

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
          <Button variant="ghost" size="sm" onClick={() => void refresh()}>
            ↻ {t('rooms.refresh')}
          </Button>
        </div>
        <Panel tag={`${t('lobby.title').toUpperCase()} · ${modeLabel.toUpperCase()}`}>
          <p className="nd-err" role="alert">
            {error}
          </p>

          <section className="nd-sec">
            <h3>{t('costats.title')}</h3>
            <ul className="nd-stats">
              <li>
                <span>{t('costats.games')}</span>
                <b>{profile?.coopGames ?? '—'}</b>
              </li>
              <li>
                <span>{t(mode === 'killer' ? 'costats.killerWins' : 'costats.detectiveWins')}</span>
                <b>{profile ? (mode === 'killer' ? profile.winsAsKiller : profile.winsAsDetective) : '—'}</b>
              </li>
              <li>
                <span>{t('costats.rooms')}</span>
                <b>
                  {own.length}/5
                </b>
              </li>
              <li>
                <span>{t('costats.roomGames')}</span>
                <b>{roomGames}</b>
              </li>
            </ul>
          </section>

          {invites.length > 0 && (
            <section className="nd-sec">
              <h3>{t('lobby.invites')}</h3>
              <ul className="nd-people">
                {invites.map((i) => (
                  <li key={i.roomId} className="nd-person">
                    <span className="nd-person-name">
                      {i.fromUsername} <small>{t('lobby.invite.from')}</small>
                    </span>
                    <Button size="sm" disabled={busy} onClick={() => void joinInvite(i)}>
                      {t('lobby.join')}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="nd-sec">
            <h3>{t('rooms.mine')}</h3>
            {loaded && own.length === 0 ? (
              <p className="nd-note">{t('rooms.noneMine')}</p>
            ) : (
              <ul className="nd-rooms">
                {own.map((r) => (
                  <Card key={r.id} r={r} busy={busy} onEnter={(x) => void enter(x)} onToggle={(x) => void toggle(x)} onDelete={setToDelete} onLeave={(x) => void leave(x)} />
                ))}
              </ul>
            )}
            <details className="nd-new" open={loaded && own.length === 0}>
              <summary>{t('rooms.new')}</summary>
              <form className="nd-form" onSubmit={(e) => void create(e)}>
                <label className="nd-field">
                  {t('rooms.name')}
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder={t('rooms.namePlaceholder')} autoComplete="off" />
                </label>
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
                <p className="nd-note">{t('rooms.limitNote')}</p>
                <div className="nd-row">
                  <Button type="submit" disabled={busy || own.length >= 5}>
                    {t('rooms.create')}
                  </Button>
                </div>
              </form>
            </details>
          </section>

          <section className="nd-sec">
            <h3>{t('rooms.others')}</h3>
            {loaded && others.length === 0 ? (
              <p className="nd-note">{t('rooms.noneOthers')}</p>
            ) : (
              <ul className="nd-rooms">
                {others.map((r) => (
                  <Card key={r.id} r={r} busy={busy} onEnter={(x) => void enter(x)} onToggle={(x) => void toggle(x)} onDelete={setToDelete} onLeave={(x) => void leave(x)} />
                ))}
              </ul>
            )}
          </section>

          <section className="nd-sec">
            <h3>{t('rooms.joinByCode')}</h3>
            <form className="nd-form" onSubmit={(e) => void lookup(e)}>
              <label className="nd-field">
                {t('rooms.code')}
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setPeek(undefined)
                  }}
                  maxLength={6}
                  autoComplete="off"
                  style={{ textTransform: 'uppercase', letterSpacing: '.3em' }}
                />
              </label>
              <div className="nd-row">
                <Button type="submit" size="sm" disabled={busy || code.trim().length < 6}>
                  {t('lobby.join')}
                </Button>
              </div>
            </form>
            {peek === null && <p className="nd-err">{t('rooms.peek.notFound')}</p>}
            {peek && (
              <div className="nd-room own" style={{ marginTop: '.8rem' }}>
                <div className="nd-room-head">
                  <div>
                    <b>{peek.name || t('rooms.unnamed')}</b> <span className="nd-code-s">{peek.code}</span>
                    <div className="nd-note">
                      {t('rooms.by')}: {peek.ownerUsername} · {peek.memberCount}/{peek.maxPlayers} {t('rooms.members')}
                    </div>
                  </div>
                  <Chip dot={peek.isOpen}>{peek.isOpen ? t('rooms.state.open') : t('rooms.state.closed')}</Chip>
                </div>
                {!peek.isOpen ? (
                  <>
                    <p className="nd-info">{t('rooms.peek.closed')}</p>
                    <div className="nd-row">
                      <Button size="sm" onClick={() => void followPeeked()}>
                        {t('rooms.follow')}
                      </Button>
                    </div>
                  </>
                ) : peek.status === 'playing' && !peek.isMember ? (
                  <p className="nd-info">{t('rooms.peek.started')}</p>
                ) : peek.memberCount >= peek.maxPlayers && !peek.isMember ? (
                  <p className="nd-info">{t('rooms.peek.full')}</p>
                ) : (
                  <div className="nd-row">
                    <span className="nd-info">{t('rooms.peek.open')}</span>
                    <Button size="sm" disabled={busy} onClick={() => void joinPeeked()}>
                      {t('rooms.enter')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
          <p className="nd-note">{t('lobby.ageNote')}</p>
        </Panel>
      </div>
      <Modal open={toDelete !== null} onClose={() => setToDelete(null)}>
        <p>{t('rooms.delete.ask')}</p>
        <p>
          <b>{toDelete?.name || toDelete?.code}</b>
        </p>
        <div className="nd-row">
          <Button size="sm" onClick={() => void confirmDelete()}>
            {t('rooms.delete.yes')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
            {t('settings.clear.no')}
          </Button>
        </div>
      </Modal>
    </main>
  )
}
