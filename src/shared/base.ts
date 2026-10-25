// A szerződés alapjai — docs/CONTRACTS.md 1. fejezet (szó szerint). Változtatás: AI_SPLIT.md 7. fejezet.
export const CONTRACT_VERSION = 1

export type Uuid = string // UUID v4, kisbetűvel
export type IsoTime = string // ISO 8601, UTC: "2026-10-25T21:19:44Z"
export type CharId = string // kebab-case, globálisan egyedi: "vlad", "leon-kennedy". A portré: assets/portraits/<CharId>.png
export type CellId = string // oszlop betű + sor szám: "A1" … "J10"
export type PuzzleRef = string // katalógus-azonosító ("classic-01-midnight-mass") | "gen:<verzió>:<nehézség>:<seed>" ("gen:1:2:7F3K92")
export type Unsubscribe = () => void

export type ErrorCode =
  | 'offline'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'rate_limited'
  | 'server'
  | 'unknown'

/** Várható hibák NEM dobnak kivételt, hanem Result-ot adnak. Kivétel csak programozói hiba esetén. */
export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string }
