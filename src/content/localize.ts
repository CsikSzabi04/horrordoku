import { roomIn as roomInHu, OBJECTS, TERRAIN } from '../engine/vocab'
import { clueTextEn, objEn, roomInEn, roomNameEn } from '../engine/text.en'
import { TERRAIN_EN } from '../engine/vocab.en'
import { getLang } from '../i18n/lang'
import { PER_LEVEL } from '../game/levels'
import type { Puzzle, PuzzleCharacter } from '../shared/puzzle'
import { THEMES } from './classic'
import { EN_BIOS } from './en.bios'
import { worldInfo } from '../game/worlds'
import { EN_BONUS, EN_CHARACTERS, EN_CLASSIC_STORY, EN_EVENT_CASES, EN_THEMES, EN_WHEN } from './en'

/**
 * A pálya-tartalom (nevek, helyiségek, tárgyak, címek, történetek, nyomszövegek) megjelenítése az aktuális nyelven.
 * A pálya (JSON) magyar marad — a motor azonosítók és magyar nevek alapján dolgozik —, az angol megjelenítés ezen a
 * rétegen át készül. Ismeretlen tételre (kézzel írt pálya, hiányzó fordítás) a magyar szöveg a tartalék.
 */
const en = () => getLang() === 'en'

export const objName = (type: string): string => (en() ? objEn(type) : (OBJECTS[type]?.hu ?? type))
export const roomName = (huName: string): string => (en() ? roomNameEn(huName) : huName)
/** „a Konyhában” / „in the Kitchen” */
export const roomPhrase = (huName: string): string => (en() ? roomInEn(huName) : roomInHu(huName))
/**
 * A szereplő neve az aktuális nyelven. Ha az angol név a magyar név bővített alakja (a Klasszikus „Vlad”-ja és a Hollowmere
 * „Vlad Drăgulescu”-ja azonos azonosítón osztozik), a pályán álló rövid név marad.
 */
export const charName = (id: string, huName: string): string => {
  if (!en()) return huName
  const e = EN_CHARACTERS[id]
  return e && !(e !== huName && e.startsWith(huName)) ? e : huName
}
export const terrainName = (style: string): string => (en() ? (TERRAIN_EN[style]?.name ?? style) : (TERRAIN[style]?.name ?? style))

const CLASSIC_ID = /^classic-(\d)-(\d{2})-(.+)$/

/** A pálya címe az aktuális nyelven. */
export function puzzleTitle(p: Pick<Puzzle, 'id' | 'mode' | 'title'>): string {
  if (!en()) return p.title
  const ev = EN_EVENT_CASES[p.id]
  if (ev) return ev.title
  const bonus = EN_BONUS[p.id]
  if (bonus) return bonus.title
  const m = CLASSIC_ID.exec(p.id)
  if (m) {
    const t = EN_THEMES[m[3]!]
    if (t) {
      const g = (Number(m[1]) - 1) * PER_LEVEL + (Number(m[2]) - 1)
      const use = Math.floor(g / THEMES.length)
      return `${t.title}${EN_WHEN[(use + (g % THEMES.length)) % EN_WHEN.length] ?? ''}`
    }
  }
  return p.title.replace(/^Véletlen ügy/, 'Random case')
}

/** A pálya bevezető története az aktuális nyelven (nincs → undefined). */
export function puzzleStory(p: Pick<Puzzle, 'id' | 'mode' | 'story'>): string | undefined {
  if (!en() || !p.story) return p.story
  const ev = EN_EVENT_CASES[p.id]
  if (ev) return ev.story
  const bonus = EN_BONUS[p.id]
  if (bonus) return bonus.story
  const m = CLASSIC_ID.exec(p.id)
  if (m) {
    const t = EN_THEMES[m[3]!]
    if (t) {
      const g = (Number(m[1]) - 1) * PER_LEVEL + (Number(m[2]) - 1)
      const use = Math.floor(g / THEMES.length)
      return EN_CLASSIC_STORY[(use + Number(m[2])) % EN_CLASSIC_STORY.length]!(t)
    }
  }
  return p.story
}

/** Egy karakter i. nyomának szövege az aktuális nyelven (a kitakart `███` nyom angolul is kitakart). */
export function clueLine(p: Pick<Puzzle, 'rooms' | 'characters' | 'objects'>, ch: PuzzleCharacter, i: number): string {
  const hu = ch.clueText[i] ?? ''
  const clue = ch.clues[i]
  if (!en() || !clue) return hu
  return clueTextEn(clue, p, { nameOf: charName, redacted: hu.includes('███') })
}

export const clueLines = (p: Pick<Puzzle, 'rooms' | 'characters' | 'objects'>, ch: PuzzleCharacter): string[] => ch.clueText.map((_, i) => clueLine(p, ch, i))


/** A Gyűjtemény-szereplő rövid életrajza az aktuális nyelven. */
export function charBio(c: { id: string; bio?: string; world: string }): string | undefined {
  if (!en()) return c.bio
  const known = EN_BIOS[c.id]
  if (known) return known
  const w = worldInfo(c.world)
  return w ? `${w.game} — ${w.title}.` : c.bio
}

/** A szereplő forrás-felirata (melyik világból való) az aktuális nyelven. */
export function charSource(c: { world: string; source?: { game?: string; film?: string } }): string | undefined {
  const hu = c.source?.game ?? c.source?.film
  if (!en()) return hu
  return worldInfo(c.world)?.game ?? hu
}

/** A világ neve a szűrőben / a kártyán az aktuális nyelven. */
export const worldTitle = (world: string): string => worldInfo(world)?.title ?? (world === 'hollowmere' ? 'Hollowmere' : world.toUpperCase())
