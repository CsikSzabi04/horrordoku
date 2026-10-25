// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CharId, IsoTime, Result, Unsubscribe, Uuid } from './base'
import type { RoomsApi } from './room'

export type CloudStatus = 'guest' | 'offline' | 'idle' | 'syncing' | 'error'
export interface CloudUser { id: Uuid; email: string; username: string }

export interface Profile {
  id: Uuid; username: string; avatar: CharId
  xp: number; coins: number; streak: number; bestStreak: number; lastDaily?: string
  createdAt: IsoTime
}
export interface ProfileStats {                    // a `profile_stats` nézet
  solvedTotal: number; solvedNoHints: number; jumpscares: number; playTimeMs: number
  coopGames: number; winsAsKiller: number; winsAsDetective: number
}

export interface AuthApi {
  current(): CloudUser | null
  onChange(cb: (u: CloudUser | null) => void): Unsubscribe
  signUp(i: { email: string; password: string; username: string }): Promise<Result<CloudUser>>   // előtte usernameAvailable
  signIn(i: { email: string; password: string }): Promise<Result<CloudUser>>
  signOut(): Promise<Result<void>>
  sendPasswordReset(email: string): Promise<Result<void>>
  usernameAvailable(name: string): Promise<Result<boolean>>
}
export interface ProfileApi {
  get(): Promise<Result<Profile>>
  update(p: Partial<Pick<Profile, 'username' | 'avatar'>>): Promise<Result<Profile>>
  stats(): Promise<Result<ProfileStats>>
  exportData(): Promise<Result<object>>            // az összes saját sor egy JSON-ban (18.5)
  deleteAccount(): Promise<Result<void>>           // edge function
}
export interface SyncApi {
  start(): void                                    // háttér-szinkron: a StorageService.onChange-et figyeli, a sort üríti
  stop(): void
  flush(): Promise<Result<{ pushed: number; pulled: number }>>      // kilépés előtt / kézzel
  onStatus(cb: (s: CloudStatus) => void): Unsubscribe
}
export interface CatalogApi {
  refresh(): Promise<Result<{ added: number; updated: number }>>    // új/javított pályák → StorageService.putCachedPuzzles
}
export interface LeaderboardApi {
  submit(board: string, ms: number, hints: number): Promise<Result<void>>          // board: "daily:2026-10-25"
  top(board: string, n: number): Promise<Result<{ username: string; avatar: CharId; ms: number }[]>>
}

export interface FriendRow { id: Uuid; username: string; avatar: CharId; xp: number; status: 'pending' | 'accepted'; requestedByMe: boolean }
export interface FriendsApi {
  search(prefix: string): Promise<Result<{ id: Uuid; username: string; avatar: CharId; xp: number }[]>>   // min. 2 karakter, max. 20 találat
  list(): Promise<Result<FriendRow[]>>
  request(userId: Uuid): Promise<Result<void>>
  respond(userId: Uuid, accept: boolean): Promise<Result<void>>
  remove(userId: Uuid): Promise<Result<void>>
  onChange(cb: () => void): Unsubscribe            // Realtime
}

export interface CloudService {
  status(): CloudStatus
  onStatus(cb: (s: CloudStatus) => void): Unsubscribe
  auth: AuthApi
  profile: ProfileApi
  sync: SyncApi
  catalog: CatalogApi
  leaderboard: LeaderboardApi
  friends: FriendsApi
  rooms: RoomsApi                                  // 7. fejezet
}
