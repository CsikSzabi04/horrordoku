// NIGHTDOKU e2e: menü → Klasszikus → A virágbolt végigjátszása (kiválasztás, betű-jegyzet, nyomva tartásos lerakás, ✕, radír, visszavonás,
// teljes törlés, sötét mód, beküldés), majd egy félbehagyott pálya folytatása és feladása. Használat: `npm run dev` fut → node scripts/e2e/classic.mjs
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
const puzzle = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../puzzles/classic/classic-1-01-flower-store.json', import.meta.url)), 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HOLD = 1000 // a nyomva tartás ideje (Board.tsx HOLD_MS)

let failed = 0
const ok = (name, cond, extra = '') => {
  console.log(cond ? '  PASS' : '  FAIL', name, cond ? '' : extra)
  if (!cond) failed++
}

const browser = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.evaluateOnNewDocument(() => {
  if (!sessionStorage.getItem('init')) {
    sessionStorage.setItem('init', '1')
    try {
      localStorage.clear()
    } catch {
      /* */
    }
  }
})
const placeKey = async (ch, cell) => {
  await page.click(`[data-char="${ch}"] .face`)
  await page.focus(`[data-cell="${cell}"]`)
  await page.keyboard.press('Enter') // billentyűzettel azonnal lerak
}

await page.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
const modes = await page.$$('.mode')
ok('menü: 5 mód', modes.length === 5, String(modes.length))
await modes[0].click()
await page.waitForSelector('[data-puzzle]')
const cases = await page.$$eval('[data-puzzle]', (els) => els.map((e) => e.dataset.puzzle))
ok('Klasszikus: 100 pálya + 2 bónusz', cases.filter((c) => c.startsWith('classic-')).length === 100 && cases.filter((c) => c.startsWith('bonus-')).length === 2, String(cases.length))
// szűrők: szint-fülek (szintenként 20), rendezés, elrejtés
for (const d of [1, 2, 3, 4, 5]) {
  await page.click(`[data-filter="${d}"]`)
  const lv = await page.$$eval('main > section:first-of-type .case', (c) => c.map((e) => e.dataset.level))
  ok(`szint ${d}: 20 pálya, mind ilyen szintű`, lv.length === 20 && lv.every((x) => x === String(d)), String(lv.length))
}
await page.click('[data-filter="0"]')
await page.select('select[data-sort]', 'size')
const sizes = await page.$$eval('main > section:first-of-type .case small', (e) => e.map((x) => Number(x.textContent.split('×')[0])))
ok('rendezés méret szerint', sizes.every((v, i) => i === 0 || v >= sizes[i - 1]))
await page.select('select[data-sort]', 'difficulty')
ok('alapból sötét: a lista háttere fekete, a csempék sötétek', (await page.$eval('body', (b) => getComputedStyle(b).backgroundColor)) !== 'rgb(255, 255, 255)' && (await page.$eval('.case', (c) => getComputedStyle(c).backgroundColor)) === 'rgb(21, 17, 29)')
await page.click('[data-act="dark"]')
ok('világos mód: a lista háttere is fehér, a csempék fehérek', (await page.$eval('body', (b) => getComputedStyle(b).backgroundColor)) === 'rgb(255, 255, 255)' && (await page.$eval('.case', (c) => getComputedStyle(c).backgroundColor)) === 'rgb(255, 255, 255)')
await page.click('[data-act="dark"]')

await page.click('[data-puzzle="classic-1-01-flower-store"]')
await page.waitForSelector('.board')
ok('bemutató megjelenik elsőre', !!(await page.$('.tutorial[data-step="1"]')))
for (let i = 0; i < 12 && (await page.$('.tutorial[data-step]')); i++) {
  const btns = await page.$$('.tutorial .row button')
  await btns[btns.length - 1].click()
  await sleep(80)
}
ok('bemutató bezárul', !(await page.$('.tutorial[data-step]')))

// elrendezés: bal oszlop · térkép · jobb szélső eszközök; fekete keret, fehér játék
const x = async (sel) => (await (await page.$(sel)).boundingBox()).x
ok('elrendezés: bal < közép < jobb', (await x('.gf-left')) < (await x('.board')) && (await x('.board')) < (await x('.gf-tools')))
ok('fejléc: logó, nyelvváltó, sötét mód, idő', !!(await page.$('.gf-head .logo')) && !!(await page.$('.gf-head select.lang')) && !!(await page.$('[data-act="dark"]')) && !!(await page.$('[data-timer]')))
const bg = (sel) => page.$eval(sel, (e) => getComputedStyle(e).backgroundColor)
ok('alapból sötét: fekete keret, sötét játék-lap', (await bg('.gf')) === 'rgb(7, 6, 10)' && (await bg('.gf-board')) === 'rgb(21, 17, 29)', `${await bg('.gf')} / ${await bg('.gf-board')}`)
await page.click('[data-act="dark"]')
ok('világos mód: az oldal és a lapok is fehérek', (await page.$eval('.gf', (g) => g.dataset.dark)) === '0' && (await bg('.gf')) === 'rgb(255, 255, 255)' && (await bg('.gf-board')) === 'rgb(255, 255, 255)' && (await page.$eval('body', (b) => getComputedStyle(b).backgroundColor)) === 'rgb(255, 255, 255)')
await page.click('[data-act="dark"]')
ok('vissza sötétre', (await bg('.gf')) === 'rgb(7, 6, 10)' && (await bg('.gf-board')) === 'rgb(21, 17, 29)')
ok('mezők és karakterek', (await page.$$('.cell')).length === puzzle.size ** 2 && (await page.$$('.suspect')).length === puzzle.size)
ok('arcképek (rajzolt), ♂/♀ jelvény', (await page.$$('.suspect svg')).length === puzzle.size && (await page.$$('.suspect .gender')).length >= puzzle.size - 1)
const names = await page.$$eval('.suspect .name', (e) => e.map((n) => n.textContent))
ok('kezdőbetűk egyediek, az áldozat V', new Set(names.map((n) => n[0])).size === puzzle.size && names[names.length - 1].startsWith('V'), names.join())
ok('zuhanó animáció a térképen és a kártyákon', (await page.$eval('.cell', (c) => getComputedStyle(c).animationName.includes('nd-fall'))) && (await page.$eval('.suspect', (c) => getComputedStyle(c).animationName.includes('nd-card-fall'))))
await sleep(2300) // a belépő animáció lecsengése

// koppintás = betű (jegyzet), nem lerakás
const free = await page.$$eval('.cell:not(.blocking)', (c) => c.slice(0, 3).map((e) => e.dataset.cell))
const first = puzzle.characters[0].id
await page.click(`[data-char="${first}"] .face`)
await page.click(`[data-cell="${free[0]}"]`)
ok('koppintás: betű a mezőn, nincs karakter', (await page.$$(`[data-cell="${free[0]}"] .letter:not(.pv)`)).length === 1 && (await page.$$('.token')).length === 0)
await page.click(`[data-cell="${free[0]}"]`)
ok('újabb koppintás törli a betűt', (await page.$$(`[data-cell="${free[0]}"] .letter:not(.pv)`)).length === 0)

// X eszköz
await page.click('[data-tool="x"]')
await page.click(`[data-cell="${free[1]}"]`)
ok('✕ eszköz: kizárás', (await page.$$(`[data-cell="${free[1]}"] .x:not(.auto)`)).length === 1)
await page.click('[data-tool="x"]')

// lerakás: ~1 mp nyomva tartva, közben megtelő gyűrű
const target = puzzle.solution[first]
const box = await (await page.$(`[data-cell="${target}"]`)).boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await sleep(HOLD * 0.4)
ok('nyomva tartás: gyűrű látszik, még nincs lerakva', !!(await page.$(`[data-cell="${target}"] .ring`)) && (await page.$$('.token')).length === 0)
await sleep(HOLD * 0.9)
await page.mouse.up()
ok('~1 mp után a karakter lekerül', (await page.$$('.token')).length === 1)
ok('a karakter kártyája jelzi a helyét', !!(await page.$(`[data-char="${first}"].placed`)))

// visszavonás / újra
await page.click('[data-act="undo"]')
ok('visszavonás: a karakter felkerül a kártyára', (await page.$$('.token')).length === 0)
await page.click('[data-act="redo"]')
ok('újra: visszaáll', (await page.$$('.token')).length === 1)

// teljes törlés: a radírt nyomva tartva
const eb = await (await page.$('[data-tool="erase"]')).boundingBox()
await page.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2)
await page.mouse.down()
await sleep(HOLD * 1.3)
await page.mouse.up()
ok('radír nyomva tartva: minden törlődik', (await page.$$('.token')).length === 0 && (await page.$$('.x:not(.auto)')).length === 0)
await page.click('[data-act="undo"]')
ok('a teljes törlés egy lépésben visszavonható', (await page.$$('.token')).length === 1)

// rossz beküldés: két szereplő felcserélve → zöld / piros karikák, döntés: elölről vagy megnézem
await page.click('[data-tool="erase"]')
await page.click(`[data-cell="${puzzle.solution[first]}"]`)
await page.click('[data-tool="erase"]')
ok('radírral a mező törölhető', (await page.$$('.token')).length === 0)
const [c0, c1] = puzzle.characters
const swapped = { ...puzzle.solution, [c0.id]: puzzle.solution[c1.id], [c1.id]: puzzle.solution[c0.id] }
for (const ch of puzzle.characters) await placeKey(ch.id, swapped[ch.id])
await page.click('[data-act="submit"]')
await page.waitForSelector('[data-result="verdict"]', { timeout: 3000 })
await sleep(700)
ok('rossz beküldés: 2 piros és a többi zöld karika', (await page.$$('.vring.bad')).length === 2 && (await page.$$('.vring.ok')).length === puzzle.size - 2)
await page.click('[data-act="verdict-look"]')
ok('„megnézem": a karikák megmaradnak', (await page.$$('.vring')).length === puzzle.size && !(await page.$('[data-result="verdict"]')))
await page.click('[data-act="undo"]')
ok('módosítás után a karikák eltűnnek', (await page.$$('.vring')).length === 0)
await page.click('[data-act="redo"]')
await page.click('[data-act="submit"]')
await page.waitForSelector('[data-result="verdict"]', { timeout: 3000 })
await page.click('[data-act="verdict-restart"]')
ok('„elölről": a tábla üres', (await page.$$('.token')).length === 0 && (await page.$$('.vring')).length === 0)

// végigjátszás
for (const ch of puzzle.characters) if (!(await page.$(`[data-char="${ch.id}"].placed`))) await placeKey(ch.id, puzzle.solution[ch.id])
ok('mind lerakva', (await page.$$('.token')).length === puzzle.size)
ok('nincs ütközés-jelzés', (await page.$$('.token.bad')).length === 0)
await page.click('[data-act="submit"]')
await page.waitForSelector('[data-result="won"]', { timeout: 5000 })
const murderer = puzzle.characters.find((c) => c.id === puzzle.murderer).name
ok('győzelem, a gyilkos neve', (await page.$eval('[data-result="won"]', (e) => e.textContent)).includes(murderer))
const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('nd:v1:guest:progress') ?? '{}'))
ok('haladás: megoldva', progress.puzzles?.[puzzle.id]?.solved === true)
await page.click('[data-act="win-exit"]')
await page.waitForSelector('[data-puzzle]')
ok('vissza a listához, ✔ jelzéssel', await page.$eval(`[data-puzzle="${puzzle.id}"]`, (e) => e.classList.contains('done')))
await page.click('[data-act="hide-done"]')
ok('befejezettek elrejtése', !(await page.$(`[data-puzzle="${puzzle.id}"]`)) && (await page.$$('main > section:first-of-type .case')).length === 99)
await page.click('[data-act="hide-done"]')

// félbehagyott játék folytatása + feladás
await page.click('[data-puzzle="classic-1-02-playground"]')
await page.waitForSelector('.board')
await page.click('[data-act="hint"]')
await sleep(5000)
ok('a tipp 5 mp után is látszik (hosszan olvasható)', (await page.$$('.nd-toast')).length === 1)
await page.click('.nd-toast')
ok('a tipp kattintásra bezárható', (await page.$$('.nd-toast')).length === 0)
await page.click('[data-act="hint"]')
await sleep(10_800)
ok('a tipp ~10 mp után eltűnik', (await page.$$('.nd-toast')).length === 0)
await page.click('[data-act="exit"]')
await page.waitForSelector('[data-puzzle]')
ok('félbehagyott ügy: Folytatás', (await page.$eval('[data-puzzle="classic-1-02-playground"] .state', (e) => e.textContent)).includes('Folytatás'))
await page.click('[data-puzzle="classic-1-02-playground"]')
await page.waitForSelector('.board')
ok('a tipp megmaradt (2)', (await page.$eval('[data-act="hint"]', (e) => e.textContent)).includes('(2)'))
await page.click('[data-act="giveup"]')
await page.click('[data-act="giveup-yes"]')
await page.waitForSelector('[data-result="gaveup"]')
ok('feladás: megoldás látszik', (await page.$$('.token')).length >= 5)

ok('nincs JS hiba', errors.length === 0, errors.join(' | '))
await browser.close()
console.log(failed ? `\n${failed} HIBA` : '\nMINDEN OK')
process.exit(failed ? 1 : 0)
