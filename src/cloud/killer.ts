// KillerSession (B6, GDD 22.3): a Gyilkos mód kliens-oldala. A játékszabályok MIND a szerveren futnak (0007_killer.sql); ez a réteg csak
//   · lekérdezi / frissíti az állapot-pillanatképet (`killer_beat`: szívverés + a szerver előreléptetése, ~8 mp-enként és minden határidőnél),
//   · figyeli a `room_events` táblát (Realtime `postgres_changes`): hatások, Gyűlés, beküldés, Epilógus, vég — feladó nélkül,
//   · a játékos műveleteit (képesség, Szimat, Gyűlés, szavazás, beküldés) a megfelelő szerverfüggvényre képezi le.
// A szerep titkos: a saját szerepemet csak az `killer_state` adja; a többiekét sosem kapja meg a kliens a játék végéig.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Result, Unsubscribe } from '../shared/base'
import type { Fx } from '../shared/fx'
import type { KillerAbility, KillerResult, KillerSession, KillerState, KillerSubmitEvent } from '../shared/room'
import { fail, fromError, guard, ok } from './result'

/** A szívverés üteme (ms). Tesztekhez / e2e-hez a `localStorage['nd_beat_ms']` felülbírálhatja (min. 300). */
const BEAT_MS = (() => {
  try {
    const v = Number(localStorage.getItem('nd_beat_ms'))
    return v >= 300 ? v : 8000
  } catch {
    return 8000
  }
})()
const ABILITIES: KillerAbility[] = ['timeWarp', 'textSwap', 'vanish']

interface EventRow { id: number; kind: string; payload: Record<string, unknown> }
type EndPayload = Parameters<Parameters<KillerSession['onEnd']>[0]>[0]
type MeetingPayload = Parameters<Parameters<KillerSession['onMeeting']>[0]>[0]

const set = <T>() => {
  const s = new Set<(v: T) => void>()
  return { s, on: (cb: (v: T) => void): Unsubscribe => (s.add(cb), () => s.delete(cb)), emit: (v: T) => s.forEach((cb) => cb(v)) }
}

export interface KillerHandle extends KillerSession {
  /** Leállítja a szívverést és a Realtime-feliratkozást. */
  close(): void
}

export function createKillerSession(client: SupabaseClient, roomId: string): KillerHandle {
  let state: KillerState | null = null
  let offset = 0 // szerver-óra − helyi óra (ms)
  const cdExpire: Record<KillerAbility, number> = { timeWarp: 0, textSwap: 0, vanish: 0 }
  const seen = new Set<number>()
  const stateCbs = set<KillerState>()
  const fxCbs = set<Fx>()
  const meetingCbs = set<MeetingPayload>()
  const epilogueCbs = set<{ endsAt: number }>()
  const endCbs = set<EndPayload>()
  const submitCbs = set<KillerSubmitEvent>()
  const sniffCbs = set<{ used: boolean }>()
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let endEmitted = false // a vég egyszer jön ki: az `end` eseményből VAGY (ha az elmaradt) a szívverés utáni eredmény-lekérdezésből

  const serverNow = () => Date.now() + offset

  function adopt(s: KillerState) {
    offset = s.now - Date.now()
    state = s
    if (s.cooldowns) for (const a of ABILITIES) cdExpire[a] = Date.now() + (s.cooldowns[a] ?? 0)
    stateCbs.emit(s)
    scheduleDeadline()
  }

  /** A legközelebbi határidőnél (Gyűlés / beküldés / Epilógus / az idő vége) azonnal szívverést küldünk, hogy a szerver előrelépjen. */
  function scheduleDeadline() {
    clearTimeout(deadlineTimer)
    if (closed || !state?.running) return
    const ends: number[] = []
    if (state.meeting) ends.push(state.meeting.endsAt)
    if (state.submit) ends.push(state.submit.endsAt)
    if (state.epilogue) ends.push(state.epilogue.endsAt)
    if (state.phase === 'play' && state.timeLimitMs != null) {
      const left = state.timeLimitMs - (state.penaltyMs ?? 0) - (serverNow() - (state.startedAt ?? serverNow()))
      ends.push(serverNow() + left)
    }
    const next = Math.min(...ends.filter((e) => e > serverNow()), Infinity)
    if (next === Infinity) return
    deadlineTimer = setTimeout(() => void beat(), Math.max(200, next - serverNow() + 400))
  }

  const emitEnd = (p: EndPayload) => {
    if (endEmitted) return
    endEmitted = true
    endCbs.emit(p)
  }

  async function beat(): Promise<Result<KillerState>> {
    const r = await guard(async () => {
      const { data, error } = await client.rpc('killer_beat', { p_room: roomId })
      if (error) return fromError(error)
      return ok(data as KillerState)
    })
    if (r.ok && r.value) {
      if (r.value.running) {
        endEmitted = false // új játék
        adopt(r.value)
      } else {
        const wasRunning = state?.running === true
        state = { running: false, now: r.value.now }
        offset = r.value.now - Date.now()
        stateCbs.emit(state)
        // a játék a szerveren véget ért, de az `end` esemény nem érkezett meg (kimaradt Realtime-üzenet): az eredményt lekérdezzük
        if (wasRunning && !endEmitted) void session.result().then((res) => res.ok && res.value && emitEnd(endFromResult(res.value)))
      }
    }
    return r
  }
  const soon = () => {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => void beat(), 150)
  }

  function handle(row: EventRow) {
    if (seen.has(row.id)) return
    seen.add(row.id)
    const p = row.payload
    switch (row.kind) {
      case 'fx':
        fxCbs.emit(p as unknown as Fx)
        soon() // idő-büntetés / gyorsítás / leleplezés / némítás: az állapot a szervertől frissül
        break
      case 'meeting':
        meetingCbs.emit({ phase: p.phase as MeetingPayload['phase'], endsAt: Number(p.endsAt), ...(p.by ? { by: String(p.by) } : {}), ...(p.ejected !== undefined ? { ejected: (p.ejected as string | null) ?? null } : {}), ...(p.killerExposed !== undefined ? { killerExposed: p.killerExposed === true } : {}) })
        soon()
        break
      case 'sniff':
        sniffCbs.emit({ used: p.used === true })
        break
      case 'submit':
        submitCbs.emit({ state: p.state as KillerSubmitEvent['state'], id: String(p.id), by: String(p.by), ...(p.endsAt !== undefined ? { endsAt: Number(p.endsAt) } : {}), ...(p.livesLeft !== undefined ? { livesLeft: Number(p.livesLeft) } : {}) })
        soon()
        break
      case 'epilogue':
        epilogueCbs.emit({ endsAt: Number(p.endsAt) })
        soon()
        break
      case 'start':
        soon()
        break
      case 'end': {
        const killerIds = ((p.killerIds as string[] | undefined) ?? []).map(String)
        clearTimeout(deadlineTimer)
        state = { running: false, now: serverNow() }
        stateCbs.emit(state)
        emitEnd({
          outcome: p.outcome as EndPayload['outcome'], killerId: killerIds[0] ?? '', killerIds, reason: String(p.reason ?? ''),
          elapsedMs: Number(p.elapsedMs ?? 0), abilityLog: ((p.abilityLog as { ability: string; at: number }[] | undefined) ?? []).map((e) => ({ ability: String(e.ability), at: Number(e.at) })),
        })
        break
      }
    }
  }

  const channel = client
    .channel(`killer:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` }, (p: { new: unknown }) => handle(p.new as EventRow))
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') void beat() // a feliratkozás előtt érkezett változások se vesszenek el
    })
  void beat() // az első állapot a feliratkozás visszaigazolására sem vár
  const beatTimer = setInterval(() => {
    if (state?.running) void beat()
  }, BEAT_MS)

  const call = (fn: string, args: Record<string, unknown>): Promise<Result<unknown>> =>
    guard(async () => {
      const { data, error } = await client.rpc(fn, args)
      if (error) return fromError(error)
      return ok(data as unknown)
    })
  const callVoid = async (fn: string, args: Record<string, unknown>): Promise<Result<void>> => {
    const r = await call(fn, args)
    if (!r.ok) return r
    soon()
    return ok(undefined)
  }

  const session: KillerHandle = {
    myRole: () => state?.role ?? 'detective',
    useAbility: async (a, target) => {
      const payload: Record<string, unknown> =
        a === 'timeWarp' ? { mode: target?.mode ?? 'steal' } : a === 'textSwap' ? { char: target?.char, text: target?.text } : { cell: target?.cell }
      const r = await call('use_ability', { p_room: roomId, p_ability: a, p_payload: payload })
      if (!r.ok) return r
      const res = r.value as { ok?: boolean; ended?: boolean; cooldowns?: Record<KillerAbility, number> } | null
      if (res?.ended) return fail('conflict', 'game already ended')
      if (res?.cooldowns) for (const k of ABILITIES) cdExpire[k] = Date.now() + (res.cooldowns[k] ?? 0)
      soon()
      return ok(undefined)
    },
    cooldowns: () => ({ timeWarp: Math.max(0, cdExpire.timeWarp - Date.now()), textSwap: Math.max(0, cdExpire.textSwap - Date.now()), vanish: Math.max(0, cdExpire.vanish - Date.now()) }),
    sniff: async () => {
      const r = await call('sniff', { p_room: roomId })
      if (!r.ok) return r
      const res = r.value as { used?: boolean; ended?: boolean }
      soon()
      return res?.ended ? fail('conflict', 'game already ended') : ok({ used: res?.used === true })
    },
    callMeeting: () => callVoid('call_meeting', { p_room: roomId }),
    vote: (userId) => callVoid('vote_meeting', { p_room: roomId, p_target: userId }),
    epilogueVote: (userId) => callVoid('epilogue_vote', { p_room: roomId, p_target: userId }),
    proposeSubmit: () => callVoid('propose_submit', { p_room: roomId }),
    voteSubmit: (approve) => callVoid('vote_submit', { p_room: roomId, p_approve: approve }),
    reportSubmit: (correct) => callVoid('report_submit', { p_room: roomId, p_correct: correct }),
    onMeeting: meetingCbs.on,
    onEpilogue: epilogueCbs.on,
    onEnd: endCbs.on,
    onFx: fxCbs.on,
    onSubmit: submitCbs.on,
    onSniff: sniffCbs.on,
    state: () => state,
    onState: stateCbs.on,
    refresh: beat,
    serverNow,
    result: async () => {
      const r = await call('killer_result', { p_room: roomId })
      if (!r.ok) return r
      const x = r.value as (Omit<KillerResult, 'killerIds'> & { killerIds: string[] }) | null
      return ok(x ? ({ ...x, killerIds: (x.killerIds ?? []).map(String) } as KillerResult) : null)
    },
    close() {
      closed = true
      clearInterval(beatTimer)
      clearTimeout(deadlineTimer)
      clearTimeout(refreshTimer)
      void client.removeChannel(channel)
    },
  }
  return session
}

const endFromResult = (x: KillerResult): EndPayload => ({
  outcome: x.outcome, killerId: x.killerIds[0] ?? '', killerIds: x.killerIds, reason: x.reason, elapsedMs: x.elapsedMs, abilityLog: x.abilityLog,
})
