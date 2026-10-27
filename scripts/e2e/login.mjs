// NIGHTDOKU e2e: belépés KAMU Supabase-szel (a hálózati hívásokat elfogjuk — valódi fiókhoz nem nyúlunk). Előfeltétel: `npm run dev` fut, `.env`-ben VITE_SUPABASE_*.
import puppeteer from 'puppeteer-core'
import { Buffer } from 'node:buffer'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 900 })
const logs = []
p.on('pageerror', (e) => logs.push('PAGEERROR ' + String(e).slice(0, 400)))
const uid = '11111111-2222-3333-4444-555555555555'
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'teszt@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { username: 'Tesztelo' }, app_metadata: {}, identities: [{}], created_at: '2026-01-01T00:00:00Z' }
const session = { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user }
await p.setRequestInterception(true)
p.on('request', (r) => {
  const u = r.url()
  if (!u.includes('.supabase.co')) return r.continue()
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
  if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
  const json = (body, status = 200) => r.respond({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (u.includes('/auth/v1/token')) return json(session)
  if (u.includes('/auth/v1/user')) return json(user)
  if (u.includes('/rest/v1/profiles') && r.method() === 'GET') return json([{ id: uid, username: 'Tesztelo', xp: 0, coins: 0, streak: 0, best_streak: 0, avatar: 'x', updated_at: '2026-01-01T00:00:00Z' }])
  if (u.includes('/rest/v1/rpc/')) return json(true)
  if (u.includes('/rest/v1/')) return r.method() === 'GET' ? json([]) : json([], 201)
  return json({})
})
await p.evaluateOnNewDocument(() => { localStorage.setItem('nd_tutorial', '1'); localStorage.setItem('nd:v1:guest:language', JSON.stringify('hu')) })
await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
await p.evaluate(() => document.querySelector('[data-act="account"]').click())
await p.waitForSelector('input[type="email"]')
await p.type('input[type="email"]', 'teszt@example.com')
await p.type('input[type="password"]', 'jelszo123')
await p.evaluate(() => document.querySelector('form').requestSubmit())
await p.waitForSelector('.menu', { timeout: 8000 }).catch(() => {})
const state = await p.evaluate(() => ({ menu: !!document.querySelector('.menu'), text: document.body.innerText }))
ok('belépés után a főmenü látszik (nem üres oldal)', state.menu, state.text.slice(0, 200))
ok('a menü a belépett nevet mutatja', state.text.includes('Tesztelo'), state.text.slice(-200))
ok('nincs JS hiba', logs.length === 0, logs.join('|'))
// a profil is megnyílik belépve
await p.evaluate(() => document.querySelector('[data-act="account"]').click())
await new Promise((r) => setTimeout(r, 800))
ok('a névre koppintva a profil nyílik (nem üres oldal)', (await p.evaluate(() => document.body.innerText.length)) > 20)
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
