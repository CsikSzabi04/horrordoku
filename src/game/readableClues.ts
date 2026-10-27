import type { Clue, PuzzleCharacter } from '../shared/puzzle'

/**
 * A kártyán ténylegesen OLVASHATÓ nyomok. A kitakart (`███`, pl. a rádió / spóra-köd szabálya) és a még zárolt (`hidden`, totem nélkül) nyom
 * tartalma a játékos elől el van rejtve — ezért a térkép sem emelhet ki hozzá semmit (tárgyat, padlót, sort, szereplőt), különben a kiemelés
 * elárulná, amit a kártya épp elrejt.
 */
export function readableClues(ch: Pick<PuzzleCharacter, 'clues' | 'clueText' | 'hidden'>, unlocked: boolean): Clue[] {
  return ch.clues.filter((_, i) => !ch.clueText[i]?.includes('███') && !(ch.hidden?.includes(i) && !unlocked))
}
