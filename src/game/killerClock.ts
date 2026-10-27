// A Gyilkos mód órája: a hátralévő idő a SZERVER képlete szerint (0007 `kg_remaining_ms`): határidő − büntetés − eltelt idő − a gyorsított szakaszok többlete.
// A kliens csak megjeleníti; a lejárat tényét a szerver állapítja meg (szívverés), ezért a két számítás nem térhet el lényegesen.
import type { KillerState } from '../shared/room'

/** Hátralévő ms a megadott SZERVER-időpontban; időkorlát nélkül (vagy futó játék híján) `null`. */
export function remainingMs(s: KillerState | null, serverNow: number): number | null {
  if (!s?.running || s.timeLimitMs == null || s.startedAt == null) return null
  const extra = (s.speed ?? []).reduce((sum, w) => sum + (w.factor - 1) * Math.max(0, Math.min(w.until, serverNow) - w.from), 0)
  return Math.floor(s.timeLimitMs - (s.penaltyMs ?? 0) - (serverNow - s.startedAt) - extra)
}

/** „07:42” — a lejárt időnél „00:00”. */
export function clockText(ms: number | null): string {
  if (ms == null) return '--:--'
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Épp gyorsított az óra? (a háromszoros szakasz alatt a számláló „pörög”) */
export function clockSpeed(s: KillerState | null, serverNow: number): number {
  const w = (s?.speed ?? []).find((x) => serverNow >= x.from && serverNow < x.until)
  return w?.factor ?? 1
}
