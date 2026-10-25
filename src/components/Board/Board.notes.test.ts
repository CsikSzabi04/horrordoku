// Ahol X van (kézi vagy sor/oszlop szerinti automatikus), ott a ceruzás jegyzet nem látszik — a közös tábla minden módban ezt csinálja.
import fs from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { boardEngine } from '../../engine'
import type { BoardView } from '../../game/controller'
import type { Puzzle } from '../../shared/puzzle'
import { Board } from './Board'

const first = fs.readdirSync('puzzles/classic').filter((f) => f.endsWith('.json')).sort()[0]!
const puzzle = JSON.parse(fs.readFileSync(`puzzles/classic/${first}`, 'utf8')) as Puzzle

const render = (view: Partial<BoardView> & Pick<BoardView, 'state'>, markers: Map<string, string>) =>
  renderToStaticMarkup(
    createElement(Board, {
      puzzle, selected: null, markers, person: true, floors: true, tool: 'letter', onTap: () => undefined, onHold: () => undefined,
      view: { peers: [], cursors: {}, clueOverrides: {}, vanished: [], locked: [], ...view } as BoardView,
    }),
  )

/** A megadott mező gombjának HTML-je. */
const cell = (html: string, id: string) => {
  const start = html.indexOf(`data-cell="${id}"`)
  expect(start, id).toBeGreaterThan(-1)
  const end = html.indexOf('</button>', start)
  return html.slice(start, end)
}

describe('jegyzet az X-es mezőn', () => {
  const ids = puzzle.characters.map((c) => c.id)
  const markers = new Map(ids.map((id, i) => [id, 'ABCDEFGHIJ'[i]!]))
  // egy karakter lerakása után a sorában/oszlopában automatikus X keletkezik
  const allCells = Array.from({ length: puzzle.size * puzzle.size }, (_, i) => `${String.fromCharCode(65 + (i % puzzle.size))}${Math.floor(i / puzzle.size) + 1}`)
  const at = allCells.find((c) => boardEngine.apply(puzzle, boardEngine.empty(), { op: 'place', char: ids[0]!, cell: c }).ok)!
  const placedState = boardEngine.apply(puzzle, boardEngine.empty(), { op: 'place', char: ids[0]!, cell: at })
  if (!placedState.ok) throw new Error('place failed')
  const auto = boardEngine.autoMarks(puzzle, placedState.state)
  const blockedCells = new Set(allCells.filter((c) => !boardEngine.apply(puzzle, boardEngine.empty(), { op: 'place', char: ids[1]!, cell: c }).ok))
  const crossedAuto = auto.find((c) => !blockedCells.has(c))! // a tárgy-blokkolt mezőn nem rajzolunk X-et
  const free = (() => {
    for (let r = 1; r <= puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) {
      const id = `${String.fromCharCode(65 + c)}${r}`
      if (!auto.includes(id) && id !== at && !blockedCells.has(id)) return id
    }
    throw new Error('no free cell')
  })()

  it('az automatikus X-es mezőn a jegyzet eltűnik, a szabad mezőn megmarad', () => {
    const state = { ...placedState.state, notes: { [crossedAuto]: [ids[1]!], [free]: [ids[1]!] } }
    const html = render({ state }, markers)
    expect(cell(html, crossedAuto)).toContain('x auto') // az X látszik
    expect(cell(html, crossedAuto)).not.toContain('letters') // a jegyzet nem
    expect(cell(html, free)).toContain('letters')
  })
  it('a kézi X-es mezőn is eltűnik a jegyzet', () => {
    const state = { placed: {}, marks: [free], notes: { [free]: [ids[1]!] } }
    const html = render({ state }, markers)
    expect(cell(html, free)).toContain('class="x"')
    expect(cell(html, free)).not.toContain('letters')
  })
  it('az X törlése után a jegyzet újra látszik (a jegyzet nem veszik el, csak el van rejtve)', () => {
    const state = { placed: {}, marks: [], notes: { [free]: [ids[1]!] } }
    expect(cell(render({ state }, markers), free)).toContain('letters')
  })
})
