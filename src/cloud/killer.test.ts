import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorText } from './errors'
import { createKillerSession } from './killer'
import { fromError } from './result'

type Res = { data?: unknown; error?: unknown }
const ROOM = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function fake(rpc: Record<string, Res | ((args: unknown) => Res)> = {}) {
  const calls: { fn: string; args: unknown }[] = []
  let onInsert: ((p: { new: unknown }) => void) | undefined
  let removed = 0
  const ch: Record<string, unknown> = {}
  ch.on = (_t: string, _f: unknown, cb: (p: { new: unknown }) => void) => ((onInsert = cb), ch)
  ch.subscribe = (cb: (s: string) => void) => (cb('SUBSCRIBED'), ch)
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args })
      const r = rpc[fn]
      return (typeof r === 'function' ? r(args) : r) ?? { data: null, error: null }
    },
    channel: () => ch,
    removeChannel: async () => void removed++,
  } as unknown as SupabaseClient
  return { client, calls, event: (row: { id: number; kind: string; payload: Record<string, unknown> }) => onInsert?.({ new: row }), removed: () => removed }
}

const state = (over: Record<string, unknown> = {}) => ({
  running: true, now: Date.now(), gameId: 1, startedAt: Date.now(), phase: 'play', role: 'killer', lives: 3, maxLives: 3, timeLimitMs: 600_000, penaltyMs: 0, speed: [],
  cooldowns: { timeWarp: 0, textSwap: 45_000, vanish: 0 }, abilities: { timeWarp: true, textSwap: true, vanish: true }, ...over,
})
const settle = () => vi.advanceTimersByTimeAsync(300)

describe('KillerSession (kliens)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('feliratkozáskor szívverést küld, az állapotot átveszi (szerep, hűtések, szerver-óra)', async () => {
    const f = fake({ killer_beat: { data: state({ now: Date.now() + 5000 }), error: null } })
    const k = createKillerSession(f.client, ROOM)
    await settle()
    expect(f.calls[0]).toEqual({ fn: 'killer_beat', args: { p_room: ROOM } })
    expect(k.state()?.role).toBe('killer')
    expect(k.myRole()).toBe('killer')
    expect(Math.abs(k.serverNow() - (Date.now() + 5000))).toBeLessThan(50) // a szerver-óra eltolása
    expect(k.cooldowns().textSwap).toBeGreaterThan(44_000)
    expect(k.cooldowns().vanish).toBe(0)
    k.close()
  })

  it('a szerep alapból nyomozó, amíg az állapot meg nem érkezik', () => {
    const k = createKillerSession(fake().client, ROOM)
    expect(k.myRole()).toBe('detective')
    k.close()
  })

  it('a hatás-események eljutnak a felülethez, feladó nélkül; ugyanaz az esemény egyszer', async () => {
    const f = fake({ killer_beat: { data: state(), error: null } })
    const k = createKillerSession(f.client, ROOM)
    const seen: string[] = []
    k.onFx((fx) => seen.push(fx.type))
    f.event({ id: 1, kind: 'fx', payload: { type: 'clue_override', char: 'vlad', text: 'Hamis', ms: 5000 } })
    f.event({ id: 1, kind: 'fx', payload: { type: 'clue_override', char: 'vlad', text: 'Hamis', ms: 5000 } })
    f.event({ id: 2, kind: 'fx', payload: { type: 'object_vanish', cell: 'E3', ms: 8000, serverTime: 1 } })
    expect(seen).toEqual(['clue_override', 'object_vanish'])
    const before = f.calls.length
    await settle()
    expect(f.calls.length).toBeGreaterThan(before) // az esemény után az állapot a szervertől frissül
    k.close()
  })

  it('Gyűlés, Szimat, beküldés, Epilógus és vég események', async () => {
    const f = fake({ killer_beat: { data: state(), error: null } })
    const k = createKillerSession(f.client, ROOM)
    const got: unknown[] = []
    k.onMeeting((m) => got.push(['meeting', m.phase, m.ejected, m.killerExposed]))
    k.onSniff((s) => got.push(['sniff', s.used]))
    k.onSubmit((e) => got.push(['submit', e.state, e.livesLeft]))
    k.onEpilogue((e) => got.push(['epilogue', e.endsAt]))
    k.onEnd((r) => got.push(['end', r.outcome, r.killerId, r.killerIds, r.abilityLog]))
    f.event({ id: 1, kind: 'meeting', payload: { phase: 'discuss', endsAt: 5, by: 'u1' } })
    f.event({ id: 2, kind: 'meeting', payload: { phase: 'result', endsAt: 9, ejected: 'u2', killerExposed: true } })
    f.event({ id: 3, kind: 'sniff', payload: { used: true } })
    f.event({ id: 4, kind: 'submit', payload: { state: 'wrong', id: 's', by: 'u1', livesLeft: 2 } })
    f.event({ id: 5, kind: 'epilogue', payload: { endsAt: 77 } })
    f.event({ id: 6, kind: 'end', payload: { outcome: 'detectives', reason: 'identified', killerIds: ['u3'], abilityLog: [{ ability: 'vanish', at: 1 }], elapsedMs: 5000 } })
    expect(got).toEqual([
      ['meeting', 'discuss', undefined, undefined],
      ['meeting', 'result', 'u2', true],
      ['sniff', true],
      ['submit', 'wrong', 2],
      ['epilogue', 77],
      ['end', 'detectives', 'u3', ['u3'], [{ ability: 'vanish', at: 1 }]],
    ])
    expect(k.state()?.running).toBe(false) // a vég után nincs futó játék
    k.close()
  })

  it('képesség: a szerver-függvény megfelelő hívása és a hűtés átvétele', async () => {
    const f = fake({
      killer_beat: { data: state(), error: null },
      use_ability: { data: { ok: true, cooldowns: { timeWarp: 90_000, textSwap: 45_000, vanish: 60_000 } }, error: null },
    })
    const k = createKillerSession(f.client, ROOM)
    await settle()
    expect((await k.useAbility('timeWarp', { mode: 'speed' })).ok).toBe(true)
    expect((await k.useAbility('textSwap', { char: 'vlad', text: 'Hamis nyom' })).ok).toBe(true)
    expect((await k.useAbility('vanish', { cell: 'E3' })).ok).toBe(true)
    const abil = f.calls.filter((c) => c.fn === 'use_ability').map((c) => c.args)
    expect(abil).toEqual([
      { p_room: ROOM, p_ability: 'timeWarp', p_payload: { mode: 'speed' } },
      { p_room: ROOM, p_ability: 'textSwap', p_payload: { char: 'vlad', text: 'Hamis nyom' } },
      { p_room: ROOM, p_ability: 'vanish', p_payload: { cell: 'E3' } },
    ])
    expect(k.cooldowns().timeWarp).toBeGreaterThan(89_000)
    expect(k.cooldowns().vanish).toBeGreaterThan(59_000)
    k.close()
  })

  it('képesség: a Időcsavar alapból lopás; a szerver játékszabály-hibája érthető üzenet lesz', async () => {
    const f = fake({ use_ability: { data: null, error: { code: 'P0001', message: 'cooldown' } } })
    const k = createKillerSession(f.client, ROOM)
    const r = await k.useAbility('timeWarp')
    expect(f.calls.find((c) => c.fn === 'use_ability')?.args).toEqual({ p_room: ROOM, p_ability: 'timeWarp', p_payload: { mode: 'steal' } })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('invalid') // játékszabály-hiba, nem ütközés / jogosultság
    expect(!r.ok && errorText(r)).toBe('A képesség még hűl.')
    k.close()
  })

  it('a szerver játékszabály-hibái nem „ütközésként” jelennek meg', () => {
    for (const [msg, text] of [
      ['not now', 'Most nem lehet.'],
      ['ability limit reached', 'Ez a képesség már nem használható.'],
      ['no sniffs left', 'Elfogyott a Szimatod.'],
      ['no meetings left', 'Nincs több Gyűlés.'],
      ['another effect is active', 'A képesség még hűl.'],
    ] as const) {
      const r = fromError({ code: 'P0001', message: msg })
      expect(!r.ok && r.code, msg).toBe('invalid')
      expect(!r.ok && errorText(r), msg).toBe(text)
    }
  })

  it('Szimat, Gyűlés, szavazás, Epilógus, beküldés: a megfelelő függvények', async () => {
    const f = fake({ sniff: { data: { used: false }, error: null }, killer_result: { data: { gameId: 1, outcome: 'killer', reason: 'time', lives: 0, elapsedMs: 9, killerIds: ['u1'], roles: { u1: 'killer' }, abilityLog: [] }, error: null } })
    const k = createKillerSession(f.client, ROOM)
    expect(await k.sniff()).toEqual({ ok: true, value: { used: false } })
    await k.callMeeting()
    await k.vote('u2')
    await k.vote(null)
    await k.epilogueVote('u3')
    await k.proposeSubmit()
    await k.voteSubmit(true)
    await k.reportSubmit(false)
    const names = f.calls.filter((c) => c.fn !== 'killer_beat').map((c) => [c.fn, c.args])
    expect(names).toEqual([
      ['sniff', { p_room: ROOM }],
      ['call_meeting', { p_room: ROOM }],
      ['vote_meeting', { p_room: ROOM, p_target: 'u2' }],
      ['vote_meeting', { p_room: ROOM, p_target: null }],
      ['epilogue_vote', { p_room: ROOM, p_target: 'u3' }],
      ['propose_submit', { p_room: ROOM }],
      ['vote_submit', { p_room: ROOM, p_approve: true }],
      ['report_submit', { p_room: ROOM, p_correct: false }],
    ])
    const res = await k.result()
    expect(res.ok && res.value?.outcome).toBe('killer')
    k.close()
  })

  it('a lezáródott játékra a képesség / Szimat „ended” válasza hibaként jön', async () => {
    const f = fake({ use_ability: { data: { ok: false, ended: true }, error: null }, sniff: { data: { used: false, ended: true }, error: null } })
    const k = createKillerSession(f.client, ROOM)
    expect((await k.useAbility('vanish', { cell: 'B2' })).ok).toBe(false)
    expect((await k.sniff()).ok).toBe(false)
    k.close()
  })

  it('a következő határidőnél (Gyűlés vége) magától szívverést küld, hogy a szerver előrelépjen', async () => {
    const t0 = Date.now()
    const f = fake({ killer_beat: { data: state({ now: t0, meeting: { phase: 'discuss', endsAt: t0 + 30_000 } }), error: null } })
    const k = createKillerSession(f.client, ROOM)
    await settle()
    const n = f.calls.length
    await vi.advanceTimersByTimeAsync(31_000)
    expect(f.calls.length).toBeGreaterThan(n)
    k.close()
  })

  it('ha az „end” esemény kimaradt, a játék végét a szívverés utáni eredmény-lekérdezés pótolja (egyszer)', async () => {
    let running = true
    const f = fake({
      killer_beat: () => ({ data: running ? state() : { running: false, now: Date.now() }, error: null }),
      killer_result: { data: { gameId: 1, outcome: 'killer', reason: 'time', lives: 3, elapsedMs: 9, killerIds: ['u9'], roles: {}, abilityLog: [{ ability: 'vanish', at: 2 }] }, error: null },
    })
    const k = createKillerSession(f.client, ROOM)
    const ends: unknown[] = []
    k.onEnd((r) => ends.push([r.outcome, r.killerId, r.reason]))
    await settle()
    running = false
    await k.refresh()
    await k.refresh()
    await settle()
    expect(ends).toEqual([['killer', 'u9', 'time']])
    f.event({ id: 9, kind: 'end', payload: { outcome: 'killer', reason: 'time', killerIds: ['u9'], abilityLog: [], elapsedMs: 9 } })
    expect(ends).toHaveLength(1) // a késve érkező esemény nem duplázza
    k.close()
  })

  it('close(): a szívverés és a feliratkozás leáll', async () => {
    const f = fake({ killer_beat: { data: state(), error: null } })
    const k = createKillerSession(f.client, ROOM)
    await settle()
    k.close()
    const n = f.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(f.calls.length).toBe(n)
    expect(f.removed()).toBe(1)
  })
})
