// A `content` API (CONTRACTS 10.) — AI-A tulajdona. Az A5 / A8 bővíti a pályákkal és a további világok karaktereivel.
import type { CharacterInfo, ContentApi } from '../shared/content'
import type { Puzzle, PuzzleMode } from '../shared/puzzle'
import { loadAll } from './catalog'
import eventCharacters from './event-characters.json'
import { WORLDS } from '../game/worlds'

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

const EXTRA: CharacterInfo[] = [
  { id: 'corvin', name: 'Corvin Hale', race: 'ghoul', world: 'hollowmere', emoji: '🧟', bio: 'A temető éjjeliőre; azt mondja, csak a halottakkal beszélget, mert az élők úgyis hazudnak.' },
  { id: 'selene', name: 'Selene Roth', race: 'witch', world: 'hollowmere', emoji: '🔮', bio: 'Vándor jósnő, aki mindig tudja, ki fog meghalni — csak azt nem, hogy miért épp ő van ott.' },
  { id: 'damian', name: 'Damian Frost', race: 'vampire', world: 'hollowmere', emoji: '🦇', bio: 'A Rend egykori bankára; az adósait sosem felejti el, a szívességeket még kevésbé.' },
  { id: 'isolde', name: 'Isolde Marsh', race: 'human', world: 'hollowmere', emoji: '🕯️', bio: 'Helyi tanítónő és amatőr nyomozó. Kötelességének érzi, hogy mindent leírjon.' },
  { id: 'nyx', name: 'Nyx Crane', race: 'demon', world: 'hollowmere', emoji: '🔥', bio: 'Alkuszi egy keresztút menti motelben. A szerződései mindig tökéletesen szabályosak.' },
  { id: 'rowan', name: 'Rowan Wren', race: 'werewolf', world: 'hollowmere', emoji: '🌕', bio: 'Erdészlány a Fenyves szélén; telihold előtt mindig szabadságra megy.' },
  { id: 'cassian', name: 'Cassian Dusk', race: 'human', world: 'hollowmere', emoji: '📖', bio: 'Könyvtáros, aki többet tud a városról, mint amennyit a térképek mutatnak.' },
  { id: 'elara', name: 'Elara Morrow', race: 'ghost', world: 'hollowmere', emoji: '🕰️', bio: 'Egy régi óragyáros lánya; az órák még mindig az ő idejét ütik.' },
]

export const content: ContentApi = {
  characters: () => {
    const out = [...HOLLOWMERE, ...EXTRA]
    const seen = new Set(out.map((c) => c.id))
    // az Esemény-pályák szereplői (a forrás-játékkal) — a Gyűjtemény ezekből is épül
    for (const c of eventCharacters as Omit<CharacterInfo, 'bio'>[])
      if (!seen.has(c.id)) {
        seen.add(c.id)
        out.push({ ...c, bio: `${WORLDS[c.world]?.game ?? c.world} — ${WORLDS[c.world]?.title ?? c.world}.` })
      }
    return out
  },
  puzzles: (mode?: PuzzleMode): Promise<Puzzle[]> => loadAll(mode),
}
