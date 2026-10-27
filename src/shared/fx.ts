// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CellId, CharId, Uuid } from './base'

export type Fx =
  | { type: 'time_penalty'; seconds: number; serverTime: number }                 // Időcsavar (lopás)
  | { type: 'time_speed'; factor: number; ms: number; serverTime: number }        // Időcsavar (gyorsítás)
  | { type: 'clue_override'; char: CharId; text: string; ms: number; telltale?: boolean }   // Szövegcsere — NINCS feladó, NINCS értesítés (telltale: a lobby-opció „Árulkodó jel”)
  | { type: 'object_vanish'; cell: CellId; ms: number }                           // Eltüntetés: a visszatéréskor a cella törlődik és zárolt
  | { type: 'exposed' }                                                           // a gyilkos leleplezve (képességek letiltva)
  | { type: 'silenced'; userId: Uuid; ms: number }                                // rossz szavazás: a játékos némán nem rakhat
  | { type: 'meeting'; phase: 'discuss' | 'vote' | 'result'; endsAt: number }
