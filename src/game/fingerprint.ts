import type { Puzzle } from '../shared/puzzle'

/**
 * A pálya „ujjlenyomata": a tábla, a helyiségek, a tárgyak, a szereplők és a nyomaik rövid hash-e (FNV-1a).
 * A mentett játék ezt viszi magával (`SessionState.meta.fp`): ha a pálya közben megváltozott (frissítés, újragyártás),
 * a régi lerakások nem illenek rá — ilyenkor a mentést eldobjuk, nem tesszük rá a megváltozott térképre.
 */
export function puzzleFingerprint(p: Pick<Puzzle, 'id' | 'layout' | 'rooms' | 'objects' | 'characters' | 'floors' | 'worldRule' | 'solution'>): string {
  const src = JSON.stringify([p.id, p.layout, p.rooms, p.objects, p.floors ?? null, p.worldRule ?? null, p.solution, p.characters.map((c) => [c.id, c.name, c.clueText, c.clues])])
  let h = 0x811c9dc5
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Igaz, ha a mentés ehhez a pályához készült (a mentés `fp`-je egyezik, vagy nincs mit összevetni). */
export const sessionMatches = (s: { meta?: { fp?: string } } | undefined, fp: string | undefined): boolean => !!s && !!fp && s.meta?.fp === fp
