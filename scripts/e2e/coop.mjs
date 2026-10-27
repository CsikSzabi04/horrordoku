// NIGHTDOKU e2e: Együtt mód — meghívó „Belépés” egyből a szobába visz, a közös tábla megnyílik és játszható.
// KAMU Supabase (a hálózati hívásokat elfogjuk, a Realtime websockettel nem kapcsolódunk) — valódi fiókhoz / projekthez nem nyúlunk.
// Előfeltétel: `npm run dev` fut, `.env`-ben VITE_SUPABASE_*.
import puppeteer from 'puppeteer-core'
import { Buffer } from 'node:buffer'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1400, height: 950 })
const errors = []
p.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
const uid = '11111111-2222-3333-4444-555555555555'
const other = 'bbbbbbbb-0000-0000-0000-000000000002'
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 't@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { username: 'Tesztelo' }, app_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' }
const session = { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }
const puzzleRef = 'classic-1-01-flower-store'
const room = { id: 'aaaaaaaa-0000-0000-0000-000000000001', code: '0B5425', name: 'Elso', mode: 'together', puzzle_ref: puzzleRef, status: 'playing', is_open: true, max_players: 2, host_id: other, settings: {}, state: {}, state_rev: 0, started_at: new Date(Date.now() - 65_000).toISOString(), created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
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
  localStorage.setItem('nd_tutorial', '1')
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
await p.waitForFunction(() => document.body.innerText.includes('Szabj04'), { timeout: 8000 })
ok('a meghívó látszik a lobbyban', true)
await p.evaluate(() => document.querySelector('.nd-person button').click()) // meghívó „Belépés”
await p.waitForSelector('.board', { timeout: 10000 }).catch(() => {})
ok('a meghívóból egyből a szobába (és a játékba) visz', calls.some((c) => c.startsWith('join_room') && c.includes('0B5425')))
ok('nem kellett a kódot begépelni (nincs kód-mező / előnézet)', !(await p.$('input[maxlength="6"]')) && !(await p.$('.nd-room.own')))
ok('a közös tábla megnyílt', !!(await p.$('.board')))
await new Promise((r) => setTimeout(r, 2300))
const text = await p.evaluate(() => document.body.innerText)
ok('a játékosok látszanak (Tesztelo, Szabj04)', text.includes('Tesztelo') && text.includes('Szabj04'))
ok('közös tippkeret látszik', text.includes('Közös tippkeret'))
ok('nincs beállítások gomb a közös játékban', !(await p.$('[data-act="settings"]')))
ok('a közös óra a szoba indulásától számol (>= 1 perc)', await p.evaluate(() => { const [m] = document.querySelector('[data-timer]').textContent.split(':'); return Number(m) >= 1 }))
// lerakás a táblán: karakter kiválasztása + hosszú nyomás
await p.evaluate(() => document.querySelector('[data-char] .face').click())
const cell = await p.$('[data-cell]')
const bb = await cell.boundingBox()
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await new Promise((r) => setTimeout(r, 1200)); await p.mouse.up()
ok('a karakter lerakható a közös táblán', (await p.$$('.token')).length >= 1)
ok('a beküldés még le van tiltva (nincs minden lerakva)', await p.evaluate(() => document.querySelector('[data-act="submit"]').disabled))
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT })
ok('nincs JS hiba', errors.length === 0, errors.join('|'))
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
