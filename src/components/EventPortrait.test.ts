import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { EVENTS } from '../content/events'
import { LOOKS } from '../content/looks'
import { EventPortrait } from './EventPortrait'

interface Ch { id: string; name: string; victim?: boolean }
const worlds = fs
  .readdirSync('puzzles/event')
  .sort()
  .map((f) => {
    const p = JSON.parse(fs.readFileSync(`puzzles/event/${f}`, 'utf8')) as { title: string; characters: Ch[] }
    return { title: p.title, characters: p.characters }
  })

describe('Esemény-portrék', () => {
  it('az Esemény-világok TELJES szereplő-készletéhez (a tartalék tagokhoz és az áldozatokhoz is) van rajzolt megjelenés', () => {
    const pool = EVENTS.flatMap((e) => [...(e.opts.cast ?? []), ...(e.opts.victim ? [e.opts.victim] : [])].map((c) => c.id))
    expect([...new Set(pool)].filter((id) => !(id in LOOKS))).toEqual([])
  })
  it('az Esemény-pályák MINDEN karakteréhez van rajzolt megjelenés', () => {
    const missing = worlds.flatMap((w) => w.characters.map((c) => c.id)).filter((id) => !(id in LOOKS))
    expect(missing).toEqual([])
  })
  // tartalék: a Random mód készletéhez maradó (jelenleg egyik pályában sem szereplő) karakterek
  const SPARE = new Set(EVENTS.flatMap((e) => [...(e.opts.cast ?? []), ...(e.opts.victim ? [e.opts.victim] : [])].map((c) => c.id)))
  it('nincs árva bejegyzés: minden megjelenés egy létező karakterhez tartozik', () => {
    const ids = new Set([...worlds.flatMap((w) => w.characters.map((c) => c.id)), ...content.characters().map((c) => c.id)])
    expect(Object.keys(LOOKS).filter((id) => !ids.has(id) && !SPARE.has(id))).toEqual([])
  })
  it('mindegyik portré érvényes SVG-t ad, és nem üres', () => {
    for (const id of Object.keys(LOOKS)) {
      const svg = renderToStaticMarkup(createElement(EventPortrait, { id }))
      expect(svg.startsWith('<svg'), id).toBe(true)
      expect(svg.length, id).toBeGreaterThan(400)
    }
  })
  it('ismeretlen azonosítóra nem rajzol semmit', () => {
    expect(renderToStaticMarkup(createElement(EventPortrait, { id: 'nincs-ilyen' }))).toBe('')
  })
  // Kontaktlap a szemrevételezéshez: PORTRAIT_SHEET=<fájl.html> npx vitest run src/components/EventPortrait.test.ts
  const sheet = process.env.PORTRAIT_SHEET
  it.runIf(!!sheet)('kontaktlap írása', () => {
    const html = worlds
      .map(
        (w) =>
          `<h3>${w.title}</h3><div class="row">${w.characters
            .map((c) => `<figure><div class="pic">${renderToStaticMarkup(createElement(EventPortrait, { id: c.id }))}</div><figcaption>${c.name}${c.victim ? ' †' : ''}</figcaption></figure>`)
            .join('')}</div>`,
      )
      .join('')
    fs.writeFileSync(
      sheet!,
      `<!doctype html><meta charset="utf-8"><style>body{background:#14111a;color:#ddd;font:13px system-ui;margin:16px}h3{margin:18px 0 6px}.row{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:118px;text-align:center}.pic{width:118px;height:142px;border:2px solid #555;border-radius:6px;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${html}`,
    )
    expect(fs.existsSync(sheet!)).toBe(true)
  })
})
