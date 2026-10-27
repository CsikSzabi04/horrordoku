import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Puzzle } from '../shared/puzzle'
import { buildGrid } from './grid'
import { unaryOk } from './rules'
import { categoryNames, clueText } from './text'

const on = (...types: string[]) => types.map((type, i) => ({ type, at: `A${i + 1}` }))
const p = (objects: { type: string; at: string }[]) => ({ rooms: {}, characters: [], objects })

describe('kategória-nyomok szövege: a pályán lévő tárgyak neve áll, mint a térképen', () => {
  it('egy tag a pályán → annak a neve (nem a kategória szava)', () => {
    expect(categoryNames('seat', on('wheelchair', 'carpet'))).toBe('kerekesszék')
    expect(clueText({ kind: 'besideCat', cat: 'seat' }, p(on('wheelchair')))).toBe('Egy **kerekesszék mellett** volt.')
    expect(clueText({ kind: 'notBesideCat', cat: 'seat' }, p(on('wheelchair')))).toBe('**Nem** volt **kerekesszék mellett**.')
  })
  it('több tag → felsorolás a pályán megjelenés sorrendjében („vagy"-gyal zárva)', () => {
    expect(categoryNames('seat', on('wheelchair', 'carpet', 'chair'))).toBe('kerekesszék vagy szék')
    expect(categoryNames('animal', on('lion', 'penguin', 'elephant'))).toBe('oroszlán, pingvin vagy elefánt')
  })
  it('többször szereplő tárgytípus egyszer számít; a kategórián kívüli tárgy nem kerül bele', () => {
    expect(categoryNames('seat', [...on('bench', 'bench', 'table'), { type: 'bench', at: 'F6' }])).toBe('pad')
  })
  it('a tárgy neve egyezik a térkép feliratával (a kategória szava sosem áll a kártyán)', () => {
    expect(clueText({ kind: 'besideCat', cat: 'seat' }, p(on('wheelchair')))).not.toContain('ülőhely')
    expect(clueText({ kind: 'besideCat', cat: 'plant' }, p(on('plant')))).toBe('Egy **cserepes növény mellett** volt.')
  })
})

describe('távolság-nyom: lépésekben számolva (jobbra / balra / fel / le / átlósan), a falak és tárgyak nem számítanak', () => {
  const fixture = JSON.parse(readFileSync('src/engine/fixtures/midnight-mass.json', 'utf8')) as Puzzle
  const g = buildGrid(fixture)
  // a fa az E6 mezőn áll (oszlop 4, sor 5), az egyetlen ilyen tárgy
  const at = (id: string) => ({ c: id.charCodeAt(0) - 65, r: Number(id.slice(1)) - 1 })
  const holds = (cell: string, cells: number) => unaryOk(g, { kind: 'distance', fromObject: 'tree', cells }, at(cell).r, at(cell).c)
  it('az átlós szomszéd 1 lépés, az átló mentén N mező N lépés; az egyenes is', () => {
    expect(holds('D5', 1)).toBe(true) // átlósan szomszédos
    expect(holds('D5', 2)).toBe(false) // (a régi „sor + oszlop" számolás szerint ez 2 lett volna)
    expect(holds('B3', 3)).toBe(true) // 3 jobbra-le átlósan
    expect(holds('E2', 4)).toBe(true) // 4 fel
    expect(holds('A6', 4)).toBe(true) // 4 balra
  })
  it('minden mező távolsága a sor- és oszlop-különbség maximuma', () => {
    for (let r = 0; r < fixture.size; r++)
      for (let c = 0; c < fixture.size; c++) {
        const d = Math.max(Math.abs(r - 5), Math.abs(c - 4))
        const id = String.fromCharCode(65 + c) + (r + 1)
        expect(holds(id, d), id).toBe(true)
        expect(holds(id, d + 1), id).toBe(false)
      }
  })
  it('a nyomszöveg érthető, „légvonal" nélkül; több tárgynál a legközelebbitől számít', () => {
    const one = { rooms: {}, characters: [], objects: [{ type: 'sword', at: 'B2' }] }
    expect(clueText({ kind: 'distance', fromObject: 'sword', cells: 4 }, one)).toBe('A kardtól pontosan **4 mezőre** volt.')
    expect(clueText({ kind: 'distance', fromObject: 'bmo', cells: 2 }, { ...one, objects: [{ type: 'bmo', at: 'C3' }] })).toBe('A játékkonzoltól pontosan **2 mezőre** volt.')
    const many = { rooms: {}, characters: [], objects: [{ type: 'vent', at: ['A1', 'C4'] }] }
    expect(clueText({ kind: 'distance', fromObject: 'vent', cells: 3 }, many)).toBe('A legközelebbi szellőzőrácstól pontosan **3 mezőre** volt.')
  })
})
