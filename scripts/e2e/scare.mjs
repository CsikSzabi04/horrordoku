// NIGHTDOKU e2e (puppeteer-core + Brave/Chrome). Előfeltétel: `npm run dev` fut. Env: BASE (alap http://localhost:5173), BRAVE (böngésző exe).
import puppeteer from 'puppeteer-core'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('nd_tutorial', '1') } catch {} })
await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
const r = await p.evaluate(async () => {
  const st = await import('/src/storage/index.ts')
  const fx = await import('/src/fx/index.ts')
  await st.getStorage().patchSettings({ jumpscare: 'on', photosensitive: false })
  await new Promise((r) => setTimeout(r, 200))
  const out = {}
  for (let i = 0; i < 40; i++) {
    const cancel = fx.scheduleScare('hollowmere')
    if (!cancel) { out.nullPlan = true; break }
    cancel()
  }
  let seen = null
  fx.scheduleScare('hollowmere')
  const t0 = Date.now()
  await new Promise((res) => { const iv = setInterval(() => { const el = document.querySelector('.nd-scare'); if (el || Date.now() - t0 > 7000) { seen = el ? { ms: Date.now() - t0, cls: el.className } : null; clearInterval(iv); res() } }, 50) })
  out.seen = seen
  await st.getStorage().patchSettings({ jumpscare: 'off' })
  await new Promise((r) => setTimeout(r, 200))
  out.offPlan = fx.scheduleScare('hollowmere')
  return out
})
console.log(JSON.stringify(r), errors.length ? errors : 'no js errors')
await b.close()
if (!r.seen || r.offPlan !== null || errors.length) process.exit(1)
