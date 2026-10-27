// NIGHTDOKU e2e: Együtt mód — a meghívó „Belépés” egyből a szobába visz, a közös tábla megnyílik és játszható, a közös beküldés átmegy,
// és a host a „Következő” gombbal új pályára viszi a szobát.
// KAMU Supabase (a hálózati hívásokat elfogjuk, a Realtime websockettel nem kapcsolódunk) — valódi fiókhoz / projekthez nem nyúlunk.
// Előfeltétel: `npm run dev` fut, `.env`-ben VITE_SUPABASE_*.
import fs from 'node:fs'
import { Buffer } from 'node:buffer'
import puppeteer from 'puppeteer-core'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
const puzzle = JSON.parse(fs.readFileSync(new URL('../../puzzles/classic/classic-1-01-flower-store.json', import.meta.url), 'utf8'))
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })

async function scenario(hostMe) {
  const tag = hostMe ? '[host] ' : '[tag] '
  const check = (n, c, x = '') => ok(tag + n, c, x)
  const ctx = await b.createBrowserContext() // külön böngésző-profil: nem marad belépve az előző forgatókönyvből
  const p = await ctx.newPage()
  await p.setViewport({ width: 1400, height: 950 })
  const errors = []
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  const uid = '11111111-2222-3333-4444-555555555555'
  const other = 'bbbbbbbb-0000-0000-0000-000000000002'
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 't@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { username: 'Tesztelo' }, app_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' }
  const session = { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }
  const room = { id: 'aaaaaaaa-0000-0000-0000-000000000001', code: '0B5425', name: 'Elso', mode: 'together', puzzle_ref: 'classic-1-01-flower-store', status: 'playing', is_open: true, max_players: 2, host_id: hostMe ? uid : other, settings: {}, state: {}, state_rev: 0, started_at: new Date(Date.now() - 65_000).toISOString(), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
  const calls = []
  await p.setRequestInterception(true)
  p.on('request', (r) => {
    const u = r.url()
    if (!u.includes('.supabase.co')) return r.continue()
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
    const json = (body, status = 200) => r.respond({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const rpc = /\/rpc\/([a-z_]+)/.exec(u)?.[1]
    if (rpc) calls.push(`${rpc} ${r.postData() ?? ''}`)
    const single = (r.headers().accept ?? '').includes('vnd.pgrst.object')
    if (u.includes('/auth/v1/token')) return json(session)
    if (u.includes('/auth/v1/user')) return json(user)
    if (rpc === 'my_invites') return json([{ room_id: room.id, code: room.code, mode: 'together', from_username: 'Szabj04' }])
    if (rpc === 'join_room') return json(room)
    if (rpc === 'configure_room') {
      const body = JSON.parse(r.postData() ?? '{}')
      if (body.p_puzzle_ref) room.puzzle_ref = body.p_puzzle_ref
      return json(room)
    }
    if (rpc === 'start_room') {
      room.status = 'playing'
      room.started_at = new Date().toISOString()
      return json(room)
    }
    if (rpc === 'my_rooms') return json([])
    if (u.includes('/rest/v1/rooms')) return json(single ? room : [room])
    if (u.includes('/rest/v1/room_members')) return json([{ user_id: other, joined_at: '2026-01-01T00:00:00Z' }, { user_id: uid, joined_at: '2026-01-01T00:00:01Z' }])
    if (u.includes('/rest/v1/profiles')) {
      const rows = [{ id: uid, username: 'Tesztelo', avatar: 'candle' }, { id: other, username: 'Szabj04', avatar: 'candle' }]
      return json(u.includes('id=in.') ? rows : single ? rows[0] : [rows[0]])
    }
    if (rpc) return json([])
    if (u.includes('/rest/v1/')) return r.method() === 'GET' ? json([]) : json([], 201)
    return json({})
  })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('nd_tutorial', '1'); localStorage.setItem('nd:v1:guest:language', JSON.stringify('hu'))
    // a Realtime-kapcsolatot nem építjük fel (a kamu szerverhez nincs websocket)
    window.WebSocket = class { constructor() { this.readyState = 0 } send() {} close() {} addEventListener() {} removeEventListener() {} }
  })
  await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.querySelector('[data-act="account"]').click())
  await p.waitForSelector('input[type="email"]')
  await p.type('input[type="email"]', 't@example.com'); await p.type('input[type="password"]', 'jelszo123')
  await p.evaluate(() => document.querySelector('form').requestSubmit())
  await p.waitForSelector('.menu')
  await p.evaluate(() => document.querySelectorAll('.mode')[3].click()) // Együtt
  await p.waitForSelector('.nd-person button', { timeout: 8000 })
  await p.evaluate(() => document.querySelector('.nd-person button').click()) // meghívó „Belépés”
  await p.waitForSelector('.board', { timeout: 10000 }).catch(() => {})
  check('a meghívóból egyből a szobába (és a játékba) visz', calls.some((c) => c.startsWith('join_room') && c.includes('0B5425')))
  check('nem kellett a kódot begépelni (nincs kód-mező / előnézet)', !(await p.$('input[maxlength="6"]')) && !(await p.$('.nd-room.own')))
  check('a közös tábla megnyílt', !!(await p.$('.board')))
  await new Promise((r) => setTimeout(r, 2300))
  const text = await p.evaluate(() => document.body.innerText)
  check('a játékosok látszanak (Tesztelo, Szabj04)', text.includes('Tesztelo') && text.includes('Szabj04'))
  check('közös tippkeret látszik', text.includes('Közös tippkeret'))
  check('nincs beállítások gomb a közös játékban', !(await p.$('[data-act="settings"]')))
  check('a közös óra a szoba indulásától számol (>= 1 perc)', await p.evaluate(() => { const [m] = document.querySelector('[data-timer]').textContent.split(':'); return Number(m) >= 1 }))
  check(hostMe ? 'a Feladom gomb a hostnál látszik' : 'a Feladom gomb a társnál nem látszik', ((await p.$('[data-act="giveup"]')) !== null) === hostMe)
  // lerakás a táblán: karakter kiválasztása + hosszú nyomás
  await p.evaluate(() => document.querySelector('[data-char] .face').click())
  const cell = await p.$('[data-cell]')
  const bb = await cell.boundingBox()
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await new Promise((r) => setTimeout(r, 1200)); await p.mouse.up()
  check('a karakter lerakható a közös táblán', (await p.$$('.token')).length >= 1)
  check('a beküldés még le van tiltva (nincs minden lerakva)', await p.evaluate(() => document.querySelector('[data-act="submit"]').disabled))
  if (process.env.SHOT && hostMe) await p.screenshot({ path: process.env.SHOT })
  // minden karakter a helyére (az előző próbálkozás elmarad), közös beküldés
  for (const [ch, c] of Object.entries(puzzle.solution)) {
    await p.evaluate((id) => document.querySelector(`[data-char="${id}"] .face`).click(), ch)
    await p.evaluate((cc) => document.querySelector(`[data-cell="${cc}"]`).focus(), c)
    await p.keyboard.press('Enter')
  }
  check('mind lerakva', (await p.$$('.token')).length === puzzle.size, String((await p.$$('.token')).length))
  await p.evaluate(() => document.querySelector('[data-act="submit"]').click())
  // a kamu szobában a másik játékos nincs online (nincs Realtime) → a javaslat azonnal átmegy
  await p.waitForSelector('[data-result="won"]', { timeout: 15000 }).catch(() => {})
  check('a közös beküldés átment: megoldva', !!(await p.$('[data-result="won"]')))
  const next = await p.$('[data-act="finish-next"]')
  check(hostMe ? 'a hostnak van „Következő” gombja' : 'a társnak nincs „Következő” gombja (a host választ)', hostMe ? !!next : !next)
  if (!hostMe) check('a társ megjegyzést kap a host választásáról', (await p.evaluate(() => document.body.innerText)).includes('a host választja'))
  if (hostMe) {
    await new Promise((r) => setTimeout(r, 1200))
    check('a host kliense lezárta a játékot (finish_game)', calls.some((c) => c.startsWith('finish_game')))
    await p.evaluate(() => document.querySelector('[data-act="finish-next"]').click())
    await p.waitForFunction(() => document.querySelector('.gf-head .ttl')?.textContent.includes('A játszótér'), { timeout: 15000 }).catch(() => {})
    check('a „Következő” átállítja a pályát és újraindítja a játékot', calls.some((c) => c.startsWith('configure_room') && c.includes('classic-1-02')) && calls.some((c) => c.startsWith('start_room')))
    check('az új pályán új, üres tábla van', (await p.evaluate(() => document.querySelector('.gf-head .ttl')?.textContent ?? '')).includes('A játszótér') && (await p.$$('.token')).length === 0)
  }
  check('nincs JS hiba', errors.length === 0, errors.join('|'))
  await ctx.close()
}

await scenario(false)
await scenario(true)
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
