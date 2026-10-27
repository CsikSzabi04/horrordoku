// NIGHTDOKU e2e (puppeteer-core + Brave/Chrome). Előfeltétel: `npm run dev` fut. Env: BASE (alap http://localhost:5173), BRAVE (böngésző exe).
import puppeteer from 'puppeteer-core'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 900 })
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('nd_tutorial', '1'); localStorage.setItem('nd:v1:guest:language', JSON.stringify('hu')) } })
const openRandom = async () => {
  await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
  const modes = await p.$$('.mode')
  for (const m of modes) if ((await m.evaluate((e) => e.textContent)).includes('Random')) { await m.click(); break }
  await p.waitForSelector('[data-act="new"]')
}
await openRandom()
ok('nincs félbehagyott ügy', !!(await p.$('.empty')))
await p.click('[data-level="3"]')
await p.click('[data-act="new"]')
await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300)) // a belépő animáció lecsengése
const n = await p.$$eval('.cell', (c) => c.length)
ok('8×8 tábla', n === 64, String(n))
// az ügykód a pálya címében van (Véletlen ügy XXXXXX) — a „Megosztás" gomb ezt másolja
const codeOf = async () => `3-${(await p.$eval('.gf-head .ttl', (e) => e.textContent)).match(/ügy ([0-9A-Z]+)/)[1]}`
const code = await codeOf()
ok('ügykód 3-xxxxxx', /^3-[0-9A-Z]{6}$/.test(code), code)
// lerakunk valakit az első szabad nem tiltott mezőre
await p.click('.suspect .face')
const cell = await p.$$eval('.cell:not(.blocking)', (c) => c[0].dataset.cell)
await p.focus(`[data-cell="${cell}"]`)
await p.keyboard.press('Enter') // billentyűzettel azonnal lerak
ok('lerakva 1', (await p.$$('.token')).length === 1)
await new Promise((r) => setTimeout(r, 3400)) // 3 mp-es automatikus mentés
await openRandom() // „újratöltés" után
ok('Folytatás-lista: 1 elem', (await p.$$('[data-session]')).length === 1)
await p.click('[data-session] .info')
await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300)) // a belépő animáció lecsengése
ok('állapot visszaállt (1 token)', (await p.$$('.token')).length === 1)
const code2 = await codeOf()
ok('ugyanaz az ügy', code === code2, `${code} vs ${code2}`)
await p.click('[data-act="exit"]')
await p.waitForSelector('[data-act="new"]')
// ügykód megnyitása
await p.type('input[aria-label="Ügykód"]', code)
await p.click('[data-act="open-code"]')
await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300)) // a belépő animáció lecsengése
ok('ügykóddal ugyanaz a tábla', (await codeOf()) === code && (await p.$$('.token')).length === 1)
await p.click('[data-act="exit"]')
await p.waitForSelector('[data-act="new"]')
// elvetés
await p.click('[data-act="discard"]')
await p.waitForSelector('.empty')
ok('elvetés után üres lista', true)
// napi ügy
await p.click('[data-act="daily"]')
await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300)) // a belépő animáció lecsengése
ok('napi ügy betölt', true)
const unlocks = await p.evaluate(() => JSON.parse(localStorage.getItem('nd:v1:guest:unlocks') ?? '{"items":[]}').items.length)
ok('karakterek feloldva', unlocks >= 6, String(unlocks))
ok('nincs JS hiba', errors.length === 0, errors.join('|'))
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
