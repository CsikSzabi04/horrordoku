// A Gyilkos mód felület-állapota egy helyen: a szerver-állapot (szívveréssel frissül), a chatbe szánt rendszersorok, a vég-eredmény,
// a szerepkártya és az „árulkodó jel”. A hatások a táblára (BoardController.applyFx) mennek; ez a hook a megjelenítéshez kell.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from './strings'
import { kt } from './killerStrings'
import type { KillerSession, KillerState, RoomMember } from '../shared/room'
import type { GameBoard } from './controller'

export interface KillerLogLine {
  id: string
  at: number
  text: string
}
export interface KillerEnd {
  outcome: 'detectives' | 'killer' | 'draw' | 'aborted'
  reason: string
  killerIds: string[]
  elapsedMs: number
  abilityLog: { ability: string; at: number }[]
}

export interface KillerUi {
  state: KillerState | null
  /** A szerepem (a vég után is megmarad, az eredményhez kell). */
  role: 'killer' | 'detective' | null
  /** Szerver-óra (ms): a visszaszámlálókhoz. */
  now: () => number
  /** A chat mellé fésült rendszersorok (Szimat, Gyűlés, életvesztés…). Időbüntetés / Szövegcsere / Eltüntetés NEM kerül ide: ott nincs értesítés. */
  log: KillerLogLine[]
  end: KillerEnd | null
  /** A szerepkártya (játék elején 1×) még látszik-e. */
  roleCard: boolean
  dismissRoleCard: () => void
  /** Árulkodó jel: a megvillanó kártya azonosítója (lobby-opció, alapból ki). */
  flash: string | null
  /** Gyűlés alatt / beküldés ellenőrzésekor a tábla használható, de a beküldés tiltott. */
  busy: boolean
}

const nameOf = (members: RoomMember[], id: string | undefined) => members.find((m) => m.userId === id)?.username ?? '?'

export function useKiller(killer: KillerSession | undefined, board: GameBoard | null, members: RoomMember[], lang: Lang): KillerUi {
  const [state, setState] = useState<KillerState | null>(killer?.state() ?? null)
  const [log, setLog] = useState<KillerLogLine[]>([])
  const [end, setEnd] = useState<KillerEnd | null>(null)
  const [roleCard, setRoleCard] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)
  const [role, setRole] = useState<'killer' | 'detective' | null>(killer?.state()?.role ?? null)
  const sealsApplied = useRef(new Set<string>()) // már megjelenített Eltüntetések (esemény és állapot is hozhatja ugyanazt)
  const membersRef = useRef(members)
  membersRef.current = members
  const langRef = useRef(lang)
  langRef.current = lang

  useEffect(() => {
    if (!killer) return
    const add = (id: string, text: string) => setLog((l) => (l.some((x) => x.id === id) ? l : [...l, { id, at: Date.now(), text }].slice(-60)))
    const t = (k: Parameters<typeof kt>[1], v?: Record<string, string | number>) => kt(langRef.current, k, v)
    let n = 0
    const offs = [
      killer.onState(setState),
      killer.onFx((fx) => {
        // időbüntetés / gyorsítás / Szövegcsere / Eltüntetés: SEMMI üzenet (a mód lényege) — csak a tábla mutatja a hatást
        if (fx.type === 'exposed') add(`fx${++n}`, t('logExposed'))
        if (fx.type === 'object_vanish') sealsApplied.current.add(`${fx.cell}@${(fx as { serverTime?: number }).serverTime ?? ''}`)
        if (fx.type === 'clue_override' && fx.telltale) {
          setFlash(fx.char)
          setTimeout(() => setFlash(null), 200)
        }
        board?.applyFx(fx)
      }),
      killer.onSniff((r) => add(`sn${++n}`, t(r.used ? 'logSniffYes' : 'logSniffNo'))),
      killer.onMeeting((m) => {
        if (m.phase === 'discuss') add(`mt${++n}`, t('logMeeting', { name: nameOf(membersRef.current, m.by) }))
        if (m.phase === 'result') {
          if (!m.ejected) add(`mr${++n}`, t('mtNoMajority'))
          else add(`mr${++n}`, t(m.killerExposed ? 'mtExposed' : 'mtSilenced', { name: nameOf(membersRef.current, m.ejected) }))
        }
        board?.applyFx({ type: 'meeting', phase: m.phase, endsAt: m.endsAt })
      }),
      killer.onSubmit((e) => {
        if (e.state === 'proposal') add(`sp${e.id}`, t('logProposal', { name: nameOf(membersRef.current, e.by) }))
        if (e.state === 'rejected') add(`sr${e.id}`, t('logRejected'))
        if (e.state === 'wrong') add(`sw${e.id}`, t('logLife', { n: e.livesLeft ?? 0 }))
        if (e.state === 'correct') add(`sc${e.id}`, t('logCorrect'))
        if (e.state === 'wrong' && e.livesLeft !== undefined) board?.setLives(e.livesLeft)
      }),
      killer.onEnd((r) => setEnd({ outcome: r.outcome, reason: r.reason, killerIds: r.killerIds, elapsedMs: r.elapsedMs, abilityLog: r.abilityLog })),
    ]
    return () => offs.forEach((off) => off())
  }, [killer, board])

  useEffect(() => {
    if (state?.role) setRole(state.role)
  }, [state?.role])

  // a szerver-állapot az óra / életek kijelzőjét is hajtja a táblán
  useEffect(() => {
    if (!state?.running || !board) return
    if (state.lives !== undefined) board.setLives(state.lives)
    // az Eltüntetések az állapotból is megjelennek (későn érkezőnek, újracsatlakozónak): még tartó → eltűnt tárgy, lejárt → zárolt mező
    for (const sl of state.seals ?? []) {
      const key = `${sl.cell}@${sl.from}`
      if (sealsApplied.current.has(key)) continue
      sealsApplied.current.add(key)
      board.applyFx({ type: 'object_vanish', cell: sl.cell, ms: Math.max(0, sl.until - (killer?.serverNow() ?? Date.now())) })
    }
    if (state.timeLimitMs != null && state.startedAt != null) board.setClock({ endsAt: state.startedAt + state.timeLimitMs - (state.penaltyMs ?? 0), speed: (state.speed ?? []).some((w) => killer && killer.serverNow() < w.until && killer.serverNow() >= w.from) ? 3 : 1 })
    else board.setClock({ endsAt: null, speed: 1 })
  }, [state, board, killer])

  const busy = useMemo(() => !!state?.meeting || !!state?.submit || state?.phase === 'epilogue', [state])
  return {
    state,
    role,
    now: () => killer?.serverNow() ?? Date.now(),
    log,
    end,
    roleCard,
    dismissRoleCard: () => setRoleCard(false),
    flash,
    busy,
  }
}
