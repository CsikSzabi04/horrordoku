// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CellId, Unsubscribe, Uuid } from './base'
import type { BoardState, Op, OpEnvelope } from './board'
import type { Fx } from './fx'

export interface Peer { userId: Uuid; username: string; color: string }
export interface BoardController {
  getState(): BoardState
  /** Másik játékos művelete: alkalmazd (a motoron át), de NE sugározd újra. */
  applyRemote(e: OpEnvelope): void
  /** Mindig, amikor a HELYI játékos érvényes műveletet hajt végre. B ezt sugározza. */
  onLocalOp(cb: (op: Op) => void): Unsubscribe
  /** Teljes állapot betöltése (újracsatlakozás, pillanatkép). */
  setState(s: BoardState): void
  setPeers(p: Peer[]): void
  setPeerCursor(userId: Uuid, cell: CellId | null): void
  onLocalCursor(cb: (cell: CellId | null) => void): Unsubscribe
  /** Gyilkos-mód hatások megjelenítése (óra, kártya-szöveg, eltűnő tárgy, zárolt cella, némítás). */
  applyFx(fx: Fx): void
  /** A közös óra és az életek megjelenítése (a szerver számolja, a kliens csak mutatja). */
  setClock(c: { endsAt: number | null; speed: number }): void
  setLives(n: number): void
  /** Beküldés-kérés a felületről (a kliens jelzi B-nek, hogy javaslatot tegyen). */
  onSubmitRequest(cb: () => void): Unsubscribe
  showSubmitResult(r: { correct: boolean }): void       // a jumpscare-t is ez indítja (A beállítása szerint)
}
