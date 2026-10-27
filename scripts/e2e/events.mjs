// NIGHTDOKU e2e (puppeteer-core + Brave/Chrome). Előfeltétel: `npm run dev` fut. Env: BASE (alap http://localhost:5173), BRAVE (böngésző exe).
import puppeteer from 'puppeteer-core'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const BRAVE = process.env.BRAVE ?? 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
import fs from 'node:fs'
const DIR = new URL('../../puzzles/event/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
const b = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 1000 })
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
let failed = 0
const ok = (n, c, x = '') => { console.log(c ? '  PASS' : '  FAIL', n, c ? '' : x); if (!c) failed++ }
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', '1'); localStorage.clear(); localStorage.setItem('nd_tutorial', '1'); localStorage.setItem('nd:v1:guest:language', JSON.stringify('hu')) } })
await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
const byWorld = new Map()
for (const f of files) {
  const q = JSON.parse(fs.readFileSync(DIR + f, 'utf8'))
  byWorld.set(q.world, [...(byWorld.get(q.world) ?? []), q])
}
const worldIds = [...byWorld.keys()]
const openEvents = async () => {
  await p.goto(`${BASE}/play/`, { waitUntil: 'networkidle0' })
  await (await p.$$('.mode'))[1].click()
  await p.waitForSelector('[data-world]')
}
const openWorld = async (w) => {
  await p.click(`[data-world="${w}"]`)
  await p.waitForSelector('[data-puzzle]')
}
await openEvents()
ok(`Esemény lista: ${worldIds.length} világ`, (await p.$$('[data-world]')).length === worldIds.length)
ok(`összesen ${files.length} ügy, világonként 5`, files.length === worldIds.length * 5 && [...byWorld.values()].every((a) => a.length === 5))
// a világ ügyei sorban: 1..5, a következő megoldatlan kiemelve
await openWorld(worldIds[0])
const nos = await p.$$eval('[data-puzzle]', (e) => e.map((x) => x.dataset.no))
ok('a világ 5 ügye sorban (1–5)', nos.join(',') === '1,2,3,4,5', nos.join(','))
ok('a következő ügy ki van emelve', (await p.$$('.case.next')).length === 1)

// mentés: lerakunk 2 karaktert, kilépünk, újra belépünk → ugyanúgy ott vannak; a lista „Folytatás"-t mutat
{
  const q = byWorld.get(worldIds[0])[0]
  await p.click(`[data-puzzle="${q.id}"]`)
  await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300))
  const two = Object.entries(q.solution).filter(([c]) => !q.characters.find((x) => x.id === c).victim).slice(0, 2)
  for (const [ch, cell] of two) {
    await p.click(`[data-char="${ch}"] .face`)
    await p.focus(`[data-cell="${cell}"]`)
    await p.keyboard.press('Enter')
  }
  ok('2 karakter lerakva', (await p.$$('.token')).length === 2)
  await p.click('[data-act="exit"]')
  await p.waitForSelector('[data-puzzle]')
  ok('a lista „Folytatás"-t mutat', (await p.$eval(`[data-puzzle="${q.id}"] .state`, (e) => e.textContent)).includes('Folytatás'))
  await p.click(`[data-puzzle="${q.id}"]`)
  await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300))
  ok('belépéskor ugyanott vannak a karakterek', (await p.$$('.token')).length === 2)
  ok('nincs „frissült" üzenet', (await p.$$('.nd-toast')).length === 0)
  await p.click('[data-act="exit"]')
  await p.waitForSelector('[data-puzzle]')
  // elavult mentés: a pálya „ujjlenyomata" nem egyezik → eldobjuk, nem tesszük a megváltozott térképre
  await p.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.endsWith(':sessions')) {
        const f = JSON.parse(localStorage.getItem(k))
        for (const s of Object.values(f.sessions)) s.meta = { ...(s.meta ?? {}), fp: 'elavult' }
        localStorage.setItem(k, JSON.stringify(f))
      }
  })
  await openEvents()
  await openWorld(worldIds[0])
  ok('az elavult mentés nem mutat „Folytatás"-t', !(await p.$eval(`[data-puzzle="${q.id}"] .state`, (e) => e.textContent)).includes('Folytatás'))
  await p.click(`[data-puzzle="${q.id}"]`)
  await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300))
  ok('elavult mentésnél tiszta tábla', (await p.$$('.token')).length === 0)
  await p.waitForFunction(() => [...document.querySelectorAll('.nd-toast')].some((x) => x.textContent.includes('frissült')), { timeout: 6000 }).catch(() => {})
  ok('„a pálya frissült" üzenet', (await p.$$eval('.nd-toast', (e) => e.some((x) => x.textContent.includes('frissült')))))
}

// minden világból egy ügyet végigjátszunk; az ügy sorszáma világonként körbejár (1..5), így mindegyik méret / nehézség sorra kerül
for (const [wi, w] of worldIds.entries()) {
  const pz = byWorld.get(w)[wi % 5]
  await openEvents()
  await openWorld(w)
  await p.click(`[data-puzzle="${pz.id}"]`)
  await p.waitForSelector('.board')
  await new Promise((r) => setTimeout(r, 2300)) // a belépő animáció lecsengése
  const rule = pz.worldRule
  ok(`${pz.id}: szabály-sáv`, !!(await p.$(`[data-rule="${rule}"]`)))
  if (rule === 'cameras') ok('  kamera-gombok', (await p.$$('[data-cam]')).length === Object.keys(pz.rooms).length)
  if (rule === 'nightvision') ok('  éjjellátó ráb', !!(await p.$('.fog')))
  if (rule === 'light') ok('  fényes mezők', (await p.$$('.cell.lit')).length > 0)
  if (rule === 'radio') ok('  kitakart szó', (await p.$$eval('.suspect .clue', (e) => e.some((x) => x.textContent.includes('███')))))
  if (rule === 'totems') ok('  zárolt nyom 🔒', (await p.$$eval('.suspect .clue', (e) => e.some((x) => x.textContent.includes('🔒')))))
  if (rule === 'vacuum') {
    ok('  vákuum-mezők', (await p.$$('.cell.vac')).length > 0)
    ok('  páncél jelzés', (await p.$$eval('.suspect .race', (e) => e.some((x) => x.textContent.includes('🛡')))))
    const bad = pz.characters.find((c) => !c.armored)
    const vac = await p.$eval('.cell.vac', (e) => e.dataset.cell)
    await p.click(`[data-char="${bad.id}"] .face`)
    await p.focus(`[data-cell="${vac}"]`)
    await p.keyboard.press('Enter')
    ok('  páncél nélkül nem állhat vákuumba', (await p.$$('.token')).length === 0)
    await p.keyboard.press('Escape')
  }
  for (const [ch, cell] of Object.entries(pz.solution)) {
    await p.click(`[data-char="${ch}"] .face`)
    await p.focus(`[data-cell="${cell}"]`)
    await p.keyboard.press('Enter')
  }
  ok('  mind lerakva', (await p.$$('.token')).length === pz.size)
  await p.click('[data-act="submit"]')
  await p.waitForSelector('[data-result="won"]', { timeout: 5000 }).catch(() => {})
  ok('  megoldva', !!(await p.$('[data-result="won"]')))
}
ok('nincs JS hiba', errors.length === 0, errors.join('|'))
await b.close()
console.log(failed ? `${failed} HIBA` : 'MINDEN OK')
process.exit(failed ? 1 : 0)
