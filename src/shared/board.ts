// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CellId, CharId, Uuid } from './base'
import type { Puzzle } from './puzzle'

export interface BoardState {
  placed: Record<CharId, CellId>             // lerakott karakterek
  marks: CellId[]                            // kézi X-ek (a sor/oszlop szerinti automatikus X-ek NEM tárolódnak: számolt érték)
  notes: Record<CellId, CharId[]>            // ceruzás jegyzetek
}

export type Op =
  | { op: 'place';   char: CharId; cell: CellId; trap?: true }   // trap: a Gyilkos „Eltüntetés” csapda-mezőjére (épp eltűnt tárgy) — a motor ilyenkor a foglalt mezőt is elfogadja
  | { op: 'unplace'; char: CharId }
  | { op: 'move';    char: CharId; to: CellId; trap?: true }      // co-op: a másik lerakását is el lehet vinni
  | { op: 'mark';    cell: CellId; on: boolean }
  | { op: 'note';    cell: CellId; chars: CharId[] }
  | { op: 'erase';   cell: CellId }

export type OpError =
  | 'unknown_char' | 'unknown_cell' | 'blocked_object' | 'cell_occupied'
  | 'row_col_conflict' | 'power_violation' | 'vanished_cell'   // vanished_cell: a Gyilkos-mód „Eltüntetés" zárolta

/** Tiszta függvények (src/engine/ — A írja, B a co-op-hoz használja). */
export interface BoardEngine {
  empty(): BoardState
  apply(puzzle: Puzzle, state: BoardState, op: Op): { ok: true; state: BoardState } | { ok: false; error: OpError }
  autoMarks(puzzle: Puzzle, state: BoardState): CellId[]       // sor/oszlop szerinti számolt X-ek
  isComplete(puzzle: Puzzle, state: BoardState): boolean        // mindenki le van rakva
  check(puzzle: Puzzle, state: BoardState): { correct: boolean; wrongChars: CharId[] }
}

/** Co-op: egy művelet a hálózaton. */
export interface OpEnvelope {
  id: Uuid                 // idempotencia
  by: Uuid                 // a küldő felhasználó
  seq: number              // Lamport-számláló: max(látott seq)+1 küldéskor
  at: number               // epoch ms (csak naplózásra)
  op: Op
}
