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
    expect(ins('A Fagykirály')).toBe('a Fagykirállyal')
    expect(abl('Emily')).toBe('Emilytől')
    expect(abl('Carly')).toBe('Carlytől')
    expect(ins('Carly')).toBe('Carlyvel')
  })
  it('előtagos és közszavas nevek: a toldalék a név végére kerül, az előtag marad', () => {
    expect(ins('Mr. Kérek')).toBe('Mr. Kérekkel')
    expect(abl('Mr. Kérek')).toBe('Mr. Kérektől')
    expect(ins('Dr. Vargha')).toBe('Dr. Varghával')
    expect(abl('Dr. Emil Hofer')).toBe('Dr. Emil Hofertől')
    expect(ins('Dr. Emil Hofer')).toBe('Dr. Emil Hoferrel')
    expect(ins('Mr. Fenékcsomó')).toBe('Mr. Fenékcsomóval')
    expect(abl('Atya Márton')).toBe('Atya Mártontól')
    expect(ins('Gonosz Murci')).toBe('Gonosz Murcival')
    expect(ins('Arany Brumi')).toBe('Arany Brumival')
    expect(ins('Rágógumi hercegnő')).toBe('Rágógumi hercegnővel')
    expect(abl('Göcsörtös hercegnő')).toBe('Göcsörtös hercegnőtől')
    // egyszerű név: a toldalék a név utolsó szavára kerül
    expect(ins('Lázár Leó')).toBe('Lázár Leóval')
    expect(ins('Hosszúlábú Anyu')).toBe('Hosszúlábú Anyuval')
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
