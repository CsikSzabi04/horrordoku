import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LOOKS } from '../content/looks'
import { EventPortrait } from './EventPortrait'

// A lény-portrék ("creature" figurák): minden lénynek külön rajza van, és mindegyik visel kiegészítőt (sál, sapka, szemüveg, kendő, jelvény).
const creatures = Object.entries(LOOKS).flatMap(([id, l]) => (l.k === 'c' ? [{ id, c: l.c }] : []))

describe('Esemény-lények', () => {
  it('mindegyik lény érvényes SVG-t rajzol, és mindegyik külön rajzot ad', () => {
    expect(creatures.length).toBeGreaterThanOrEqual(36)
    const seen = new Map<string, string>()
    for (const { id, c } of creatures) {
      const svg = renderToStaticMarkup(createElement(EventPortrait, { id }))
      expect(svg.startsWith('<svg'), id).toBe(true)
      expect(svg.length, id).toBeGreaterThan(600)
      // a gradient-azonosító (useId) a rajzban változik, ezért kivesszük az összehasonlításhoz
      const body = svg.replace(/id="[^"]*"/g, '').replace(/url\(#[^)]*\)/g, '')
      expect(seen.get(body), `${id} ugyanazt rajzolja, mint ${seen.get(body)}`).toBeUndefined()
      seen.set(body, id)
      expect(svg, id).toContain('role="img"')
      expect(c, id).toBeTruthy()
    }
  })

  // Kontaktlap a szemrevételezéshez: CREATURE_SHEET=<fájl.html> npx vitest run src/components/EventPortrait.creatures.test.ts
  const sheet = process.env.CREATURE_SHEET
  const tile = Number(process.env.CREATURE_TILE ?? 160)
  const only = process.env.CREATURE_ONLY?.split(',')
  it.runIf(!!sheet)('kontaktlap írása', () => {
    const figs = creatures
      .filter(({ id }) => !only || only.includes(id))
      .map(({ id }) => `<figure><div class="pic">${renderToStaticMarkup(createElement(EventPortrait, { id }))}</div><figcaption>${id}</figcaption></figure>`)
      .join('')
    fs.writeFileSync(
      sheet!,
      `<!doctype html><meta charset="utf-8"><style>body{background:#0e0c12;color:#ddd;font:12px system-ui;margin:12px}.row{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:${tile}px;text-align:center}.pic{width:${tile}px;height:${Math.round(tile * 1.2)}px;border:1px solid #444;border-radius:6px;overflow:hidden}svg{display:block;width:100%;height:100%}</style><div class="row">${figs}</div>`,
    )
    expect(fs.existsSync(sheet!)).toBe(true)
  })
})
