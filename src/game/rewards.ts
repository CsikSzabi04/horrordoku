import type { Puzzle } from '../shared/puzzle'
import type { StorageService } from '../shared/storage'

/** XP pályánként (GDD 14.7): 🟢 50 · 🟡 100 · 🟠 200 · 🔴 350 · ⚫ 600; tipp nélkül +25%. */
const XP_BY_DIFFICULTY = [0, 50, 100, 200, 350, 600]

export const xpFor = (difficulty: number, hints: number): number => Math.round((XP_BY_DIFFICULTY[Math.min(5, Math.max(1, difficulty))] ?? 50) * (hints === 0 ? 1.25 : 1))

export interface Reward {
  xp: number
  /** Első megoldás? Az ismételt megoldásért nem jár újabb XP (hogy ne lehessen farmolni). */
  first: boolean
}

/** Katalógus-pálya megoldása után: az első megoldásért XP a profilba. */
export async function awardSolve(storage: StorageService, puzzle: Pick<Puzzle, 'difficulty'>, hints: number, wasSolved: boolean): Promise<Reward> {
  if (wasSolved) return { xp: 0, first: false }
  const xp = xpFor(puzzle.difficulty, hints)
  const p = await storage.getProfile()
  await storage.putProfile({ ...p, xp: p.xp + xp, updatedAt: new Date().toISOString() })
  return { xp, first: true }
}

/** Gyilkos mód (GDD 22.4): a győztes oldal a sima XP kétszeresét kapja (nem „első megoldás”-alapú: a játék társas, nem farmolható egyedül). */
export async function awardWin(storage: StorageService, puzzle: Pick<Puzzle, 'difficulty'>, hints: number, factor = 2): Promise<Reward> {
  const xp = xpFor(puzzle.difficulty, hints) * factor
  const p = await storage.getProfile()
  await storage.putProfile({ ...p, xp: p.xp + xp, updatedAt: new Date().toISOString() })
  return { xp, first: true }
}
