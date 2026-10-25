// CSONK (AI-A, A1): a CloudService típusa + üres NullCloud, hogy a játék felhő nélkül is fusson és forduljon.
// AI-B (B1) ÁTVESZI ezt a mappát: a valódi megvalósítás ide kerül, és az `cloud` export átáll a NullCloud-ról.
import type { Result } from '../shared'
import type { CloudService } from '../shared/cloud'

export type { CloudService, CloudStatus } from '../shared/cloud'

const off = async (): Promise<Result<never>> => ({ ok: false, code: 'offline', message: 'offline' })
const noop = () => undefined

/** Vendég/offline alapértelmezés: minden hívás `offline` hibát ad, nincs bejelentkezett felhasználó. */
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

export const cloud: CloudService = NullCloud
