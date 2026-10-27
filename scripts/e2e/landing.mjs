// NIGHTDOKU e2e: a főoldal (`/`) — a játszható demó (Klasszikus 1-01), Tipp / Újra / hibás és helyes beküldés, HU/EN váltó, módok, világ-szabályok.
// Használat: `npm run dev` fut → node scripts/e2e/landing.mjs (SHOTS=<mappa>: képernyőképek is)
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const SHOTS = process.env.SHOTS
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let failed = 0
const ok = (n, c, x = '') => {
  console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x)
  if (!c) failed++
}

const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
const browser = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.evaluateOnNewDocument(() => {
  try { localStorage.clear() } catch {}
  // a „calm" mód kikapcsolja a lassú animációkat és villámot — a tesztben így gyorsabb
  try { localStorage.setItem('nd_calm', '1') } catch {}
})
await page.goto(BASE + '/', { waitUntil: 'networkidle2' })
await page.waitForSelector('#bd .cell')

ok('36 cells', (await page.$$('#bd .cell')).length === 36)
ok('no solve / scare / powers leftovers', (await page.evaluate(() => !document.getElementById('solveBtn') && !document.getElementById('scareOn') && !document.getElementById('scare') && !document.getElementById('powers'))))
ok('worlds section with 10 rule cards', (await page.$$eval('#worlds .pw > div', (e) => e.length)) === 10)
ok('rail: 19 worlds x2', (await page.$$eval('#rail > span', (e) => e.length)) === 38)
ok('modes: 100 levels / 95 cases', await page.evaluate(() => document.body.innerText.includes('100 levels') && document.body.innerText.includes('19 worlds · 95 cases')))
ok('no Hollowmere-style leftovers in text', await page.evaluate(() => !/Vlad Dr|Sacristy|Species|Jumpscare|Morrigan/i.test(document.body.innerText)))
ok('6 suspect cards', (await page.$$('#suspects .sus')).length === 6)

const SOL = { Amir: 'C1', Bruno: 'E2', Vlad: 'A3', Clara: 'F4', Daniel: 'B5', Elena: 'D6' }
const names = ['Amir', 'Bruno', 'Vlad', 'Clara', 'Daniel', 'Elena']
async function placeAll(map) {
  // a rögzített felső sáv ne takarja a mezőket (a kattintás előtt középre görgetünk)
  await page.evaluate(() => document.getElementById('dossier').scrollIntoView({ block: 'center' }))
  await sleep(150)
  for (const [i, n] of names.entries()) {
    await page.click(`#suspects .sus:nth-child(${i + 1})`)
    await page.click(`#bd .cell[data-id="${map[n]}"]`)
  }
}
// blocked cell refuses a piece
await page.click('#suspects .sus:nth-child(1)')
await page.click('#bd .cell[data-id="B3"]')
ok('blocked cell (shelf) refuses', (await page.$eval('#msg', (e) => e.textContent)).includes('shelf'), await page.$eval('#msg', (e) => e.textContent))
// wrong submission: swap Bruno/Daniel columns (valid permutation, wrong answer)
await placeAll({ ...SOL, Bruno: 'B2', Daniel: 'E5' })
ok('submit enabled when all placed', !(await page.$eval('#submitBtn', (e) => e.disabled)))
await page.click('#submitBtn')
await sleep(100)
ok('wrong submission counted', (await page.$eval('#counters', (e) => e.textContent)).includes('💀 1'), await page.$eval('#counters', (e) => e.textContent))
ok('wrong message shown', (await page.$eval('#msg', (e) => e.textContent)).includes('Wrong solution'))
await page.click('#resetBtn')
ok('reset clears tokens', (await page.$$('#bd .tok')).length === 0)
// hint
await page.click('#hintBtn')
await sleep(60)
ok('hint places one + counter', (await page.$$('#bd .tok')).length === 1 && (await page.$eval('#counters', (e) => e.textContent)).includes('💡 1'), await page.$eval('#counters', (e) => e.textContent))
ok('hint text names a character', /Clara|Amir|Bruno|Elena|Daniel|Vlad/.test(await page.$eval('#msg', (e) => e.textContent)))
await page.click('#resetBtn')
// correct solution
await placeAll(SOL)
await page.click('#submitBtn')
await sleep(100)
ok('solved', await page.$eval('#dossier', (e) => e.classList.contains('solved')))
ok('verdict names Daniel', (await page.$eval('#verdict', (e) => e.textContent)).includes('DANIEL'))
await page.evaluate(() => document.getElementById('case').scrollIntoView())
await sleep(500)
if (SHOTS) await page.screenshot({ path: SHOTS + '/landing-case.png' })
// language switch
await page.click('#langBtn')
await sleep(200)
ok('HU: lead translated', (await page.$eval('#case .lead', (e) => e.textContent)).includes('virágbolt'))
ok('HU: card clue translated', (await page.$eval('#suspects .sus:nth-child(1)', (e) => e.textContent)).includes('szék mellett'))
ok('HU: rail translated', (await page.$eval('#rail', (e) => e.textContent)).includes('Lemur Város Rendőrség'))
ok('HU: world rules translated', (await page.$eval('#worlds', (e) => e.textContent)).includes('Mozgásérzékelő'))
ok('HU: verdict translated', (await page.$eval('#verdict', (e) => e.textContent)).includes('A gyilkos: DANIEL'))
await page.evaluate(() => document.getElementById('worlds').scrollIntoView())
await sleep(600)
if (SHOTS) await page.screenshot({ path: SHOTS + '/landing-worlds-hu.png' })
await page.click('#langBtn')
await sleep(200)
await page.evaluate(() => document.getElementById('modes').scrollIntoView())
await sleep(800)
if (SHOTS) await page.screenshot({ path: SHOTS + '/landing-modes.png' })
await page.evaluate(() => document.getElementById('worlds').scrollIntoView())
await sleep(800)
if (SHOTS) await page.screenshot({ path: SHOTS + '/landing-worlds.png' })
ok('no page errors', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(failed ? `${failed} FAILED` : 'ALL PASS')
process.exit(failed ? 1 : 0)
