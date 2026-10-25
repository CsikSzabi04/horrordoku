import type { CastMember, ClueKind, GenOpts } from '../engine/generator'
import type { Difficulty, Race } from '../shared/puzzle'
import { expandWorld } from './event-cases'

/**
 * Az Esemény mód világai (GDD 11): a pályák adatai (világonként 5 ügy: lásd `event-cases.ts`). A pályákat az `author.test.ts` generálja ebből a `puzzles/event/*.json`-ba.
 * FIGYELEM (GDD 21): a nevek és világok harmadik felek védjegyei — a nyilvános kiadás előtt a `name`/`source` mezők itt és
 * a kész JSON-okban cserélhetők (a játékmenet nem függ tőlük). A helyi fejlesztésben a GDD szerinti nevek szerepelnek.
 */
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const P = (name: string, race: Race = 'human'): CastMember => ({ id: slug(name), name, race })

const CLASSIC: ClueKind[] = ['on', 'onlyOn', 'in', 'beside', 'besideAny', 'notIn', 'dir', 'notBeside', 'besideCat', 'notBesideCat', 'line', 'edge', 'roomCount', 'notSameRoom', 'diagonal', 'besideChar']

/** Az Esemény-pályák gazdagabb nyomkészlete: égtáj, átlós, kapcsolat, tagadás, „x sorral északra”, „egyedül vele”… */
const RICH: ClueKind[] = [...CLASSIC, 'northOf', 'southOf', 'aloneWith', 'sameRoom', 'leftOf']
/** Nehézségenként az összetett nyomú szereplők célaránya. */
const RICH_SHARE: Record<Difficulty, number> = { 1: 0.4, 2: 0.55, 3: 0.65, 4: 0.75, 5: 0.8 }

export interface EventDef {
  file: string
  seed: string
  d: Difficulty
  game: string // a forrás-játék
  opts: GenOpts
}

const ev = (no: number, slug2: string, world: string, d: Difficulty, size: number, game: string, title: string, story: string, o: Partial<GenOpts> & { rooms: string[]; stand: string[]; block: string[]; cast: CastMember[]; victim: CastMember }): EventDef => {
  const id = `event-${String(no).padStart(2, '0')}-${slug2}`
  return { file: id, seed: `E${no}`, d, game, opts: { id, mode: 'event', world, title, story, size, kinds: RICH, rich: RICH_SHARE[d], ...o } }
}

/** A 19 világ alap-definíciója; az `EVENTS` ezekből készül (világonként 5 ügy, lásd `event-cases.ts`). */
const WORLD_DEFS: EventDef[] = [
  ev(1, 'fnaf', 'fnaf', 2, 6, "Five Nights at Freddy's", 'Freddy Fazbear Pizzériája', 'Az éjjeliőr műszakja alatt a lila ruhás férfi nem tért vissza a Biztonsági raktárból. A kamerák mindent láttak — de egyszerre csak egy szobát.', {
    worldRule: 'cameras', rooms: ['Színpad', 'Ebédlő', 'Pirate Cove', 'Konyha', 'Iroda', 'Nyugati folyosó'], stand: ['partytable', 'giftbox', 'carpet'], block: ['oven', 'camera', 'doorbtn'],
    cast: [P('Freddy', 'ghoul'), P('Bonnie', 'ghoul'), P('Chica', 'ghoul'), P('Foxy', 'ghoul'), P('Golden Freddy', 'ghost'), P('Mike Schmidt'), P('A Marionett', 'ghost')], victim: P('William Afton', 'human'),
  }),
  ev(2, 'poppy-playtime', 'poppy-playtime', 2, 6, 'Poppy Playtime', 'Playtime Co. gyár', 'Az elhagyatott játékgyárban Huggy Wuggy nem kel fel többé. A zöld kéz mindenhová elér — a gyanúsítottak viszont nem mind.', {
    worldRule: 'grab', rooms: ['Előcsarnok', 'Gyártósor', 'Játékbolt', 'Játszószoba', 'Raktár', 'Szellőzőrendszer'], stand: ['toybox', 'carpet'], block: ['conveyor', 'blocks', 'speaker'], extra: [{ type: 'panel', count: 2 }],
    cast: [P('Kissy Missy', 'ghoul'), P('Mommy Long Legs', 'ghoul'), P('Bunzo Bunny', 'ghoul'), P('PJ Pug-a-Pillar', 'ghoul'), P('CatNap', 'ghoul'), P('DogDay', 'ghoul'), P('Poppy', 'ghoul'), P('A Látogató')], victim: P('Huggy Wuggy', 'ghoul'),
  }),
  ev(3, 'resident-evil-2', 'resident-evil', 3, 7, 'Resident Evil', 'Raccoon City Police Department', '1998 szeptembere. Mr. X a kalapja mellett fekszik, a kulcsos ajtók pedig mindkét oldalról figyelnek.', {
    worldRule: 'doors', rooms: ['Főcsarnok', 'Nyugati iroda', 'Sötétkamra', 'Könyvtár', 'Mentőszoba', 'Kapitányi iroda', 'Lőtér'], stand: ['itembox', 'herb', 'crate', 'carpet'], block: ['typewriter', 'statue'],
    extra: [{ type: 'doorSpade', count: 1, boundary: true }, { type: 'doorDiamond', count: 1, boundary: true }, { type: 'doorCircle', count: 1, boundary: true }],
    cast: [P('Leon S. Kennedy'), P('Claire Redfield'), P('Ada Wong'), P('Sherry Birkin'), P('Annette Birkin'), P('Marvin Branagh'), P('Brian Irons')], victim: P('Mr. X', 'ghoul'),
  }),
  ev(4, 'alien-isolation', 'alien-isolation', 3, 7, 'Alien: Isolation', 'Sevastopol állomás', 'A Xenomorph a szellőzőben csúszott el utoljára. A mozgásérzékelő nem nevet mond — csak távolságot.', {
    worldRule: 'motion', rooms: ['Híd', 'Orvosi szárny', 'Hangár', 'Gépház', 'Szellőzőrendszer', 'Légzsilip'], stand: ['cryopod', 'vent', 'bench'], block: ['flamer', 'cardreader'], extra: [{ type: 'airlock', count: 1 }, { type: 'tracker', count: 1 }],
    kinds: [...RICH, 'distance'], prefer: { kind: 'distance', count: 2 },
    cast: [P('Amanda Ripley'), P('Nina Taylor'), P('Marlow'), P('Waits'), P('Axel'), P('Ricardo'), P('Samuels', 'ghost')], victim: P('A Xenomorph', 'ghoul'),
  }),
  ev(5, 'until-dawn', 'until-dawn', 3, 7, 'Until Dawn', 'Blackwood-hegy', 'A hegyi kabinban a Wendigo végzett az éjszakával. A totemek mellett álló szereplők nyomai többet árulnak el.', {
    worldRule: 'totems', rooms: ['Nappali', 'Konyha', 'Fürdő', 'Pince', 'Hálók', 'Tisztás', 'Felvonó'], stand: ['sofa', 'carpet', 'bench'], block: ['fireplace', 'trophy', 'gunrack'], extra: [{ type: 'totem', count: 3 }], hidden: 2,
    cast: [P('Sam'), P('Mike'), P('Jessica'), P('Emily'), P('Matt'), P('Ashley'), P('Chris'), P('Josh')], victim: P('A Wendigo', 'werewolf'),
  }),
  ev(6, 'dead-space', 'dead-space', 4, 8, 'Dead Space', 'USG Ishimura', 'A hajón egy Hunter maradt holtan. A nyomásmentes szekciókba csak páncélos léphet — a kártyákon ott a jelzés.', {
    worldRule: 'vacuum', rooms: ['Híd', 'Orvosi szárny', 'Gépház', 'Gyárterem', 'Hidroponika', 'Külső szekció'], stand: ['stasis', 'bench', 'crate'], block: ['savepoint', 'terminal', 'lockdoor'], vacuum: ['Külső szekció', 'Gyárterem'],
    cast: [P('Isaac Clarke'), P('Kendra Daniels'), P('Zach Hammond'), P('Terrence Kyne'), P('Nicole Brennan'), P('Hans Tiedemann'), P('Challus Mercer'), P('Ellie Langford'), P('Benjamin Mathius')], victim: P('A Hunter', 'ghoul'),
  }),
  ev(7, 'outlast', 'outlast', 4, 8, 'Outlast', 'Mount Massive Menedékház', 'Sötét van, az elem fogy. Chris Walker a pincebörtönben végezte — de csak a kurzorod körül látsz.', {
    worldRule: 'nightvision', rooms: ['Fogadócsarnok', 'Kórterem-szárny', 'Pincebörtön', 'Kápolna', 'Csatorna', 'Őrszoba', 'Villamos-terem'], stand: ['batterybox', 'wheelchair', 'carpet'], block: ['hospbed', 'locker', 'switch'],
    cast: [P('Miles Upshur'), P('Waylon Park'), P('Richard Trager'), P('Father Martin'), P('Dr. Wernicke'), P('Jeremy Blaire'), P('Eddie Gluskin')], victim: P('Chris Walker', 'ghoul'),
  }),
  ev(8, 'silent-hill-2', 'silent-hill', 4, 8, 'Silent Hill', 'A Köd Városa', 'A ködben Pyramid Head holtteste fekszik. A rádió sistereg: a nyomok néhány szava kitakarva marad.', {
    worldRule: 'radio', prefer: { kind: 'on', count: 4 }, rooms: ['Kórterem', 'Lépcsőház', 'Apartman', 'Bowlingpálya', 'Tóparti szálló', 'Másik világ'], stand: ['wheelchair', 'carpet', 'bench'], block: ['hospbed', 'window', 'doll'], extra: [{ type: 'radio', count: 2 }], redact: true,
    cast: [P('James Sunderland'), P('Maria'), P('Angela Orosco'), P('Eddie Dombrowski'), P('Laura'), P('Mary', 'ghost'), P('A Hazug Alak', 'ghoul'), P('A Buborékfejű Ápolónő', 'ghoul')], victim: P('Pyramid Head', 'ghoul'),
  }),
  ev(9, 'dead-by-daylight', 'dead-by-daylight', 5, 9, 'Dead by Daylight', 'Az Entitás birodalma', 'A Trapper a saját kampóin végezte. Aki generátor mellett áll, zajt csap — a gyilkos pedig sosem hibázik így.', {
    worldRule: 'generators', rooms: ['Pajta', 'Kukoricás', 'Fészer', 'Pince', 'Erdei tisztás', 'Kapu-terület', 'Kampó-pince', 'Ház'], stand: ['medkit', 'pallet', 'crate'], block: ['hook', 'gate', 'tree'], extra: [{ type: 'generator', count: 4 }],
    cast: [P('Dwight Fairfield'), P('Meg Thomas'), P('Claudette Morel'), P('Jake Park'), P('Nea Karlsson'), P('Feng Min'), P('David King'), P('Quentin Smith')], victim: P('A Trapper', 'ghoul'),
  }),
  ev(10, 'alan-wake', 'alan-wake', 5, 10, 'Alan Wake', 'Bright Falls', 'Dr. Emil Hartman holtan fekszik az elme-kórházban. A fény és a sötétség mezői közt a Birtokoltak csak sötétben állhatnak.', {
    worldRule: 'light', rooms: ['Fűrésztelep', 'Vendégház', 'Rádióállomás', 'Rendőrség', 'Erdei ösvény', 'Tóparti stég', 'Zane kunyhója', 'Elme-kórház'], stand: ['crate', 'bench', 'carpet'], block: ['typewriter', 'coffeemaker'],
    extra: [{ type: 'lamp', count: 5 }, { type: 'charger', count: 2 }], kinds: [...RICH, 'lit', 'dark'], prefer: { kind: 'dark', count: 3 },
    cast: [P('Alan Wake'), P('Alice Wake'), P('Barry Wheeler'), P('Sarah Breaker'), P('Rose Marigold'), P('Thomas Zane', 'ghost'), P('Odin Anderson'), P('Tor Anderson'), P('Cynthia Weaver'), P('Pat Maine')], victim: P('Dr. Emil Hartman'),
  }),
  ev(11, 'stranger-things', 'stranger-things', 3, 7, 'Stranger Things', 'Starcourt Mall', '1985. július 4., Starcourt Mall. Vecna a Titkos labor liftjében hever. Az áramszünet sötétjében csak a zseblámpád fénye marad: a Fejjel lefelé világban csak azt látod, ami a kurzorod körül van.', {
    worldRule: 'nightvision', rooms: ['Scoops Ahoy', 'Food court', 'Mozi', 'Játékbolt', 'Szökőkút-tér', 'Szolgálati folyosó', 'Titkos labor'], stand: ['bench', 'chair', 'carpet'], block: ['counter', 'popcorn', 'arcade', 'fountain'],
    cast: [P('Eleven'), P('Mike Wheeler'), P('Dustin Henderson'), P('Lucas Sinclair'), P('Will Byers'), P('Max Mayfield'), P('Steve Harrington'), P('Robin Buckley'), P('Jim Hopper'), P('Erica Sinclair')], victim: P('Vecna', 'ghoul'),
  }),
  ev(12, 'game-of-thrones', 'game-of-thrones', 4, 8, 'Game of Thrones', 'Winterfell', 'Winterfell hideg éjszakáján az Éjkirály holtteste a Fagyott tavon fekszik. A Fal túloldalára csak páncélos (🛡) merészkedik — a kártyákon ott a jelzés.', {
    worldRule: 'vacuum', rooms: ['Nagyterem', 'Isteni liget', 'Fegyvertár', 'Kripta', 'Toronyszoba', 'A Falon túl', 'Fagyott tó'], stand: ['bench', 'carpet', 'crate'], block: ['throne', 'armor', 'fireplace', 'statue'], vacuum: ['A Falon túl', 'Fagyott tó'],
    cast: [P('Jon Snow'), P('Daenerys Targaryen'), P('Tyrion Lannister'), P('Arya Stark'), P('Sansa Stark'), P('Cersei Lannister'), P('Jaime Lannister'), P('Bran Stark'), P('Samwell Tarly')], victim: P('Az Éjkirály', 'ghoul'),
  }),
  ev(13, 'rick-and-morty', 'rick-and-morty', 3, 7, 'Rick and Morty', 'A Smith-ház garázsa', 'Mr. Meeseeks holtan hever a garázsban — valaki túl sokat kért tőle. A portálok mindkét oldalra átlátnak: a portál melletti nyomok a szomszéd helyiségre is érvényesek.', {
    worldRule: 'doors', rooms: ['Garázs', 'Nappali', 'Konyha', 'Morty szobája', 'Űrhajó', 'Citadella', 'Csőlakás-dimenzió'], stand: ['sofa', 'bench', 'crate'], block: ['fridge', 'tv', 'toolbox', 'machine'],
    extra: [{ type: 'doorGreen', count: 1, boundary: true }, { type: 'doorBlue', count: 1, boundary: true }, { type: 'doorOrange', count: 1, boundary: true }],
    cast: [P('Rick Sanchez'), P('Morty Smith'), P('Summer Smith'), P('Beth Smith'), P('Jerry Smith'), P('Birdperson'), P('Squanchy'), P('Mr. Poopybutthole'), P('Evil Morty')], victim: P('Mr. Meeseeks', 'ghost'),
  }),
  ev(14, 'vampire-diaries', 'vampire-diaries', 4, 8, 'The Vampire Diaries', 'Mystic Falls', 'Mystic Falls, a szüreti fesztivál éjszakája. Katherine Pierce holtan fekszik a temetőben. A napfény mezőin a vámpírok nem állhatnak — a lámpák fényköre kijelöli az árnyékot.', {
    worldRule: 'light', rooms: ['Mystic Grill', 'Salvatore-kúria', 'Gilbert-ház', 'Wickery-híd', 'Lockwood-kúria', 'Temető', 'Gimnázium', 'Régi templom'], stand: ['bench', 'carpet', 'chair'], block: ['candle', 'tree', 'grave', 'statue'],
    extra: [{ type: 'lamp', count: 5 }, { type: 'charger', count: 2 }], kinds: [...RICH, 'lit', 'dark'], prefer: { kind: 'dark', count: 3 },
    cast: [P('Elena Gilbert'), P('Stefan Salvatore', 'vampire'), P('Damon Salvatore', 'vampire'), P('Bonnie Bennett', 'witch'), P('Caroline Forbes', 'vampire'), P('Matt Donovan'), P('Jeremy Gilbert'), P('Alaric Saltzman'), P('Tyler Lockwood', 'werewolf')], victim: P('Katherine Pierce', 'vampire'),
  }),
  ev(15, 'kalandra-fel', 'adventure-time', 2, 6, 'Kalandra fel! (Adventure Time)', 'Ooo Földje', 'Ooo Földjén a Lich holtteste a sírboltban hever. A térkép nem mutat mindent: néhány szereplőről csak annyi derül ki, milyen messze volt a kardtól vagy BMO-tól.', {
    worldRule: 'motion', rooms: ['Fa-erőd', 'Cukorka Királyság', 'Jég Királyság', 'Lich-sírbolt', 'Tűz Királyság', 'Sötét erdő'], stand: ['bench', 'crate', 'carpet'], block: ['tree', 'bush', 'rock'],
    extra: [{ type: 'sword', count: 1 }, { type: 'bmo', count: 1 }], kinds: [...RICH, 'distance'], prefer: { kind: 'distance', count: 2 },
    cast: [P('Finn'), P('Jake'), P('Rágógumi hercegnő'), P('Marceline', 'vampire'), P('Jégkirály'), P('BMO'), P('Lumpy hercegnő')], victim: P('A Lich', 'ghoul'),
  }),
  ev(16, 'twilight', 'twilight', 3, 7, 'Alkonyat (Twilight)', 'Forks', 'Forks, az örök eső városa. James, a követő vámpír az erdei tisztáson fekszik. A totemek mellett Alice látomásai feltárulnak: az ott álló szereplők plusz nyomot kapnak.', {
    worldRule: 'totems', rooms: ['Cullen-ház', 'Forks Gimnázium', 'Erdei tisztás', 'La Push part', 'Swan-ház', 'Forks kórház', 'Volturi-torony'], stand: ['bench', 'carpet', 'sofa'], block: ['tree', 'bush', 'rock', 'fireplace'], extra: [{ type: 'totem', count: 3 }], hidden: 2,
    cast: [P('Bella Swan'), P('Edward Cullen', 'vampire'), P('Jacob Black', 'werewolf'), P('Alice Cullen', 'vampire'), P('Carlisle Cullen', 'vampire'), P('Charlie Swan'), P('Rosalie Hale', 'vampire'), P('Jasper Hale', 'vampire')], victim: P('James', 'vampire'),
  }),
  ev(17, 'the-walking-dead', 'walking-dead', 4, 8, 'The Walking Dead', 'Alexandria', 'A világvége után Alexandria főtere elcsendesedett: A Kormányzó holtan hever a börtön cellablokkjában. A generátor zaja odacsalja a kóborló fertőzötteket — a gyilkos nem állhat generátor mellett.', {
    worldRule: 'generators', rooms: ['Börtön-cellablokk', 'Farm', 'Alexandria főtér', 'Hilltop', 'Fegyvertár', 'Templom', 'Erdei út'], stand: ['bench', 'crate', 'carpet'], block: ['car', 'tent', 'barrel', 'campfire'], extra: [{ type: 'generator', count: 4 }],
    cast: [P('Rick Grimes'), P('Michonne'), P('Daryl Dixon'), P('Carol Peletier'), P('Glenn Rhee'), P('Maggie Greene'), P('Negan'), P('Carl Grimes')], victim: P('A Kormányzó'),
  }),
  ev(18, 'the-last-of-us', 'last-of-us', 5, 9, 'The Last of Us', 'Karantén-zóna', 'Boston karantén-zónája, húsz évvel a kitörés után. Egy Clicker holtteste hever a metróban. A rádió recseg a spóra-ködben: a nyomok néhány szava kitakarva marad.', {
    worldRule: 'radio', prefer: { kind: 'on', count: 4 }, rooms: ['Karantén-zóna', 'Pittsburgh', 'Tommy gátja', 'Jackson', 'Egyetem', 'Kórház', 'Metró', 'Hegyi kabin'], stand: ['bench', 'crate', 'carpet'], block: ['car', 'tent', 'tree', 'rock'], extra: [{ type: 'radio', count: 2 }], redact: true,
    cast: [P('Joel Miller'), P('Ellie Williams'), P('Tess'), P('Tommy Miller'), P('Marlene'), P('Bill'), P('Henry'), P('Sam'), P('Riley'), P('Abby Anderson')], victim: P('A Clicker', 'ghoul'),
  }),
  ev(19, 'harry-potter', 'harry-potter', 5, 10, 'Harry Potter', 'Roxfort', 'A Roxfort Nagytermében Voldemort nagyúr holtan fekszik. A Tekergők Térképe egyszerre csak egy helyiséget mutat élesen — válts helyiséget, a többi nyom elhalványul.', {
    worldRule: 'cameras', rooms: ['Nagyterem', 'Griffendél-torony', 'Bájitaltan terem', 'Tiltott Rengeteg', 'Roxfort kapuja', 'Hagrid kunyhója', 'Szükség Szobája', 'Kviddics-pálya'], stand: ['bench', 'carpet', 'broom'], block: ['cauldron', 'armor', 'painting', 'candle'],
    cast: [P('Harry Potter'), P('Hermione Granger'), P('Ron Weasley'), P('Albus Dumbledore'), P('Perselus Piton'), P('Hagrid'), P('Draco Malfoy'), P('Neville Longbottom'), P('Luna Lovegood'), P('Ginny Weasley'), P('Minerva McGonagall')], victim: P('Voldemort nagyúr', 'ghost'),
  }),
]

/** Minden Esemény-ügy (19 világ × 5): a `puzzles/event/*.json` ebből készül. */
export const EVENTS: EventDef[] = WORLD_DEFS.flatMap(expandWorld)
