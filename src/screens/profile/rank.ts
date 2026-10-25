// Rang az XP-ből (GDD 14.7) — nem tároljuk, mindig számoljuk.
export const RANKS = [
  { id: 'rookie', min: 0 },
  { id: 'guard', min: 500 },
  { id: 'detective', min: 1500 },
  { id: 'hunter', min: 4000 },
  { id: 'ninth', min: 10000 },
] as const

export type RankId = (typeof RANKS)[number]['id']

export function rankOf(xp: number): { id: RankId; min: number; next: number | null } {
  let i = 0
  RANKS.forEach((r, k) => {
    if (xp >= r.min) i = k
  })
  const cur = RANKS[i]!
  return { id: cur.id, min: cur.min, next: RANKS[i + 1]?.min ?? null }
}

/** ms → { h, m } (a játékidő kijelzéséhez). */
export function hoursMinutes(ms: number): { h: number; m: number } {
  const total = Math.max(0, Math.floor(ms / 60000))
  return { h: Math.floor(total / 60), m: total % 60 }
}
