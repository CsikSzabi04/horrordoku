// LeaderboardApi (B7): napi ranglista. A beküldés a `submit_score` függvényen át megy (érvényesítés + csak a javulás számít), az olvasás a `leaderboard_top`-on.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardApi } from '../shared/cloud'
import { fromError, guard, ok } from './result'

interface TopRow { username: string; avatar: string; time_ms: number }

export function createLeaderboard(client: SupabaseClient): LeaderboardApi {
  return {
    submit: (board, ms, hints) =>
      guard(async () => {
        const { error } = await client.rpc('submit_score', { p_board: board, p_ms: Math.round(ms), p_hints: hints })
        return error ? fromError(error) : ok(undefined)
      }),
    top: (board, n) =>
      guard(async () => {
        const { data, error } = await client.rpc('leaderboard_top', { p_board: board, p_n: n })
        if (error) return fromError(error)
        return ok(((data ?? []) as TopRow[]).map((r) => ({ username: r.username, avatar: r.avatar, ms: r.time_ms })))
      }),
  }
}
