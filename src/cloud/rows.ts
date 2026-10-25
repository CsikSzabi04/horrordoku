// Helyi tároló ⇄ adatbázis-sorok leképezése a szinkronhoz (0001_init.sql: progress, saves, runs, unlocks, user_settings, profiles).
import type { IsoTime } from '../shared/base'
import type { ProfileSnapshot, ProgressEntry, ProgressFile, RunRecord, SessionState, SessionsFile, Settings, UnlocksFile } from '../shared/storage'
import { iso } from './result'

export const EPOCH: IsoTime = '1970-01-01T00:00:00Z'

// ---------- helyi → adatbázis ----------
export const progressRow = (uid: string, ref: string, e: ProgressEntry) => ({
  user_id: uid, puzzle_id: ref, solved: e.solved, best_time_ms: e.bestMs ?? null, hints_used: e.hints ?? 0,
  wrong_submits: e.wrongSubmits, first_solved_at: e.firstSolvedAt ?? null, updated_at: new Date().toISOString(),
})
/** A `saves` táblának nincs `wrong_submits` oszlopa: a `meta`-ba tesszük (visszaolvasáskor kivesszük). */
export const saveRow = (uid: string, ref: string, s: SessionState) => ({
  user_id: uid, puzzle_ref: ref, state: s.board, meta: { ...(s.meta ?? {}), wrongSubmits: s.wrongSubmits },
  elapsed_ms: Math.round(s.elapsedMs), hints_used: s.hintsUsed, updated_at: s.updatedAt,
})
export const runRow = (uid: string, r: RunRecord) => ({
  id: r.id, user_id: uid, puzzle_ref: r.ref, kind: r.kind, room_id: r.roomId ?? null, role: r.role ?? null, won: r.won ?? null,
  difficulty: r.difficulty ?? null, size: r.size ?? null, solved: r.solved, time_ms: r.ms ?? null, hints_used: r.hints,
  wrong_submits: r.wrongSubmits, played_at: r.at,
})
export const unlockRow = (uid: string, u: { kind: string; id: string; at: IsoTime }) => ({ user_id: uid, kind: u.kind, item_id: u.id, unlocked_at: u.at })
export const settingsRow = (uid: string, s: Settings) => ({ user_id: uid, data: s, updated_at: s.updatedAt })
/** A profil-frissítés csak a játék-adatokat írja; a becenevet/avatárt a ProfileApi.update intézi (egyediség-ellenőrzéssel). */
export const profilePatch = (p: ProfileSnapshot) => ({ xp: p.xp, coins: p.coins, streak: p.streak, best_streak: p.bestStreak, last_daily: p.lastDaily ?? null, updated_at: p.updatedAt })

// ---------- adatbázis → helyi ----------
export interface ProgressDbRow { puzzle_id: string; solved: boolean; best_time_ms: number | null; hints_used: number; wrong_submits: number; first_solved_at: string | null; updated_at: string }
export interface RunDbRow { id: string; puzzle_ref: string; kind: RunRecord['kind']; room_id: string | null; role: RunRecord['role'] | null; won: boolean | null; difficulty: number | null; size: number | null; solved: boolean; time_ms: number | null; hints_used: number; wrong_submits: number; played_at: string }
export interface SaveDbRow { puzzle_ref: string; state: unknown; meta: Record<string, unknown> | null; elapsed_ms: number; hints_used: number; updated_at: string }
export interface UnlockDbRow { kind: string; item_id: string; unlocked_at: string }
export interface ProfileDbRow { id: string; username: string; avatar: string; xp: number; coins: number; streak: number; best_streak: number; last_daily: string | null; updated_at: string }

const maxTime = (xs: string[]) => (xs.length ? xs.map(iso).reduce((a, b) => (a >= b ? a : b)) : EPOCH)

export function progressFromRows(rows: ProgressDbRow[], runs: RunDbRow[]): ProgressFile {
  const puzzles: ProgressFile['puzzles'] = {}
  for (const r of rows) {
    puzzles[r.puzzle_id] = {
      solved: r.solved, wrongSubmits: r.wrong_submits,
      ...(r.best_time_ms !== null ? { bestMs: r.best_time_ms } : {}),
      ...(r.solved || r.hints_used > 0 ? { hints: r.hints_used } : {}),
      ...(r.first_solved_at ? { firstSolvedAt: iso(r.first_solved_at) } : {}),
    }
  }
  const recentRuns: RunRecord[] = runs.map((r) => ({
    id: r.id, ref: r.puzzle_ref, kind: r.kind, solved: r.solved, hints: r.hints_used, wrongSubmits: r.wrong_submits, at: iso(r.played_at),
    ...(r.room_id ? { roomId: r.room_id } : {}), ...(r.role ? { role: r.role } : {}), ...(r.won !== null ? { won: r.won } : {}),
    ...(r.difficulty !== null ? { difficulty: r.difficulty as RunRecord['difficulty'] } : {}), ...(r.size !== null ? { size: r.size } : {}),
    ...(r.time_ms !== null ? { ms: r.time_ms } : {}),
  }))
  return { v: 1, updatedAt: maxTime(rows.map((r) => r.updated_at)), puzzles, recentRuns }
}

export function sessionsFromRows(rows: SaveDbRow[]): SessionsFile {
  const sessions: SessionsFile['sessions'] = {}
  for (const r of rows) {
    const { wrongSubmits, ...meta } = (r.meta ?? {}) as { wrongSubmits?: number } & Record<string, unknown>
    sessions[r.puzzle_ref] = {
      elapsedMs: r.elapsed_ms, hintsUsed: r.hints_used, wrongSubmits: Number(wrongSubmits ?? 0), board: r.state as SessionState['board'],
      ...(typeof meta.title === 'string' ? { meta: meta as unknown as NonNullable<SessionState['meta']> } : {}),
      updatedAt: iso(r.updated_at),
    }
  }
  return { v: 1, sessions }
}

export const unlocksFromRows = (rows: UnlockDbRow[]): UnlocksFile => ({
  v: 1,
  items: rows.map((r) => ({ kind: r.kind as UnlocksFile['items'][number]['kind'], id: r.item_id, at: iso(r.unlocked_at) })),
})

export const settingsFromRow = (row: { data: unknown } | null): Settings | null => {
  const d = row?.data as Partial<Settings> | undefined
  return d && d.v === 1 && typeof d.updatedAt === 'string' ? (d as Settings) : null
}

export const profileFromRow = (r: ProfileDbRow): ProfileSnapshot => ({
  v: 1, id: r.id, username: r.username, avatar: r.avatar, xp: r.xp, coins: r.coins, streak: r.streak, bestStreak: r.best_streak,
  ...(r.last_daily ? { lastDaily: r.last_daily } : {}), updatedAt: iso(r.updated_at),
})
