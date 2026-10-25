// A vendég/offline alapértelmezés (A1 csonkja): minden hívás `offline` hibát ad, nincs bejelentkezett felhasználó.
// A `createCloud` (service.ts) erre építi rá a valódi auth/profil részeket; ami még nincs kész (B2/B4…), az innen jön.
import type { Result } from '../shared/base'
import type { CloudService } from '../shared/cloud'

const off = async (): Promise<Result<never>> => ({ ok: false, code: 'offline', message: 'offline' })
const noop = () => undefined

export const NullCloud: CloudService = {
  status: () => 'guest',
  onStatus: () => noop,
  auth: { current: () => null, onChange: () => noop, signUp: off, signIn: off, signOut: off, sendPasswordReset: off, usernameAvailable: off },
  profile: { get: off, update: off, stats: off, exportData: off, deleteAccount: off },
  sync: { start: noop, stop: noop, flush: off, onStatus: () => noop },
  catalog: { refresh: off },
  leaderboard: { submit: off, top: off },
  friends: { search: off, list: off, request: off, respond: off, remove: off, onChange: () => noop },
  rooms: { create: off, join: off, invite: off, onInvite: () => noop, open: off },
}
