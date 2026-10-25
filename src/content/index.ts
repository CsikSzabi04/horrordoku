// A `content` API (CONTRACTS 10.) — AI-A tulajdona. Az A5 / A8 bővíti a pályákkal és a további világok karaktereivel.
import type { CharacterInfo, ContentApi } from '../shared/content'
import type { Puzzle, PuzzleMode } from '../shared/puzzle'

const HOLLOWMERE: CharacterInfo[] = [
  { id: 'vlad', name: 'Vlad Drăgulescu', race: 'vampire', world: 'hollowmere', emoji: '🧛',
    bio: 'Elegáns, unott régiségkereskedő; 1612-ben változtatták át. Kizárólag állati vért iszik — legalábbis ezt állítja.' },
  { id: 'morrigan', name: 'Morrigan Ashvale', race: 'witch', world: 'hollowmere', emoji: '🌒',
    bio: 'A gyógyfüves bolt kedves tulajdonosa, egy kilencgenerációs boszorkánydinasztia utolsó tagja. A varjak beszélnek hozzá.' },
  { id: 'silas', name: 'Silas Grey', race: 'ghost', world: 'hollowmere', emoji: '👻',
    bio: 'A Blackwood-kúria egykori házmestere (†1931). Kísért, és mindent lát, ami a falakon belül történik.' },
  { id: 'lilith', name: 'Lilith Vane', race: 'demon', world: 'hollowmere', emoji: '😈',
    bio: 'A Crossroads bár tulajdonosa, alsóbb rendű démon. Alkukat köt, és sosem hazudik egyenesen.' },
  { id: 'ezekiel', name: 'Ezekiel Thorne', race: 'werewolf', world: 'hollowmere', emoji: '🐺',
    bio: 'Hollowmere zárkózott vadőre, vérfarkas. Teliholdkor a hegyekbe menekül — most nem tud.' },
  { id: 'abel', name: 'Ábel Kóródi', race: 'human', world: 'hollowmere', emoji: '📜',
    bio: 'Az Éjjeli Rend levéltárosa. Az utolsó bejegyzése: „Megtaláltam a tizenharmadik nevet."' },
]

export const content: ContentApi = {
  characters: () => HOLLOWMERE,
  // A5 / A8 tölti fel a csomagolt pályákkal; addig üres.
  puzzles: async (_mode?: PuzzleMode): Promise<Puzzle[]> => [],
}
