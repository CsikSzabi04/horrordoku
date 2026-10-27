import { describe, expect, it } from 'vitest'
import type { Clue } from '../shared/puzzle'
import { readableClues } from './readableClues'

const on: Clue = { kind: 'on', object: 'bench', room: 'K' }
const beside: Clue = { kind: 'beside', object: 'radio' }

describe('olvasható nyomok (amihez a térkép kiemelhet)', () => {
  it('a sima nyom olvasható', () => {
    expect(readableClues({ clues: [on], clueText: ['A Kórházban egy **padon** ült.'] }, false)).toEqual([on])
  })
  it('a kitakart (███) nyom nem olvasható — a tárgya nem emelhető ki', () => {
    expect(readableClues({ clues: [on], clueText: ['A Kórházban egy **███** ült.'] }, false)).toEqual([])
  })
  it('a zárolt nyom totem nélkül rejtett, totem mellett olvasható; a nyitott nyom mindig olvasható', () => {
    const ch = { clues: [beside, on], clueText: ['Egy **rádió mellett** volt.', 'A Kórházban egy **padon** ült.'], hidden: [1] }
    expect(readableClues(ch, false)).toEqual([beside])
    expect(readableClues(ch, true)).toEqual([beside, on])
  })
})
