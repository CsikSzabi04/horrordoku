import type { CastMember } from './vocab'

/**
 * Hétköznapi nevek a Klasszikus módhoz (mint a murdoku.com): minden betűre több név, hogy a kezdőbetű pályánként egyedi legyen
 * (A–… a gyanúsítottaknak, V az áldozatnak). A nemet a ♂/♀ jelvény és az arckép használja.
 */
export type Gender = 'm' | 'f'
const N = (name: string, g: Gender): [string, Gender] => [name, g]

export const NAME_POOL: Record<string, [string, Gender][]> = {
  A: [N('Alfred', 'm'), N('Amir', 'm'), N('Anna', 'f'), N('Adam', 'm')],
  B: [N('Barry', 'm'), N('Bianca', 'f'), N('Bruno', 'm'), N('Bella', 'f')],
  C: [N('Carl', 'm'), N('Clara', 'f'), N('Cody', 'm'), N('Carly', 'f')],
  D: [N('Deborah', 'f'), N('Derek', 'm'), N('Dora', 'f'), N('Daniel', 'm')],
  E: [N('Ervin', 'm'), N('Eva', 'f'), N('Emmett', 'm'), N('Elena', 'f')],
  F: [N('Felicia', 'f'), N('Frank', 'm'), N('Flavia', 'f'), N('Fred', 'm')],
  G: [N('Gordon', 'm'), N('Gina', 'f'), N('Greg', 'm'), N('Gabriel', 'm')],
  H: [N('Henry', 'm'), N('Hugo', 'm'), N('Hanna', 'f'), N('Holly', 'f')],
  I: [N('Ivan', 'm'), N('Iris', 'f'), N('Igor', 'm'), N('Ibolya', 'f')],
  J: [N('Jim', 'm'), N('Julia', 'f'), N('Jack', 'm'), N('Jenny', 'f')],
  K: [N('Kaiden', 'm'), N('Kara', 'f'), N('Karl', 'm'), N('Kitty', 'f')],
  L: [N('Langston', 'm'), N('Lena', 'f'), N('Leo', 'm'), N('Lucy', 'f')],
  M: [N('Mara', 'f'), N('Max', 'm'), N('Mia', 'f'), N('Milo', 'm')],
  N: [N('Nancy', 'f'), N('Nina', 'f'), N('Nick', 'm'), N('Noah', 'm')],
  O: [N('Oliver', 'm'), N('Olga', 'f'), N('Oscar', 'm')],
  P: [N('Paul', 'm'), N('Petra', 'f'), N('Peter', 'm')],
  V: [N('Vlad', 'm'), N('Vickie', 'f'), N('Victor', 'm'), N('Vera', 'f')],
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** `n − 1` gyanúsított (A, B, C… betűkkel) és az áldozat (V) — a `rnd` dönt a nevekről, így determinisztikus. */
export function classicCast(rnd: () => number, n: number): { suspects: CastMember[]; victim: CastMember } {
  const letters = 'ABCDEFGHIJKLMNOP'.slice(0, n - 1)
  const mk = (l: string): CastMember => {
    const [name, gender] = NAME_POOL[l]![Math.floor(rnd() * NAME_POOL[l]!.length)]!
    return { id: slug(name), name, race: 'human', gender }
  }
  return { suspects: [...letters].map(mk), victim: mk('V') }
}
