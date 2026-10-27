import { pick } from '../i18n/lang'

/**
 * A Klasszikus öt szintje (a murdoku.com „Nagyon könnyű … Szakértő" skálája, nyomozói rangokra fordítva).
 * `d` = a pálya `difficulty` mezője (1–5); szintenként 20 pálya van.
 */
export interface Level {
  d: 1 | 2 | 3 | 4 | 5
  /** A rang neve az AKTUÁLIS nyelven (olvasáskor számolódik, így a nyelvváltás érvényesül). */
  readonly name: string
  /** A magyar rangnév, nyelvtől függetlenül. */
  hu: string
  /** Az angol rangnév, nyelvtől függetlenül. */
  en: string
  /** Az eredeti, szó szerinti nehézség az aktuális nyelven (a kártyán kisebb betűvel). */
  readonly plain: string
  emoji: string
}

const level = (d: Level['d'], hu: string, en: string, plainHu: string, plainEn: string, emoji: string): Level => ({
  d,
  hu,
  en,
  emoji,
  get name() {
    return pick(hu, en)
  },
  get plain() {
    return pick(plainHu, plainEn)
  },
})

export const LEVELS: Level[] = [
  level(1, 'Gyakornok', 'Trainee', 'nagyon könnyű', 'very easy', '🌱'),
  level(2, 'Járőr', 'Patrol', 'könnyű', 'easy', '👮'),
  level(3, 'Nyomozó', 'Detective', 'közepes', 'medium', '🕵️'),
  level(4, 'Főnyomozó', 'Chief detective', 'nehéz', 'hard', '🔎'),
  level(5, 'Felügyelő', 'Inspector', 'szakértő', 'expert', '🎖️'),
]

export const levelOf = (d: number): Level => LEVELS[Math.min(5, Math.max(1, d)) - 1]!
export const PER_LEVEL = 20
