import type { CastMember, ClueKind, GenOpts } from '../engine/generator'
import type { Difficulty, Race } from '../shared/puzzle'
import { expandWorld } from './event-cases'

/**
 * Az Esemény mód világai (GDD 11): a pályák adatai (világonként 5 ügy: lásd `event-cases.ts`). A pályákat az `author.test.ts` generálja ebből a `puzzles/event/*.json`-ba.
 * A nevek, világok és helyiségek mind eredeti, kitalált nevek (a franchise-ok kiváltása: lásd `franchise.md`).
 */
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
/** `id`: a karakter stabil azonosítója (mentés, megjelenés, Gyűjtemény) — a név bármikor átírható, az azonosító a régi névből marad; nélküle a névből készül. */
/** A női szereplők azonosítói (a magyar nevek szlagjai) — a kártya sarkában ♀, egyébként ♂. */
const FEMALE = new Set(["Nyuszi","Csibi","Csókos Mici","Hosszúlábú Anyu","Bábika Rózsi","Hegedűs Klára","Lin Adél","Bíró Csenge","Bíró Anett","Antal Anita","Tóth Nóra","Júlia","Emese","Ágnes","Kinga Dezső","Nikolett Berán","Eszter Lakatos","Marianna","Anna Oroszi","Lujza","Mara","A Lámpásfejű Ápolónő","Margó Tamás","Klaudia Morvai","Nelli Károlyi","Ilona Vágó","Sára Törő","Rózsa Csíkos","Cintia Szövő","Nyolc","Mariann Majer","Rita Berki","Erika Sárosi","Dalma Tűzi","Aliz Szürke","Sarolta Hideg","Cecília Aranyi","Zsanett Szmit","Bea Szmit","Ella Gyöngyösi","Bogi Bertalan","Karola Fábián","Kata Pásztor","Szaloncukor hercegnő","Marcella","Göcsörtös hercegnő","Bella Lenkei","Alíz Kollár","Rozália Hajdú","Mihaela Szép","Kamilla Pelle","Magdolna Zöld","Ella Szűcs","Tesza","Marcsi Makai","Renáta","Abigél Andrásy","Hermina Gazdag","Lujza Szerelmes","Gina Vasvári","Minerva Kopjás"].map(slug))
const P = (name: string, race: Race = 'human', id?: string): CastMember => ({ id: id ?? slug(name), name, race, gender: FEMALE.has(id ?? slug(name)) ? 'f' : 'm' })

const CLASSIC: ClueKind[] = ['on', 'onlyOn', 'in', 'beside', 'besideAny', 'notIn', 'dir', 'notBeside', 'besideCat', 'notBesideCat', 'line', 'edge', 'roomCount', 'notSameRoom', 'diagonal', 'besideChar']

/** Az Esemény-pályák gazdagabb nyomkészlete: égtáj, átlós, kapcsolat, tagadás, „x sorral északra”, „egyedül vele”… */
const RICH: ClueKind[] = [...CLASSIC, 'northOf', 'southOf', 'aloneWith', 'sameRoom', 'leftOf', 'onlyGender']
/** Nehézségenként az összetett nyomú szereplők célaránya. */
const RICH_SHARE: Record<Difficulty, number> = { 1: 0.4, 2: 0.55, 3: 0.65, 4: 0.75, 5: 0.8 }

export interface EventDef {
  file: string
  seed: string
  d: Difficulty
  game: string // a világ kiadási neve (a Gyűjtemény forrás-sora)
  opts: GenOpts
}

const ev = (no: number, slug2: string, world: string, d: Difficulty, size: number, game: string, title: string, story: string, o: Partial<GenOpts> & { rooms: string[]; stand: string[]; block: string[]; cast: CastMember[]; victim: CastMember }): EventDef => {
  const id = `event-${String(no).padStart(2, '0')}-${slug2}`
  return { file: id, seed: `E${no}`, d, game, opts: { id, mode: 'event', world, title, story, size, kinds: RICH, rich: RICH_SHARE[d], ...o } }
}

/** A 19 világ alap-definíciója; az `EVENTS` ezekből készül (világonként 5 ügy, lásd `event-cases.ts`). */
const WORLD_DEFS: EventDef[] = [
  ev(1, 'night-pizzeria', 'night-pizzeria', 2, 6, "Five Evenings at Teddy's", 'Teddy Mackó Pizzériája', 'Az éjjeliőr műszakja alatt a lila ruhás férfi nem tért vissza a Biztonsági raktárból. A kamerák mindent láttak — de egyszerre csak egy szobát.', {
    worldRule: 'cameras', rooms: ['Színpad', 'Ebédlő', 'Kalóz-öböl', 'Konyha', 'Iroda', 'Nyugati folyosó'], stand: ['partytable', 'giftbox', 'carpet'], block: ['oven', 'camera', 'doorbtn'],
    cast: [P('Teddy Bolyhosmackó', 'ghoul', 'brumi'), P('Benny Nyuszi', 'ghoul', 'nyuszi'), P('Csipi Csibe', 'ghoul', 'csibi'), P('Rozsdás Róka', 'ghoul', 'roko'), P('Arany Teddy', 'ghost', 'arany-brumi'), P('Miles Schmitt', 'human', 'kiss-marton'), P('A Zsinórmester', 'ghost', 'a-babu')], victim: P('Warren Ashford', 'human', 'varga-ferenc'),
  }),
  ev(2, 'toy-factory', 'toy-factory', 2, 6, 'Daisy Toytime', 'Toytime Co. Gyár', 'Az elhagyatott játékgyárban Öleli Bújli nem kel fel többé. A zöld kéz mindenhová elér — a gyanúsítottak viszont nem mind.', {
    worldRule: 'grab', rooms: ['Előcsarnok', 'Gyártósor', 'Játékbolt', 'Játszószoba', 'Raktár', 'Szellőzőrendszer'], stand: ['toybox', 'carpet'], block: ['conveyor', 'blocks', 'speaker'], extra: [{ type: 'panel', count: 2 }],
    cast: [P('Puszis Mici', 'ghoul', 'csokos-mici'), P('Nyújtólábú Anyu', 'ghoul', 'hosszulabu-anyu'), P('Bongó Nyuszi', 'ghoul', 'dobos-nyuszi'), P('DJ Kutyaszázlábú', 'ghoul', 'pottyos-hernyo'), P('CicaSzundi', 'ghoul', 'macskanap'), P('KutyaHajnal', 'ghoul', 'kutyanap'), P('Daisy', 'ghoul', 'babika-rozsi'), P('A Látogató')], victim: P('Öleli Bújli', 'ghoul', 'olelo-leny'),
  }),
  ev(3, 'city-police', 'city-police', 3, 7, 'Vile Dweller', 'Lemur Város Rendőrség', '1998 szeptembere. Y úr a kalapja mellett fekszik, a kulcsos ajtók pedig mindkét oldalról figyelnek.', {
    worldRule: 'doors', rooms: ['Főcsarnok', 'Nyugati iroda', 'Sötétkamra', 'Könyvtár', 'Mentőszoba', 'Kapitányi iroda', 'Lőtér'], stand: ['itembox', 'herb', 'crate', 'carpet'], block: ['typewriter', 'statue'],
    extra: [{ type: 'doorSpade', count: 1, boundary: true }, { type: 'doorDiamond', count: 1, boundary: true }, { type: 'doorCircle', count: 1, boundary: true }],
    cast: [P('Leo S. Kendrick', 'human', 'lazar-leo'), P('Clara Redbrook', 'human', 'hegedus-klara'), P('Ava Wei', 'human', 'lin-adel'), P('Cherry Birkley', 'human', 'biro-csenge'), P('Anita Birkley', 'human', 'biro-anett'), P('Martin Brannick', 'human', 'bodor-marcell'), P('Bryce Steel', 'human', 'banfi-bruno')], victim: P('Y úr', 'ghoul', 'a-sotet-ur'),
  }),
  ev(4, 'space-station', 'space-station', 3, 7, 'Outsider: Solitude', 'Novastopol Állomás', 'Az Űrszülött a szellőzőben csúszott el utoljára. A mozgásérzékelő nem nevet mond — csak távolságot.', {
    worldRule: 'motion', rooms: ['Híd', 'Orvosi szárny', 'Hangár', 'Gépház', 'Szellőzőrendszer', 'Légzsilip'], stand: ['cryopod', 'vent', 'bench'], block: ['flamer', 'cardreader'], extra: [{ type: 'airlock', count: 1 }, { type: 'tracker', count: 1 }],
    kinds: [...RICH, 'distance'], prefer: { kind: 'distance', count: 2 },
    cast: [P('Amelia Ridley', 'human', 'antal-anita'), P('Nora Tailor', 'human', 'toth-nora'), P('Harlow', 'human', 'meszaros'), P('Wade', 'human', 'veres'), P('Axton', 'human', 'akos'), P('Rico', 'human', 'rokus'), P('Sampson', 'ghost', 'sos')], victim: P('Az Űrszülött', 'ghoul', 'az-urleny'),
  }),
  ev(5, 'mountain-cabin', 'mountain-cabin', 3, 7, 'Before Daybreak', 'Wendigo hegy', 'A hegyi kabinban az Agancsos Éhség végzett az éjszakával. A totemek mellett álló szereplők nyomai többet árulnak el.', {
    worldRule: 'totems', rooms: ['Nappali', 'Konyha', 'Fürdő', 'Pince', 'Hálók', 'Tisztás', 'Felvonó'], stand: ['sofa', 'carpet', 'bench'], block: ['fireplace', 'trophy', 'gunrack'], extra: [{ type: 'totem', count: 3 }], hidden: 2,
    cast: [P('Sammy', 'human', 'dani'), P('Mick', 'human', 'mihaly'), P('Jessamine', 'human', 'julia'), P('Emery', 'human', 'emese'), P('Matty', 'human', 'mate'), P('Ashlyn', 'human', 'agnes'), P('Kit', 'human', 'krisztian'), P('Joss', 'human', 'gergo')], victim: P('Az Agancsos Éhség', 'werewolf', 'a-hegyi-szellem'),
  }),
  ev(6, 'deep-ship', 'deep-ship', 4, 8, 'Lifeless Void', 'Kuromura Űrhajó', 'A hajón egy Üldöző maradt holtan. A nyomásmentes szekciókba csak páncélos léphet — a kártyákon ott a jelzés.', {
    worldRule: 'vacuum', rooms: ['Híd', 'Orvosi szárny', 'Gépház', 'Gyárterem', 'Hidroponika', 'Külső szekció'], stand: ['stasis', 'bench', 'crate'], block: ['savepoint', 'terminal', 'lockdoor'], vacuum: ['Külső szekció', 'Gyárterem'],
    cast: [P('Isaiah Clarkson', 'human', 'ivan-kovacs'), P('Kara Danielson', 'human', 'kinga-dezso'), P('Zane Hammerton', 'human', 'zoltan-hamar'), P('Tristan Kline', 'human', 'tibor-kun'), P('Nicolette Brenner', 'human', 'nikolett-beran'), P('Henrik Tillmann', 'human', 'hubert-tamas'), P('Callum Merrow', 'human', 'csaba-mester'), P('Ella Longford', 'human', 'eszter-lakatos'), P('Benedict Mathers', 'human', 'bence-marton')], victim: P('Az Üldöző', 'ghoul', 'a-vadasz'),
  }),
  ev(7, 'summit-shelter', 'summit-shelter', 4, 8, 'Outlive', 'Mount Hollow Elmegyógyintézet', 'Sötét van, az elem fogy. Kris Strider a menedékházban végezte — de csak a kurzorod körül látsz.', {
    worldRule: 'nightvision', rooms: ['Fogadócsarnok', 'Kórterem-szárny', 'Pincebörtön', 'Kápolna', 'Csatorna', 'Őrszoba', 'Villamos-terem'], stand: ['batterybox', 'wheelchair', 'carpet'], block: ['hospbed', 'locker', 'switch'],
    cast: [P('Milo Upcroft', 'human', 'milan-ungvari'), P('Wade Parks', 'human', 'vajk-pal'), P('Richmond Traeger', 'human', 'rudolf-tarnai'), P('Marvin atya', 'human', 'atya-marton'), P('Dr. Werling', 'human', 'dr-vargha'), P('Jerome Blake', 'human', 'jeno-balogh'), P('Edwin Glasswick', 'human', 'elemer-gulyas')], victim: P('Kris Strider', 'ghoul', 'kristof-vadas'),
  }),
  ev(8, 'fog-town', 'fog-town', 4, 8, 'Hushed Heights', 'Hushed Hill Város', 'A ködben az Obeliszkfejű Hóhér holtteste fekszik. A rádió sistereg: a nyomok néhány szava kitakarva marad.', {
    worldRule: 'radio', prefer: { kind: 'on', count: 4 }, rooms: ['Kórterem', 'Lépcsőház', 'Apartman', 'Bowlingpálya', 'Tóparti szálló', 'Másik világ'], stand: ['wheelchair', 'carpet', 'bench'], block: ['hospbed', 'window', 'doll'], extra: [{ type: 'radio', count: 2 }], redact: true,
    cast: [P('Jamie Sunderwood', 'human', 'sandor-szeles'), P('Marina', 'human', 'marianna'), P('Angelica Orsino', 'human', 'anna-oroszi'), P('Edwin Dombro', 'human', 'ede-dombi'), P('Laurel', 'human', 'lujza'), P('Marie', 'ghost', 'mara'), P('A Megtévesztő Alak', 'ghoul', 'a-hazug-alak'), P('A Hólyagfejű Ápolónő', 'ghoul', 'a-lampasfeju-apolono')], victim: P('Az Obeliszkfejű Hóhér', 'ghoul', 'a-piramisfeju'),
  }),
  ev(9, 'entity-realm', 'entity-realm', 5, 9, 'Deceased by Daybreak', 'A Jelenlét Birodalma', 'A Hurokmester a saját horgain végezte. Aki generátor mellett áll, zajt csap — a gyilkos pedig sosem hibázik így.', {
    worldRule: 'generators', rooms: ['Pajta', 'Kukoricás', 'Fészer', 'Pince', 'Erdei tisztás', 'Kapu-terület', 'Horgos-pince', 'Ház'], stand: ['medkit', 'pallet', 'crate'], block: ['hook', 'gate', 'tree'], extra: [{ type: 'generator', count: 4 }],
    cast: [P('Dwayne Fairbrook', 'human', 'denes-feher'), P('Maggie Thompson', 'human', 'margo-tamas'), P('Claudine Moreau', 'human', 'klaudia-morvai'), P('Jack Parks', 'human', 'jakab-pal'), P('Nia Karlsen', 'human', 'nelli-karolyi'), P('Fen Mei', 'human', 'hung-mihal'), P('Davis Crown', 'human', 'david-kiraly'), P('Quincy Smythe', 'human', 'kalman-szuts')], victim: P('A Hurokmester', 'ghoul', 'a-csapdas'),
  }),
  ev(10, 'lake-town', 'lake-town', 5, 10, 'Adam Waken', 'Radiant Falls', 'Dr. Emery Hartwell holtan fekszik. A fény és a sötétség mezői közt a Birtokoltak csak sötétben állhatnak.', {
    worldRule: 'light', rooms: ['Fűrésztelep', 'Vendégház', 'Rádióállomás', 'Rendőrség', 'Erdei ösvény', 'Tóparti stég', 'Zsolnai kunyhója', 'Elme-kórház'], stand: ['crate', 'bench', 'carpet'], block: ['typewriter', 'coffeemaker'],
    extra: [{ type: 'lamp', count: 5 }, { type: 'charger', count: 2 }], kinds: [...RICH, 'lit', 'dark'], prefer: { kind: 'dark', count: 3 },
    cast: [P('Adam Waken', 'human', 'attila-vago'), P('Alicia Waken', 'human', 'ilona-vago'), P('Benny Wheelwright', 'human', 'barna-vincze'), P('Sara Breakwell', 'human', 'sara-toro'), P('Rosie Goldflower', 'human', 'rozsa-csikos'), P('Tobias Zayne', 'ghost', 'tamas-zsolnai'), P('Woden Anders', 'human', 'odon-andrasfi'), P('Thunder Anders', 'human', 'tibor-andrasfi'), P('Sylvia Webber', 'human', 'cintia-szovo'), P('Pete Mayne', 'human', 'patrik-meszar')], victim: P('Dr. Emery Hartwell', 'human', 'dr-emil-hofer'),
  }),
  ev(11, 'sunshine-mall', 'sunshine-mall', 3, 7, 'Odder Matters', 'StarPláza', '1985. július 4., StarPláza. Az Átokúr a Titkos labor liftjében hever. Az áramszünet sötétjében csak a zseblámpád fénye marad: az Árnyoldalon csak azt látod, ami a kurzorod körül van.', {
    worldRule: 'nightvision', rooms: ['Fagylaltozó', 'Étterem-udvar', 'Mozi', 'Játékbolt', 'Szökőkút-tér', 'Szolgálati folyosó', 'Titkos labor'], stand: ['bench', 'chair', 'carpet'], block: ['counter', 'popcorn', 'arcade', 'fountain'],
    cast: [P('Tizenkettő', 'human', 'nyolc'), P('Mick Wheelwright', 'human', 'matyas-palfi'), P('Dusty Hendricks', 'human', 'dezso-hunyadi'), P('Luke St. Clair', 'human', 'lorant-sarkany'), P('Willy Baines', 'human', 'vilmos-balint'), P('Maxine Meadows', 'human', 'mariann-majer'), P('Stevie Hargrove', 'human', 'istvan-halasz'), P('Wren Buckwell', 'human', 'rita-berki'), P('Jimmy Hopley', 'human', 'jeno-kertesz'), P('Erin St. Clair', 'human', 'erika-sarosi')], victim: P('Az Átokúr', 'ghoul', 'a-liderc'),
  }),
  ev(12, 'frost-keep', 'frost-keep', 4, 8, 'Contest of Crowns', 'Frosthold Vár', 'Frosthold Vár hideg éjszakáján a Fagykirály holtan esett össze. A Gáton túlra csak páncélos (🛡) merészkedik — a kártyákon ott a jelzés.', {
    worldRule: 'vacuum', rooms: ['Nagyterem', 'Szent liget', 'Fegyvertár', 'Kripta', 'Toronyszoba', 'A Gáton túl', 'Fagyott tó'], stand: ['bench', 'carpet', 'crate'], block: ['throne', 'armor', 'fireplace', 'statue'], vacuum: ['A Gáton túl', 'Fagyott tó'],
    cast: [P('John Dér', 'human', 'jon-hovari'), P('Daenara Drakaryn', 'human', 'dalma-tuzi'), P('Tyrian Goldmere', 'human', 'tamas-rendes'), P('Aria Winterhart', 'human', 'aliz-szurke'), P('Sarina Winterhart', 'human', 'sarolta-hideg'), P('Cerys Goldmere', 'human', 'cecilia-aranyi'), P('Jaimon Goldmere', 'human', 'jeno-aranykez'), P('Bram Winterhart', 'human', 'balint-fagyos'), P('Samwin Tarley', 'human', 'samu-tarlos')], victim: P('A Fagykirály', 'ghoul'),
  }),
  ev(13, 'portal-garage', 'portal-garage', 3, 7, 'Rich and Marty', 'Őrült tudós garázsa', 'Nézzrám úr holtan hever — valaki túl sokat kért tőle. A portálok mindkét oldalra átlátnak: a portál melletti nyomok a szomszéd helyiségre is érvényesek.', {
    worldRule: 'doors', rooms: ['Garázs', 'Nappali', 'Konyha', 'Murci szobája', 'Űrhajó', 'Erőd-város', 'Csőlakás-dimenzió'], stand: ['sofa', 'bench', 'crate'], block: ['fridge', 'tv', 'toolbox', 'machine'],
    extra: [{ type: 'doorGreen', count: 1, boundary: true }, { type: 'doorBlue', count: 1, boundary: true }, { type: 'doorOrange', count: 1, boundary: true }],
    cast: [P('Rich Sandrez', 'human', 'rikard-santa'), P('Marty Miller', 'human', 'murci-szmit'), P('Autumn Miller', 'human', 'zsanett-szmit'), P('Bess Miller', 'human', 'bea-szmit'), P('Gerry Miller', 'human', 'jerzsi-szmit'), P('Tollember', 'human', 'a-madarember'), P('Gyűrci', 'human', 'csippento'), P('Kakipopsi úr', 'human', 'mr-fenekcsomo'), P('Gonosz Marty', 'human', 'gonosz-murci')], victim: P('Nézzrám úr', 'ghost', 'mr-kerek'),
  }),
  ev(14, 'moon-town', 'moon-town', 4, 8, 'The Bloodsucker Journals', 'Arcane Falls', 'Arcane Falls, a szüreti fesztivál éjszakája. Katerina Pearce holtan fekszik a temetőben. A napfény mezőin a vámpírok nem állhatnak — a lámpák fényköre kijelöli az árnyékot.', {
    worldRule: 'light', rooms: ['Holdi Kocsma', 'Sárvári-kúria', 'Gyöngyösi-ház', 'Fűzfa-híd', 'Lukács-kúria', 'Temető', 'Gimnázium', 'Régi templom'], stand: ['bench', 'carpet', 'chair'], block: ['candle', 'tree', 'grave', 'statue'],
    extra: [{ type: 'lamp', count: 5 }, { type: 'charger', count: 2 }], kinds: [...RICH, 'lit', 'dark'], prefer: { kind: 'dark', count: 3 },
    cast: [P('Elina Gilmore', 'human', 'ella-gyongyosi'), P('Stephen Salvatori', 'vampire', 'szabolcs-sarvari'), P('Damian Salvatori', 'vampire', 'daniel-sarvari'), P('Bea Bennetson', 'witch', 'bogi-bertalan'), P('Coraline Forrester', 'vampire', 'karola-fabian'), P('Matty Donnelly', 'human', 'mark-denes'), P('Jerome Gilmore', 'human', 'jeromos-gyongyosi'), P('Aldric Saltwell', 'human', 'alfred-sos'), P('Taylor Lockridge', 'werewolf', 'tamas-lukacs')], victim: P('Katerina Pearce', 'vampire', 'kata-pasztor'),
  }),
  ev(15, 'candy-land', 'candy-land', 2, 6, 'Quest Hour', 'Aah Földje', 'Aah Földjén a Halhatatlan holtteste a sírboltban hever. A térkép nem mutat mindent: néhány szereplőről csak annyi derül ki, milyen messze volt a kardtól vagy BÍPÓtól.', {
    worldRule: 'motion', rooms: ['Fa-erőd', 'Cukorbirodalom', 'Jégbirodalom', 'Lich-sírbolt', 'Tűzbirodalom', 'Sötét erdő'], stand: ['bench', 'crate', 'carpet'], block: ['tree', 'bush', 'rock'],
    extra: [{ type: 'sword', count: 1 }, { type: 'bmo', count: 1 }], kinds: [...RICH, 'distance'], prefer: { kind: 'distance', count: 2 },
    cast: [P('Flynn', 'human', 'fin'), P('Jax', 'human', 'dzsaki'), P('Buborékcukor hercegnő', 'human', 'szaloncukor-hercegno'), P('Marcelina', 'vampire', 'marcella'), P('Hókirály'), P('BÍPÓ', 'human', 'bimbo'), P('Bütyök hercegnő', 'human', 'gocsortos-hercegno')], victim: P('A Halhatatlan', 'ghoul', 'a-lich'),
  }),
  ev(16, 'rain-forest', 'rain-forest', 3, 7, 'Nightfall', 'Crossroads Város', 'Crossroads Város, az örök eső városa. Jamie, a követő vámpír holtan fekszik. A totemek mellett Alyssa látomásai feltárulnak: az ott álló szereplők plusz nyomot kapnak.', {
    worldRule: 'totems', rooms: ['Kollár-ház', 'Esőerdő Gimnázium', 'Erdei tisztás', 'Csendes-part', 'Lenkei-ház', 'Esőerdő kórház', 'Vérkő-torony'], stand: ['bench', 'carpet', 'sofa'], block: ['tree', 'bush', 'rock', 'fireplace'], extra: [{ type: 'totem', count: 3 }], hidden: 2,
    cast: [P('Belle Heron', 'human', 'bella-lenkei'), P('Edmund Callen', 'vampire', 'ede-kollar'), P('Jakob Dark', 'werewolf', 'jakob-fekete'), P('Alyssa Callen', 'vampire', 'aliz-kollar'), P('Carlyle Callen', 'vampire', 'karoly-kollar'), P('Chaz Heron', 'human', 'peter-lenkei'), P('Rosalyn Hales', 'vampire', 'rozalia-hajdu'), P('Casper Hales', 'vampire', 'jonas-hajdu')], victim: P('Jamie', 'vampire', 'gabor-sas'),
  }),
  ev(17, 'walled-town', 'walled-town', 4, 8, 'The Wandering Deceased', 'Avalon Menedék', 'A világvége után Avalon Menedék főtere elcsendesedett: A Helytartó holtan hever. A generátor zaja odacsalja a kóborló fertőzötteket — a gyilkos nem állhat generátor mellett.', {
    worldRule: 'generators', rooms: ['Fogda-blokk', 'Farm', 'Sáncváros főtere', 'Dombtető', 'Fegyvertár', 'Templom', 'Erdei út'], stand: ['bench', 'crate', 'carpet'], block: ['car', 'tent', 'barrel', 'campfire'], extra: [{ type: 'generator', count: 4 }],
    cast: [P('Rich Granger', 'human', 'rudi-gorbe'), P('Mishana', 'human', 'mihaela-szep'), P('Darren Dixley', 'human', 'denes-deak'), P('Carla Pellet', 'human', 'kamilla-pelle'), P('Glen Ryu', 'human', 'gyula-reti'), P('Maisie Greenwood', 'human', 'magdolna-zold'), P('Neylan', 'human', 'nemes-noel'), P('Karl Granger', 'human', 'kornel-gorbe')], victim: P('A Helytartó', 'human', 'a-fonok'),
  }),
  ev(18, 'spore-zone', 'spore-zone', 5, 9, 'The Remaining Few', 'Sporefield Karanténzóna', 'Boston karantén-zónája, húsz évvel a kitörés után. Egy Csattogó holtteste hever. A rádió recseg a spóra-ködben: a nyomok néhány szava kitakarva marad.', {
    worldRule: 'radio', prefer: { kind: 'on', count: 4 }, rooms: ['Karantén-zóna', 'Dunaváros', 'Zsilip-gát', 'Tetőtelep', 'Egyetem', 'Kórház', 'Metró', 'Hegyi kabin'], stand: ['bench', 'crate', 'carpet'], block: ['car', 'tent', 'tree', 'rock'], extra: [{ type: 'radio', count: 2 }], redact: true,
    cast: [P('Jonah Millward', 'human', 'jozsef-muller'), P('Ella Williamson', 'human', 'ella-szucs'), P('Tessa', 'human', 'tesza'), P('Toby Millward', 'human', 'tomi-muller'), P('Marlena', 'human', 'marcsi-makai'), P('Billy', 'human', 'bela'), P('Hank', 'human', 'hektor'), P('Sammy', 'human', 'szabi'), P('Rylee', 'human', 'renata'), P('Addie Anders', 'human', 'abigel-andrasy')], victim: P('A Csattogó', 'ghoul', 'a-kattogo'),
  }),
  ev(19, 'wizard-school', 'wizard-school', 5, 10, 'Henry LightningScar', 'Ravenwick Varázslóiskola', 'Mortivar nagyúr holtan fekszik az Akadémián. A Kalandozók Térképe egyszerre csak egy helyiséget mutat élesen — válts helyiséget, a többi nyom elhalványul.', {
    worldRule: 'cameras', rooms: ['Nagyterem', 'Oroszlán-torony', 'Főzőterem', 'Tiltott Erdő', 'Akadémia kapuja', 'Gyuri kunyhója', 'Kívánság Terme', 'Repülő-pálya'], stand: ['bench', 'carpet', 'broom'], block: ['cauldron', 'armor', 'painting', 'candle'],
    cast: [P('Henry Villámseb', 'human', 'hugo-pakozdi'), P('Hermina Greenwood', 'human', 'hermina-gazdag'), P('Rory Weswick', 'human', 'remi-vasvari'), P('Albin Bumblewick', 'human', 'albert-dombo'), P('Severin Vipera', 'human', 'perec-pitvar'), P('Haldric', 'human', 'gyuri-bozontos'), P('Drake Malgrave', 'human', 'dorian-galambos'), P('Nevin Longbrook', 'human', 'nandor-hosszuszar'), P('Selene Jószív', 'human', 'lujza-szerelmes'), P('Ginnie Weswick', 'human', 'gina-vasvari'), P('Mina McRaven', 'human', 'minerva-kopjas')], victim: P('Mortivar nagyúr', 'ghost', 'a-nevtelen-ur'),
  }),
]

/** Minden Esemény-ügy (19 világ × 5): a `puzzles/event/*.json` ebből készül. */
export const EVENTS: EventDef[] = WORLD_DEFS.flatMap(expandWorld)
