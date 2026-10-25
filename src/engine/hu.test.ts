import { describe, expect, it } from 'vitest'
import { abl, ins } from './hu'

describe('magyar toldalékok a nevekhez', () => {
  it('-tól/-től', () => {
    for (const [n, f] of [['Alfred', 'Alfredtől'], ['Deborah', 'Deborahtól'], ['Ivan', 'Ivantól'], ['Henry', 'Henrytől'], ['Mara', 'Marától'], ['Hugo', 'Hugótól'], ['Jim', 'Jimtől']] as const) expect(abl(n)).toBe(f)
  })
  it('névelős nevek: a toldalék az utolsó szóra kerül, a névelő kisbetűs', () => {
    expect(abl('A Látogató')).toBe('a Látogatótól')
    expect(ins('A Látogató')).toBe('a Látogatóval')
    expect(abl('Az Éjkirály')).toBe('az Éjkirálytól')
    expect(abl('A Hazug Alak')).toBe('a Hazug Alaktól')
    expect(abl('A Lich')).toBe('a Lichtől')
    expect(ins('Az Éjkirály')).toBe('az Éjkirállyal')
    expect(abl('Emily')).toBe('Emilytől')
    expect(abl('Carly')).toBe('Carlytől')
    expect(ins('Carly')).toBe('Carlyvel')
  })
  it('előtagos és közszavas nevek: a toldalék a név végére kerül, az előtag marad', () => {
    expect(ins('Mr. X')).toBe('Mr. X-szel')
    expect(abl('Mr. X')).toBe('Mr. X-től')
    expect(ins('Dr. Wernicke')).toBe('Dr. Wernickével')
    expect(abl('Dr. Emil Hartman')).toBe('Dr. Emil Hartmantól')
    expect(ins('Dr. Emil Hartman')).toBe('Dr. Emil Hartmannal')
    expect(ins('Mr. Meeseeks')).toBe('Mr. Meeseeksszel')
    expect(abl('Father Martin')).toBe('Father Martintól')
    expect(ins('Evil Morty')).toBe('Evil Mortyvel')
    expect(ins('Golden Freddy')).toBe('Golden Freddyvel')
    expect(ins('Rágógumi hercegnő')).toBe('Rágógumi hercegnővel')
    expect(abl('Lumpy hercegnő')).toBe('Lumpy hercegnőtől')
    // a keresztnév marad, ahol nincs előtag
    expect(ins('Leon S. Kennedy')).toBe('Leonnal')
    expect(ins('Mommy Long Legs')).toBe('Mommyvel')
  })
  it('semleges „i”: a hátrébb álló magánhangzó dönt', () => {
    for (const [n, f] of [['Martin', 'Martintól'], ['Robin', 'Robintól'], ['Marvin', 'Marvintól'], ['Dustin', 'Dustintól'], ['Kevin', 'Kevintől'], ['Chris', 'Christől'], ['Quentin', 'Quentintől']] as const) expect(abl(n)).toBe(f)
    expect(ins('Martin')).toBe('Martinnal')
    expect(ins('Kevin')).toBe('Kevinnel')
  })
  it('-val/-vel', () => {
    for (const [n, f] of [['Mara', 'Marával'], ['Ivan', 'Ivannal'], ['Henry', 'Henryvel'], ['Jim', 'Jimmel'], ['Emmett', 'Emmettel'], ['Max', 'Maxszal'], ['Tess', 'Tesszel'], ['Perselus', 'Perselusszal'], ['Liz', 'Lizzel'], ['Anna', 'Annával'], ['Paul', 'Paullal'], ['Daniel', 'Daniellel']] as const) expect(ins(n)).toBe(f)
  })
})
