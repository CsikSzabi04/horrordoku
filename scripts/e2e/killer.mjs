// NIGHTDOKU e2e: Gyilkos mód — a kliens felülete a szerver (kamu) állapotából: szerepkártya, állapotsáv, a gyilkos képességei, a nyomozó
// Szimatja és Gyűlése, a közös beküldés (javaslat → ellenőrzés), az Epilógus és a vég-ablak. Két forgatókönyv: gyilkos és nyomozó.
// KAMU Supabase (a hálózati hívásokat elfogjuk; a Realtime websocketet letiltjuk, ezért az állapot a szívverésből — `killer_beat` — érkezik,
// a szívverést 400 ms-ra gyorsítjuk). Valódi fiókhoz / projekthez nem nyúlunk. A szerver-szabályokat a `supabase/tests` SQL-tesztjei fedik.
// Előfeltétel: `npm run dev` fut, `.env`-ben VITE_SUPABASE_*.
import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import puppeteer from 'puppeteer-core'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
const puzzle = JSON.parse(fs.readFileSync(new URL('../../puzzles/classic/classic-1-01-flower-store.json', import.meta.url), 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const blockedCell = puzzle.objects.find((o) => o.blocking).at

async function scenario(role) {
  const killer = role === 'killer'
  const tag = `[${role}] `
  const check = (n, c, x = '') => ok(tag + n, c, x)
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  await p.setViewport({ width: 1500, height: 1000 })
  const errors = []
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  const uid = '11111111-2222-3333-4444-555555555555'
  const others = ['bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000004']
  const names = { [uid]: 'Tesztelo', [others[0]]: 'Anna', [others[1]]: 'Bela', [others[2]]: 'Csaba' }
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 't@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { username: 'Tesztelo' }, app_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' }
  const session = { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }
  const room = { id: 'aaaaaaaa-0000-0000-0000-000000000009', code: 'KIL123', name: 'Gyilkos-szoba', mode: 'killer', puzzle_ref: 'classic-1-01-flower-store', status: 'playing', is_open: true, max_players: 4, host_id: others[0], settings: { timeLimit: 600, lives: 3, meetings: 2, sniffPerDetective: 1 }, state: {}, state_rev: 0, started_at: new Date(Date.now() - 60_000).toISOString(), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }

  // ---- a kamu szerver játékállapota (egy játékos szemszögéből)
  const S = {
    over: false, role, phase: 'play', lives: 3, maxLives: 3, startedAt: Date.now() - 60_000, timeLimitMs: 600_000, penaltyMs: 0, speed: [], seals: [],
    meeting: null, meetingsLeft: 2, submit: null, epilogue: null, players: 4, showPlacers: false, telltale: false, exposedKillers: [], exposed: false,
    sniffsLeft: killer ? 0 : 1, canCallMeeting: !killer, silencedMs: 0, gameId: 1,
    ...(killer ? { cooldowns: { timeWarp: 0, textSwap: 0, vanish: 0 }, abilities: { timeWarp: true, textSwap: true, vanish: true }, busyMs: 0, killerGone: false } : {}),
  }
  const calls = []
  const snapshot = () => ({ running: !S.over, now: Date.now(), ...S })
  const result = () => ({ gameId: 1, outcome: 'detectives', reason: 'identified', lives: S.lives, elapsedMs: 123456, killerIds: [others[1]], roles: { [uid]: role, [others[1]]: 'killer' }, abilityLog: [{ ability: 'timeWarp', at: 1 }, { ability: 'vanish', at: 2 }] })

  await p.setRequestInterception(true)
  p.on('request', (r) => {
    const u = r.url()
    if (!u.includes('.supabase.co')) return r.continue()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
    const json = (body, status = 200) => r.respond({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const rpc = /\/rpc\/([a-z_]+)/.exec(u)?.[1]
    const args = r.postData() ? JSON.parse(r.postData()) : {}
    if (rpc && rpc !== 'killer_beat' && rpc !== 'killer_state') calls.push({ fn: rpc, args })
    const single = (r.headers().accept ?? '').includes('vnd.pgrst.object')
    if (u.includes('/auth/v1/token')) return json(session)
    if (u.includes('/auth/v1/user')) return json(user)
    if (rpc === 'my_invites') return json([{ room_id: room.id, code: room.code, mode: 'killer', from_username: 'Anna' }])
    if (rpc === 'join_room') return json(room)
    if (rpc === 'my_rooms') return json([])
    // --- a Gyilkos-mód szerver-függvényei
    if (rpc === 'killer_beat' || rpc === 'killer_state') return json(S.over ? { running: false, now: Date.now() } : snapshot())
    if (rpc === 'killer_result') return json(S.over ? result() : null)
    if (rpc === 'use_ability') {
      if (S.cooldowns) S.cooldowns[args.p_ability] = args.p_ability === 'timeWarp' ? 90_000 : 45_000
      return json({ ok: true, cooldowns: S.cooldowns })
    }
    if (rpc === 'sniff') { S.sniffsLeft = 0; return json({ used: true }) }
    if (rpc === 'call_meeting') { S.meeting = { phase: 'discuss', endsAt: Date.now() + 30_000, by: uid, voted: false }; S.canCallMeeting = false; S.meetingsLeft = 1; return json(null) }
    if (rpc === 'vote_meeting') { if (S.meeting) S.meeting.voted = true; return json(null) }
    if (rpc === 'propose_submit') { S.submit = { id: 'sub1', by: uid, phase: 'vote', endsAt: Date.now() + 15_000, voted: false }; return json('sub1') }
    if (rpc === 'vote_submit') { if (S.submit) S.submit.voted = true; return json(null) }
    if (rpc === 'report_submit') { if (S.submit) S.submit.voted = true; return json(null) }
    if (rpc === 'epilogue_vote') { if (S.epilogue) S.epilogue.voted = true; return json(null) }
    if (u.includes('/rest/v1/rooms')) return json(single ? room : [room])
    if (u.includes('/rest/v1/room_members')) return json([uid, ...others].map((id, i) => ({ user_id: id, joined_at: `2026-01-01T00:00:0${i}Z` })))
    if (u.includes('/rest/v1/profiles')) {
      const rows = [uid, ...others].map((id) => ({ id, username: names[id], avatar: 'candle' }))
      return json(u.includes('id=in.') ? rows : single ? rows[0] : [rows[0]])
    }
    if (rpc) return json([])
    if (u.includes('/rest/v1/')) return r.method() === 'GET' ? json([]) : json([], 201)
    return json({})
  })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('nd_tutorial', '1'); localStorage.setItem('nd:v1:guest:language', JSON.stringify('hu'))
    localStorage.setItem('nd_beat_ms', '400')
    window.WebSocket = class { constructor() { this.readyState = 0 } send() {} close() {} addEventListener() {} removeEventListener() {} }
  })
  await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.querySelector('[data-act="account"]').click())
  await p.waitForSelector('input[type="email"]')
  await p.type('input[type="email"]', 't@example.com'); await p.type('input[type="password"]', 'jelszo123')
  await p.evaluate(() => document.querySelector('form').requestSubmit())
  await p.waitForSelector('.menu')
  await p.evaluate(() => document.querySelectorAll('.mode')[4].click()) // Gyilkos
  await p.waitForSelector('.nd-person button', { timeout: 8000 })
  await p.evaluate(() => document.querySelector('.nd-person button').click()) // meghívó „Belépés”
  await p.waitForSelector('.board', { timeout: 10000 }).catch(() => {})
  check('a Gyilkos-szoba játéka megnyílt', !!(await p.$('.board')) && calls.some((c) => c.fn === 'join_room'))

  // ---- szerepkártya + állapotsáv
  await p.waitForSelector('[data-killer="role-card"]', { timeout: 6000 }).catch(() => {})
  check('szerepkártya: a saját szerepem (és csak az)', (await p.$eval('[data-killer="role-card"]', (e) => e.dataset.role).catch(() => '')) === role)
  const cardText = await p.evaluate(() => document.querySelector('[data-killer="role-card"]')?.innerText ?? '')
  check(killer ? 'szerepkártya: „TE VAGY A GYILKOS”' : 'szerepkártya: „Nyomozó vagy”', killer ? cardText.includes('TE VAGY A GYILKOS') : cardText.includes('Nyomozó vagy'), cardText)
  await p.evaluate(() => document.querySelector('[data-act="role-ok"]').click())
  await sleep(400)
  check('a szerepkártya bezárul', !(await p.$('[data-killer="role-card"]')))
  check('állapotsáv: a szerepem és 3 élet', (await p.$eval('[data-killer="status"]', (e) => e.dataset.role)) === role && (await p.evaluate(() => document.querySelector('.kh-lives')?.textContent ?? '')).startsWith('♥♥♥'))
  const clock = await p.evaluate(() => document.querySelector('[data-timer]').textContent)
  check('a fejléc a hátralévő időt mutatja (≈ 09:00, visszaszámlálás)', /^0[89]:\d\d$/.test(clock), clock)
  await p.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/killer-${role}-start.png` }).catch(() => {})

  // ---- szerep-specifikus eszközök
  if (killer) {
    check('a gyilkos látja a képességeit', !!(await p.$('[data-act="ab-time-steal"]')) && !!(await p.$('[data-act="ab-text"]')) && !!(await p.$('[data-act="ab-vanish"]')))
    check('a gyilkos nem lát Szimatot / Gyűlést', !(await p.$('[data-act="sniff"]')) && !(await p.$('[data-act="meeting"]')))
    await p.evaluate(() => document.querySelector('[data-act="ab-time-steal"]').click())
    await sleep(500)
    check('Időcsavar: a szerver-függvény a „steal” móddal', calls.some((c) => c.fn === 'use_ability' && c.args.p_ability === 'timeWarp' && c.args.p_payload.mode === 'steal'))
    check('Időcsavar után nincs üzenet / rendszersor (csak az óra viselkedik furcsán)', (await p.$$('.coop-chat .log i.sys')).length === 0 && (await p.evaluate(() => [...document.querySelectorAll('.nd-toast')].map((e) => e.textContent).filter((t) => !t.includes('Üdv újra')).length)) === 0)
    check('a hűtés látszik a gomb(ok)on', (await p.evaluate(() => document.querySelector('[data-act="ab-time-steal"]').disabled)) === true)
    // Szövegcsere: kijelölt kártya nélkül nem megy
    await p.evaluate(() => document.querySelector('[data-act="ab-text"]').click())
    await sleep(200)
    check('Szövegcsere kijelölt kártya nélkül: figyelmeztetés, nincs hívás', !calls.some((c) => c.fn === 'use_ability' && c.args.p_ability === 'textSwap'))
    await p.evaluate(() => document.querySelector('[data-char="amir"] .face').click())
    await p.evaluate(() => document.querySelector('[data-act="ab-text"]').click())
    await sleep(500)
    const ts = calls.find((c) => c.fn === 'use_ability' && c.args.p_ability === 'textSwap')
    check('Szövegcsere: a kijelölt kártyára, a valóditól eltérő hamis szöveggel', !!ts && ts.args.p_payload.char === 'amir' && ts.args.p_payload.text.length > 5 && ts.args.p_payload.text !== puzzle.characters.find((c) => c.id === 'amir').clueText.join(' '), JSON.stringify(ts))
    // Eltüntetés: célzó mód, majd egy foglalt tárgyra koppintás
    await p.evaluate(() => document.querySelector('[data-act="ab-vanish"]').click())
    await sleep(200)
    check('Eltüntetés: célzó mód (a gomb „Mégse”, útmutató látszik)', (await p.evaluate(() => document.body.innerText)).includes('Koppints egy foglalt tárgyra'))
    await p.evaluate((c) => document.querySelector(`[data-cell="${c}"]`).click(), puzzle.characters ? 'A1' : 'A1') // nem foglalt mező: nem történik semmi
    await sleep(150)
    check('Eltüntetés: nem foglalt mezőre nem megy', !calls.some((c) => c.fn === 'use_ability' && c.args.p_ability === 'vanish'))
    await p.evaluate((c) => document.querySelector(`[data-cell="${c}"]`).click(), blockedCell)
    await sleep(500)
    check('Eltüntetés: a foglalt tárgy mezőjére a szerver-függvény', calls.some((c) => c.fn === 'use_ability' && c.args.p_ability === 'vanish' && c.args.p_payload.cell === blockedCell))
  } else {
    check('a nyomozó látja a Szimatot és a Gyűlést', !!(await p.$('[data-act="sniff"]')) && !!(await p.$('[data-act="meeting"]')))
    check('a nyomozó nem lát képességeket', !(await p.$('[data-act="ab-text"]')) && !(await p.$('[data-act="ab-vanish"]')))
    check('a nyomozó állapota nem tartalmaz hűtést (a kliens sem tud a képességekről)', !(await p.evaluate(() => document.body.innerText)).includes('Időcsavar'))
    await p.evaluate(() => document.querySelector('[data-act="sniff"]').click())
    await sleep(600)
    check('Szimat: a szerver-függvény, a keret elfogy', calls.some((c) => c.fn === 'sniff') && (await p.evaluate(() => document.querySelector('[data-act="sniff"]').textContent)).includes('(0)'))
    // Gyűlés: vita → szavazás → eredmény
    await p.evaluate(() => document.querySelector('[data-act="meeting"]').click())
    await p.waitForSelector('[data-killer="meeting"]', { timeout: 4000 }).catch(() => {})
    check('Gyűlés: a vita fázis látszik visszaszámlálóval', (await p.evaluate(() => document.querySelector('[data-killer="meeting"]')?.innerText ?? '')).includes('Gyűlés — vita'))
    S.meeting = { phase: 'vote', endsAt: Date.now() + 20_000, by: uid, voted: false }
    await p.waitForSelector('[data-act="kvote"]', { timeout: 4000 }).catch(() => {})
    check('Gyűlés: szavazáskor a többi játékos gombjai (magamra nem) + tartózkodás', (await p.$$('[data-act="kvote"]')).length === 3 && !!(await p.$('[data-act="kvote-abstain"]')))
    await p.evaluate(() => document.querySelector('[data-act="kvote"]').click())
    await sleep(600)
    check('Gyűlés: a szavazat a szerverre megy, utána „szavaztál”', calls.some((c) => c.fn === 'vote_meeting' && c.args.p_target) && (await p.evaluate(() => document.querySelector('[data-killer="meeting"]')?.innerText ?? '')).includes('Szavaztál'))
    S.meeting = { phase: 'result', endsAt: Date.now() + 4000, by: uid, ejected: others[1], killerExposed: true }
    await sleep(900)
    check('Gyűlés: az eredmény (leleplezett gyilkos) látszik', (await p.evaluate(() => document.querySelector('[data-killer="meeting"]')?.innerText ?? '')).includes('Bela a gyilkos'))
    S.meeting = null
  }

  await p.keyboard.press('Escape') // a kijelölés megszűnik (különben az első kártyára kattintás kikapcsolná)
  // ---- közös beküldés: mind lerakva → javaslat → (a szerver jóváhagyja) → ellenőrzés: a kliens kiszámolja és jelenti
  for (const [ch, c] of Object.entries(puzzle.solution)) {
    await p.evaluate((id) => document.querySelector(`[data-char="${id}"] .face`).click(), ch)
    await p.evaluate((cc) => document.querySelector(`[data-cell="${cc}"]`).focus(), c)
    await p.keyboard.press('Enter')
  }
  check('mind lerakva', (await p.$$('.token')).length === puzzle.size, String((await p.$$('.token')).length))
  await p.evaluate(() => document.querySelector('[data-act="submit"]').click())
  await sleep(700)
  check('beküldés: a javaslat a szerverre megy (nem helyi döntés)', calls.some((c) => c.fn === 'propose_submit'))
  check('beküldés: a javaslat látszik', !!(await p.$('[data-coop="proposal"]')))
  S.submit = { ...S.submit, phase: 'verify', endsAt: Date.now() + 10_000, voted: false }
  await sleep(1400)
  const rep = calls.find((c) => c.fn === 'report_submit')
  check('ellenőrzés: a kliens kiszámolta és jelentette, hogy a tábla HELYES', !!rep && rep.args.p_correct === true, JSON.stringify(rep))
  check('ellenőrzés közben a beküldés gomb tiltott', await p.evaluate(() => document.querySelector('[data-act="submit"]').disabled))
  S.submit = null
  S.phase = 'epilogue'
  S.epilogue = { endsAt: Date.now() + 20_000, voted: false }
  await sleep(1000)
  if (!killer) {
    await p.waitForSelector('[data-act="kvote"]', { timeout: 4000 }).catch(() => {})
    check('Epilógus: a nyomozó a többi játékosra szavazhat (ki volt a gyilkos?)', (await p.$$('[data-act="kvote"]')).length === 3 && (await p.evaluate(() => document.body.innerText)).includes('Epilógus'))
    await p.evaluate(() => document.querySelectorAll('[data-act="kvote"]')[1].click())
    await sleep(600)
    check('Epilógus: a szavazat a szerverre megy', calls.some((c) => c.fn === 'epilogue_vote' && c.args.p_target === others[1]))
  } else {
    check('Epilógus: a gyilkos csak vár (nem szavazhat)', !(await p.$('[data-act="kvote"]')) && (await p.evaluate(() => document.body.innerText)).includes('nyomozók szavaznak'))
  }

  // ---- vég: a szerver lezárta a játékot → vég-ablak (a szerep szerint: nyomozók nyertek)
  S.over = true
  await p.waitForSelector('[data-result="killer-end"]', { timeout: 6000 }).catch(() => {})
  const end = await p.evaluate(() => document.querySelector('[data-result="killer-end"]')?.innerText ?? '')
  check('vég-ablak: a nyomozók győztek, a gyilkos neve, a képesség-napló', end.includes('A NYOMOZÓK GYŐZTEK') && end.includes('Bela') && end.includes('Időcsavar ×1') && end.includes('Eltüntetés ×1'), end)
  check(killer ? 'vég-ablak: a gyilkos számára vereség' : 'vég-ablak: a nyomozónak győzelem', killer ? end.includes('Most vesztettél') : end.includes('Te nyertél'), end)
  await p.screenshot({ path: `${process.env.SHOT_DIR ?? '.'}/killer-${role}-end.png` }).catch(() => {})
  await p.evaluate(() => document.querySelector('[data-act="killer-exit"]').click())
  await sleep(500)
  check('„Vissza a szobához”: kilép a játékból', !(await p.$('.board')))
  check('nincs JS hiba', errors.length === 0, errors.join('|'))
  await ctx.close()
}

await scenario('detective')
await scenario('killer')
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
