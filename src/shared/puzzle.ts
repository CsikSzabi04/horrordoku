// Másolat a docs/CONTRACTS.md-ből (szó szerint). Módosítás csak a szerződés-folyamattal (AI_SPLIT.md 7.), a CONTRACTS.md-t is frissítve.
import type { CellId, CharId, PuzzleRef } from './base'

export type Difficulty = 1 | 2 | 3 | 4 | 5                       // Gyertyafény … Pokol kapuja
export type PuzzleMode = 'classic' | 'event' | 'bonus' | 'community' | 'generated'
export type Race = 'human' | 'vampire' | 'ghost' | 'demon' | 'werewolf' | 'witch' | 'ghoul' | 'shapeshifter'

export interface ObjectDef {
  type: string                    // "bench", "coffin", "bell", … (a UI ikon- és névtáblája A-é)
  at: CellId | CellId[]
  blocking?: boolean              // foglalt: senki nem állhat rá (kivéve szellem)
}

/** Nyom. A `kind` szerinti unió; új fajta csak szerződés-bővítéssel (visszafelé kompatibilisen) kerülhet be. */
export type Clue =
  | { kind: 'on'; object: string; room?: string }                  // "X egy [tárgyon] volt (a [helyiségben])"
  | { kind: 'onlyOn'; object: string }                             // "X volt az egyetlen [tárgyon]"
  | { kind: 'in'; room: string }                                   // "X a [helyiségben] volt"
  | { kind: 'notIn'; room: string }
  | { kind: 'beside'; object: string; room?: string }              // "X [tárgy] mellett volt" (ugyanabban a helyiségben, 4 irányban)
  | { kind: 'besideAny'; objects: string[] }                       // "X vagy A vagy B mellett volt"
  | { kind: 'besideChar'; char: CharId }
  | { kind: 'sameRoom'; with: CharId }
  | { kind: 'leftOf'; of: CharId }
  | { kind: 'diagonal'; of: CharId }                               // átlósan Y mellett (közepestől)
  | { kind: 'corner' }
  | { kind: 'distance'; fromObject: string; cells: number }        // szakértő szint / Alien-szabály
  | { kind: 'aloneWithKiller'; room: string }                      // az ÁLDOZAT kártyája
  | { kind: 'roomAlone' }                                          // "a helyiségében senki más nem volt"
  | { kind: 'liar' }                                               // Démon: egy másik nyom hazudik (a pálya `liarOf`-ban jelöli)

export interface PuzzleCharacter {
  id: CharId
  name: string                    // megjelenített név (nem fordítandó)
  race: Race
  victim?: boolean
  source?: { game?: string; film?: string }   // Esemény-pályáknál a forrás-játék
  clues: Clue[]                   // 1 db; Alakváltónál 2 (a játékosnak kell kitalálnia, melyik az igaz)
  clueText: string[]              // ugyanannyi, mint a `clues` — a kártyán látott magyar szöveg (kézzel írt vagy sablonból generált)
}

export interface Puzzle {
  v: 1
  id: PuzzleRef
  mode: PuzzleMode
  world: string                   // "hollowmere" | "fnaf" | "poppy-playtime" | … | "mix"
  chapter?: number                // Klasszikus: 1–3
  title: string
  story?: string                  // bevezető szöveg (Klasszikus/Esemény)
  size: number                    // 5..10
  difficulty: Difficulty
  rooms: Record<string, string>   // betű → név: { K: "Kripta" }
  layout: string[]                // size db sor, size db betű — helyiség-betűk
  objects: ObjectDef[]
  characters: PuzzleCharacter[]   // pontosan `size` db: size−1 gyanúsított + 1 áldozat
  activePowers: Race[]            // a pályán aktív Erő-szabályok
  worldRule?: string              // az Esemény-világ saját szabálya ("cameras", "vacuum", …)
  liarOf?: CharId                 // Démon-szabálynál: melyik karakter nyoma hazudik (a megoldásba tartozik, a játékos nem látja)
  solution: Record<CharId, CellId>
  murderer: CharId
  rev: number                     // javításkor nő; a Supabase `puzzles.rev` tükre
}
