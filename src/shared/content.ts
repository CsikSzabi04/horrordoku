// Másolat a docs/CONTRACTS.md-ből (10. fejezet, szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.).
import type { CharId } from './base'
import type { Puzzle, PuzzleMode, Race } from './puzzle'

export interface CharacterInfo {
  id: CharId
  name: string
  race: Race
  world: string // "hollowmere" | "fnaf" | … | "mix"
  emoji?: string // amíg nincs portré (public/portraits/<id>.png)
  source?: { game?: string; film?: string }
  bio?: string // magyar leírás a Gyűjteményhez
}

export interface ContentApi {
  /** Minden ismert karakter. A Gyűjtemény ebből és a `StorageService.getUnlocks()`-ból épül: amit még nem szereztél meg, az „ismeretlen". */
  characters(): CharacterInfo[]
  /** Pályák listája (csomagolt + cache), módra szűrhető. */
  puzzles(mode?: PuzzleMode): Promise<Puzzle[]>
}
