// Minden karakternek SAJÁT színe van — a térképen a kezdőbetűje (jegyzet, lerakott karakter, előnézet) és a kártya jelvénye ezzel a színnel jelenik meg.
// Esemény-módban a karakter megjelenéséből jön (a Golden Freddy-szerű arany medve arany, a Chica-szerű csirke sárga…); a Klasszikusban az arckép pólójának színe.
// A szín mindig „felemelt”: elég világos és telt ahhoz, hogy a fekete körvonalas betű a sötét térképen is olvasható legyen.
import { LOOKS } from '../content/looks'
import type { CreatureId } from '../content/looks'
import { avatarColor } from '../components/Portrait'
import type { CharId } from '../shared/base'
import type { Puzzle } from '../shared/puzzle'

/** A lények (rajzolt, nem emberi karakterek) jellemző színe. */
const CREATURE: Record<CreatureId, string> = {
  brumi: '#a8693a', aranyBrumi: '#f0c030', csibi: '#ffd21f', roko: '#e0622a', nyuszi: '#8f7fe0', marionette: '#f1ece0', olelo: '#2f6fe0', csokos: '#ff4fa0',
  dobos: '#9a8ae6', hosszulabu: '#d96fb0', kutyanap: '#f3a810', surur: '#b86a60', urleny: '#7fa08a', wendigo: '#e65f52', vadasz: '#c9a25a', ivan: '#7dd3ff',
  piramis: '#c9473d', nurse: '#c0314f', liar: '#d65a5a', csapdas: '#dd3b4f', diver: '#d9a441', pottyos: '#d9302e', macskanap: '#8a63d0', lidero: '#ff9a4a',
  fagykiraly: '#3fc3ff', madarember: '#f2d45a', csippento: '#cc7320', fenekcsomo: '#c9b36a', kerek: '#f4a52a', fin: '#2d8cf0', dzsaki: '#f0b610',
  bimbo: '#3cc69e', gocsi: '#9967ce', lich: '#58ff2c', kattogo: '#b0916f', nevtelen: '#e22626',
}

type Hsl = { h: number; s: number; l: number }
const toRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
function toHsl(hex: string): Hsl {
  const [r, g, b] = toRgb(hex).map((x) => x / 255) as [number, number, number]
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return { h: 0, s: 0, l }
  const d = mx - mn
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60
  return { h, s, l }
}
function fromHsl({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/** Olvashatóvá teszi a színt a sötét térképen: világosság 0,52–0,8 közé, a halvány színek kapnak egy kis telítettséget (a semleges szürke marad szürke). */
export function lift(hex: string): string {
  const c = toHsl(hex)
  return fromHsl({ h: c.h, s: c.s < 0.08 ? c.s : Math.max(c.s, 0.4), l: Math.min(0.8, Math.max(0.52, c.l)) })
}

/** Emberi karakter: a ruha / haj / kalap / sál közül a legtelítettebb (az „arculat” színe); ha mind semleges, a ruha. */
function humanColor(look: { top: string; hair?: string; hatColor?: string; scarf?: string }): string {
  const cands = [look.top, look.hair, look.hatColor, look.scarf].filter((c): c is string => !!c && /^#[0-9a-fA-F]{6}$/.test(c))
  let best = look.top
  let bestScore = -1
  for (const [i, c] of cands.entries()) {
    const { s, l } = toHsl(c)
    const score = (l < 0.12 || l > 0.93 ? 0 : s) + (i === 0 ? 0.12 : 0)
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}

/** Egy karakter saját színe (felemelve). `person`: Klasszikus (az arckép pólója). */
export function charColor(id: CharId, person: boolean): string {
  if (person) return lift(avatarColor(id))
  const look = LOOKS[id]
  if (look?.k === 'c') return lift(CREATURE[look.c] ?? '#c9a228')
  if (look?.k === 'h') return lift(humanColor(look))
  return '#c9a228'
}

export function charColors(characters: Pick<Puzzle, 'characters'>['characters'], person: boolean): Map<CharId, string> {
  return new Map(characters.map((c) => [c.id, charColor(c.id, person)]))
}
