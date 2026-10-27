// Gyilkos mód (B6, GDD 22.3): a közös tábla szinkronja ugyanaz, mint az Együttben (`createCoopSync`), a beküldés viszont a SZERVEREN megy:
//   javaslat → a szavazók többsége jóváhagyja (15 mp; mindenki szavazata egyformán számít) → minden kliens kiszámolja, helyes-e a közös tábla, és jelenti → a jelentések többsége dönt
//   → helyes: Epilógus · helytelen: egy élet vész (és mindenkinél jumpscare).
// Ez a réteg a `CoopSync` felületét valósítja meg (hogy a játékképernyő ne tudjon a különbségről), a beküldést a `KillerSession`-re képezve.
import { boardEngine } from '../engine'
import type { Unsubscribe, Uuid } from '../shared/base'
import type { KillerSession, KillerState } from '../shared/room'
import { createCoopSync } from './coop'
import type { CoopOptions, CoopResult, CoopSync, Proposal } from './coop'

export interface KillerSync extends CoopSync {
  /** A beküldés ellenőrzési szakasza fut (a javaslatot a többség jóváhagyta; a kliensek jelentik az eredményt). */
  verifying(): boolean
  onVerifying(cb: (v: boolean) => void): Unsubscribe
  /** A szerver elutasította a kérést (pl. hűtés, „most nem lehet”). */
  onError(cb: (message: string) => void): Unsubscribe
}

/** Várakozás az ellenőrzés előtt: a már úton lévő műveletek még beérnek a táblára. */
const VERIFY_DELAY_MS = 350

export function createKillerSync(o: CoopOptions & { killer: KillerSession }): KillerSync {
  const { killer, board, puzzle } = o
  const inner = createCoopSync(o)
  const offs: Unsubscribe[] = []
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const propCbs = new Set<(p: Proposal | null) => void>()
  const resultCbs = new Set<(r: CoopResult) => void>()
  const rejectCbs = new Set<() => void>()
  const verifyCbs = new Set<(v: boolean) => void>()
  const errorCbs = new Set<(m: string) => void>()
  let current: Proposal | null = null
  let voted = false
  let verifying = false
  let proposing = false // a javaslatot elküldtük, a szerver visszhangja még nem érkezett meg
  let reportedFor: string | null = null

  const setProposal = (p: Proposal | null, hasVoted = false) => {
    if (p) proposing = false
    if (p === null && current === null) return
    current = p
    voted = hasVoted
    propCbs.forEach((cb) => cb(p))
  }
  const setVerifying = (v: boolean) => {
    if (verifying === v) return
    verifying = v
    verifyCbs.forEach((cb) => cb(v))
  }
  const fail = (r: { ok: boolean; message?: string }) => {
    if (!r.ok) errorCbs.forEach((cb) => cb(r.message ?? 'error'))
  }

  /** Minden kliens (a gyilkosé is — így semmi sem árulkodik) kiszámolja, helyes-e a közös tábla; a szerver a jelentések többségét veszi (kettős játékban a nyomozóét). */
  const report = (id: string) => {
    if (reportedFor === id) return
    reportedFor = id
    const t = setTimeout(() => {
      timers.delete(t)
      const st = board.getState()
      const correct = boardEngine.isComplete(puzzle, st) && boardEngine.check(puzzle, st).correct
      void killer.reportSubmit(correct).then(fail)
    }, VERIFY_DELAY_MS)
    timers.add(t)
  }

  /** A szerver-állapot a végső igazság: az eseményekből épített helyi kép innen javul (kimaradt esemény, újracsatlakozás). */
  const applyState = (s: KillerState) => {
    if (!s.running) {
      setProposal(null)
      setVerifying(false)
      return
    }
    const sub = s.submit
    if (sub && sub.phase === 'vote') {
      setVerifying(false)
      if (!current || current.id !== sub.id) setProposal({ id: sub.id, by: sub.by, deadlineAt: sub.endsAt - (killer.serverNow() - Date.now()) }, sub.voted)
      else voted = sub.voted
    } else if (sub && sub.phase === 'verify') {
      setProposal(null)
      setVerifying(true)
      if (!sub.voted) report(sub.id)
    } else {
      setProposal(null)
      setVerifying(false)
    }
  }

  offs.push(
    killer.onSubmit((e) => {
      switch (e.state) {
        case 'proposal':
          // a javaslat határideje a szerver-órában érkezik: helyi időre váltjuk (a visszaszámláló a helyi órát használja)
          setProposal({ id: e.id, by: e.by, deadlineAt: (e.endsAt ?? killer.serverNow() + 15000) - (killer.serverNow() - Date.now()) }, e.by === o.meId)
          break
        case 'verify':
          setProposal(null)
          setVerifying(true)
          report(e.id)
          break
        case 'rejected':
          proposing = false
          setProposal(null)
          setVerifying(false)
          rejectCbs.forEach((cb) => cb())
          break
        case 'correct':
        case 'wrong':
          proposing = false
          setProposal(null)
          setVerifying(false)
          resultCbs.forEach((cb) => cb({ correct: e.state === 'correct', by: e.by }))
          break
      }
    }),
    killer.onState(applyState),
  )
  const first = killer.state()
  if (first) applyState(first)

  return {
    ...inner,
    propose() {
      if (current || verifying || proposing) return false
      proposing = true
      void killer.proposeSubmit().then((r) => {
        if (r.ok) return
        proposing = false
        fail(r)
      })
      return true
    },
    vote(approve: boolean) {
      if (!current || voted) return
      voted = true
      void killer.voteSubmit(approve).then(fail)
      propCbs.forEach((cb) => cb(current))
    },
    hasVoted: () => voted,
    proposal: () => current,
    onProposal(cb) {
      propCbs.add(cb)
      return () => propCbs.delete(cb)
    },
    onResult(cb) {
      resultCbs.add(cb)
      return () => resultCbs.delete(cb)
    },
    onRejected(cb) {
      rejectCbs.add(cb)
      return () => rejectCbs.delete(cb)
    },
    verifying: () => verifying,
    onVerifying(cb) {
      verifyCbs.add(cb)
      return () => verifyCbs.delete(cb)
    },
    onError(cb) {
      errorCbs.add(cb)
      return () => errorCbs.delete(cb)
    },
    destroy() {
      offs.forEach((off) => off())
      timers.forEach(clearTimeout)
      timers.clear()
      inner.destroy()
    },
  }
}

/** Kitől jön a (nyilvános) tudás a gyilkosról? A szerver csak a leleplezetteket (és kettő játékosnál az egyetlent) árulja el. */
export const publicKillers = (s: KillerState | null): Uuid[] => s?.exposedKillers ?? []
