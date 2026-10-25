/**
 * A Klasszikus öt szintje (a murdoku.com „Nagyon könnyű … Szakértő" skálája, nyomozói rangokra fordítva).
 * `d` = a pálya `difficulty` mezője (1–5); szintenként 20 pálya van.
 */
export interface Level {
  d: 1 | 2 | 3 | 4 | 5
  name: string
  en: string
  /** Az eredeti, szó szerinti nehézség (a kártyán kisebb betűvel). */
  plain: string
  emoji: string
}

export const LEVELS: Level[] = [
  { d: 1, name: 'Gyakornok', en: 'Trainee', plain: 'nagyon könnyű', emoji: '🌱' },
  { d: 2, name: 'Járőr', en: 'Patrol', plain: 'könnyű', emoji: '👮' },
  { d: 3, name: 'Nyomozó', en: 'Detective', plain: 'közepes', emoji: '🕵️' },
  { d: 4, name: 'Főnyomozó', en: 'Chief detective', plain: 'nehéz', emoji: '🔎' },
  { d: 5, name: 'Felügyelő', en: 'Inspector', plain: 'szakértő', emoji: '🎖️' },
]

export const levelOf = (d: number): Level => LEVELS[Math.min(5, Math.max(1, d)) - 1]!
export const PER_LEVEL = 20
