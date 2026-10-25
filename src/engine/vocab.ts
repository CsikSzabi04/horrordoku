import type { Race } from '../shared/puzzle'

/** Tárgyak és helyiségek szótára: magyar nevek, ragozott alakok a nyomszövegekhez, emoji a táblához. */
export interface ObjectVocab {
  hu: string
  art: string // névelővel: "a pad", "az ágy"
  on: string // "padon"
  emoji: string
  blocking: boolean
  abl?: string // pl. a légzsiliptől (a distance nyomhoz)
  sit?: boolean // ült (szék, pad, kanapé…), különben volt
}

const o = (hu: string, art: string, on: string, emoji: string, blocking = false, abl?: string): ObjectVocab => ({ hu, art, on, emoji, blocking, ...(abl ? { abl } : {}) })

export const OBJECTS: Record<string, ObjectVocab> = {
  bench: o('pad', 'a pad', 'padon', '🏞️'),
  coffin: o('koporsó', 'a koporsó', 'koporsón', '⚰️'),
  carpet: o('vörös szőnyeg', 'a vörös szőnyeg', 'vörös szőnyegen', '🟥'),
  bed: o('ágy', 'az ágy', 'ágyon', '🛏️'),
  sofa: o('kanapé', 'a kanapé', 'kanapén', '🛋️'),
  crate: o('láda', 'a láda', 'ládán', '📦'),
  table: o('asztal', 'az asztal', 'asztalon', '🍽️', true),
  plant: o('cserepes növény', 'a cserepes növény', 'cserepes növényen', '🌵', true),
  candle: o('gyertya', 'a gyertya', 'gyertyán', '🕯️', true),
  grave: o('sírkő', 'a sírkő', 'sírkövön', '🕳️', true),
  tree: o('fa', 'a fa', 'fán', '🌳', true),
  bell: o('harang', 'a harang', 'harangon', '🔔', true),
  statue: o('szobor', 'a szobor', 'szobron', '🗿', true),
  fountain: o('kút', 'a kút', 'kúton', '⛲', true),
  cauldron: o('üst', 'az üst', 'üstön', '🍲', true),
  mirror: o('tükör', 'a tükör', 'tükrön', '🔮', true),
  armor: o('páncél', 'a páncél', 'páncélon', '🛡️', true),
  painting: o('festmény', 'a festmény', 'festményen', '🖼️', true),
  barrel: o('hordó', 'a hordó', 'hordón', '🛢️', true),
  pump: o('benzinkút-oszlop', 'a kútoszlop', 'kútoszlopon', '⛽', true),
  stool: o('bárszék', 'a bárszék', 'bárszéken', '🍺'),
  pool: o('biliárdasztal', 'a biliárdasztal', 'biliárdasztalon', '🎱', true),
  cross: o('kereszt', 'a kereszt', 'kereszten', '✝️', true),
  // Hétköznapi helyszínek (Klasszikus)
  chair: o('szék', 'a szék', 'széken', '🪑'),
  rug: o('szőnyeg', 'a szőnyeg', 'szőnyegen', '🟦'),
  flowers: o('virágcserje', 'a virágcserje', 'virágcserjén', '🌸', true),
  shelf: o('polc', 'a polc', 'polcon', '📚', true),
  bonsai: o('bonszaj', 'a bonszaj', 'bonszajon', '🎍', true),
  register: o('pénztárgép', 'a pénztárgép', 'pénztárgépen', '🧾', true),
  fridge: o('hűtő', 'a hűtő', 'hűtőn', '❄️', true),
  stove: o('tűzhely', 'a tűzhely', 'tűzhelyen', '🍳', true),
  tv: o('tévé', 'a tévé', 'tévén', '📺', true),
  bath: o('kád', 'a kád', 'kádon', '🛁', true),
  toilet: o('vécé', 'a vécé', 'vécén', '🚽', true),
  sink: o('mosdókagyló', 'a mosdókagyló', 'mosdókagylón', '🚰', true),
  counter: o('pult', 'a pult', 'pulton', '🍷', true),
  desk: o('iskolapad', 'az iskolapad', 'iskolapadon', '📝'),
  board: o('tábla', 'a tábla', 'táblán', '🖍️', true),
  globe: o('földgömb', 'a földgömb', 'földgömbön', '🌍', true),
  computer: o('számítógép', 'a számítógép', 'számítógépen', '🖥️', true),
  slide: o('csúszda', 'a csúszda', 'csúszdán', '🛷'),
  seesaw: o('libikóka', 'a libikóka', 'libikókán', '⚖️'),
  sandbox: o('homokozó', 'a homokozó', 'homokozón', '🏰'),
  ball: o('labda', 'a labda', 'labdán', '⚽'),
  picnic: o('piknik-kosár', 'a piknik-kosár', 'piknik-kosáron', '🧺', true),
  parasol: o('napernyő', 'a napernyő', 'napernyőn', '⛱️', true),
  lounger: o('nyugágy', 'a nyugágy', 'nyugágyon', '🏖️'),
  palm: o('pálmafa', 'a pálmafa', 'pálmafán', '🌴', true),
  boat: o('csónak', 'a csónak', 'csónakon', '⛵', true),
  lion: o('oroszlán', 'az oroszlán', 'oroszlánon', '🦁', true),
  penguin: o('pingvin', 'a pingvin', 'pingvinen', '🐧', true),
  bear: o('medve', 'a medve', 'medvén', '🐻', true),
  croc: o('krokodil', 'a krokodil', 'krokodilon', '🐊', true),
  elephant: o('elefánt', 'az elefánt', 'elefánton', '🐘', true),
  rock: o('szikla', 'a szikla', 'sziklán', '⛰️', true),
  bush: o('bokor', 'a bokor', 'bokron', '🌿', true),
  carousel: o('körhinta', 'a körhinta', 'körhintán', '🎠', true),
  wheel: o('óriáskerék', 'az óriáskerék', 'óriáskeréken', '🎡', true),
  coaster: o('hullámvasút', 'a hullámvasút', 'hullámvasúton', '🎢', true),
  balloon: o('lufi', 'a lufi', 'lufin', '🎈', true),
  popcorn: o('popcorn-gép', 'a popcorn-gép', 'popcorn-gépen', '🍿', true),
  target: o('céltábla', 'a céltábla', 'céltáblán', '🎯', true),
  ticket: o('jegyautomata', 'a jegyautomata', 'jegyautomatán', '🎟️', true),
  reception: o('recepciós pult', 'a recepciós pult', 'recepciós pulton', '🛎️', true),
  luggage: o('bőrönd', 'a bőrönd', 'bőrönd tetején', '🧳'),
  minibar: o('minibár', 'a minibár', 'minibáron', '🍸', true),
  // További hétköznapi helyszínek (Klasszikus)
  bakeoven: o('kemence', 'a kemence', 'kemencén', '🥖', true),
  microscope: o('mikroszkóp', 'a mikroszkóp', 'mikroszkópon', '🔬', true),
  medcab: o('gyógyszeres szekrény', 'a gyógyszeres szekrény', 'gyógyszeres szekrényen', '💊', true),
  exhibit: o('vitrin', 'a vitrin', 'vitrinen', '🏺', true),
  screen: o('vászon', 'a vászon', 'vásznon', '🎬', true),
  weights: o('súlyzó', 'a súlyzó', 'súlyzón', '🏋️', true),
  treadmill: o('futópad', 'a futópad', 'futópadon', '🏃', true),
  haybale: o('szalmabála', 'a szalmabála', 'szalmabálán', '🌾'),
  tractor: o('traktor', 'a traktor', 'traktoron', '🚜', true),
  cow: o('tehén', 'a tehén', 'tehénen', '🐄', true),
  horse: o('ló', 'a ló', 'lovon', '🐴', true),
  clock: o('óra', 'az óra', 'órán', '🕰️', true),
  train: o('vonat', 'a vonat', 'vonaton', '🚆', true),
  plane: o('repülő', 'a repülő', 'repülőn', '✈️', true),
  tent: o('sátor', 'a sátor', 'sátron', '⛺', true),
  campfire: o('tábortűz', 'a tábortűz', 'tábortűzön', '🔥', true),
  canoe: o('kenu', 'a kenu', 'kenun', '🛶', true),
  printer: o('nyomtató', 'a nyomtató', 'nyomtatón', '🖨️', true),
  officedesk: o('íróasztal', 'az íróasztal', 'íróasztalon', '🗃️', true),
  goal: o('focikapu', 'a focikapu', 'focikapun', '🥅', true),
  fish: o('halasláda', 'a halasláda', 'halasládán', '🐟', true),
  apples: o('almásláda', 'az almásláda', 'almásládán', '🍎', true),
  anchor: o('horgony', 'a horgony', 'horgonyon', '⚓', true),
  hairchair: o('fodrászszék', 'a fodrászszék', 'fodrászszéken', '💈'),
  car: o('autó', 'az autó', 'autón', '🚗', true),
  toolbox: o('szerszámosláda', 'a szerszámosláda', 'szerszámosládán', '🛠️', true),
  mic: o('mikrofon', 'a mikrofon', 'mikrofonon', '🎤', true),
  dogcage: o('ketrec', 'a ketrec', 'ketrecen', '🐕', true),
  machine: o('szerszámgép', 'a szerszámgép', 'szerszámgépen', '🔧', true),
  // Esemény-világok tárgyai
  partytable: o('party-asztal', 'a party-asztal', 'party-asztalon', '🎂'),
  oven: o('pizzasütő', 'a pizzasütő', 'pizzasütőn', '🍕', true),
  giftbox: o('ajándékdoboz', 'az ajándékdoboz', 'ajándékdobozon', '🎁'),
  camera: o('kamera', 'a kamera', 'kamerán', '📹', true),
  doorbtn: o('ajtógomb', 'az ajtógomb', 'ajtógombon', '🔘', true),
  toybox: o('játékdoboz', 'a játékdoboz', 'játékdobozon', '🧸'),
  conveyor: o('futószalag', 'a futószalag', 'futószalagon', '🏭', true),
  blocks: o('kockatorony', 'a kockatorony', 'kockatornyon', '🧱', true),
  speaker: o('hangszóró', 'a hangszóró', 'hangszórón', '🔊', true),
  panel: o('kéz-kapcsoló', 'a kéz-kapcsoló', 'kéz-kapcsolón', '🟢', true),
  typewriter: o('írógép', 'az írógép', 'írógépen', '⌨️', true),
  herb: o('gyógynövény', 'a gyógynövény', 'gyógynövényen', '🍀'),
  itembox: o('tárolódoboz', 'a tárolódoboz', 'tárolódobozon', '🧰'),
  doorSpade: o('pikk ajtó', 'a pikk ajtó', 'pikk ajtón', '♠️', true),
  doorDiamond: o('gyémánt ajtó', 'a gyémánt ajtó', 'gyémánt ajtón', '♦️', true),
  doorCircle: o('kör ajtó', 'a kör ajtó', 'kör ajtón', '⭕', true),
  airlock: o('légzsilip', 'a légzsilip', 'légzsilipen', '🚀', true, 'a légzsiliptől'),
  tracker: o('mozgásérzékelő', 'a mozgásérzékelő', 'mozgásérzékelőn', '📡', true, 'a mozgásérzékelőtől'),
  flamer: o('lángszóró-szekrény', 'a lángszóró-szekrény', 'lángszóró-szekrényen', '🧯', true, 'a lángszóró-szekrénytől'),
  cardreader: o('kártyaolvasó', 'a kártyaolvasó', 'kártyaolvasón', '💳', true, 'a kártyaolvasótól'),
  cryopod: o('hibernálókapszula', 'a hibernálókapszula', 'hibernálókapszulán', '🧊', false, 'a hibernálókapszulától'),
  vent: o('szellőzőrács', 'a szellőzőrács', 'szellőzőrácson', '🕸️', false, 'a szellőzőrácstól'),
  totem: o('totem', 'a totem', 'totemen', '🧿', true),
  fireplace: o('kandalló', 'a kandalló', 'kandallón', '♨️', true),
  trophy: o('szarvas-trófea', 'a szarvas-trófea', 'szarvas-trófeán', '🦌', true),
  gunrack: o('fegyverszekrény', 'a fegyverszekrény', 'fegyverszekrényen', '🗄️', true),
  stasis: o('sztázis-állomás', 'a sztázis-állomás', 'sztázis-állomáson', '🧪'),
  savepoint: o('mentőpont', 'a mentőpont', 'mentőponton', '💾', true),
  terminal: o('kinézis-terminál', 'a kinézis-terminál', 'kinézis-terminálon', '💻', true),
  lockdoor: o('zárolt ajtó', 'a zárolt ajtó', 'zárolt ajtón', '🔒', true),
  batterybox: o('elemdoboz', 'az elemdoboz', 'elemdobozon', '🔋'),
  hospbed: o('kórházi ágy', 'a kórházi ágy', 'kórházi ágyon', '🛌', true),
  wheelchair: o('kerekesszék', 'a kerekesszék', 'kerekesszéken', '♿'),
  locker: o('szekrény', 'a szekrény', 'szekrényen', '🚪', true),
  switch: o('generátorkapcsoló', 'a generátorkapcsoló', 'generátorkapcsolón', '🔌', true),
  radio: o('rádió', 'a rádió', 'rádión', '📻', true),
  window: o('rácsos ablak', 'a rácsos ablak', 'rácsos ablakon', '🔲', true),
  doll: o('varrott baba', 'a varrott baba', 'varrott babán', '🎎', true),
  generator: o('generátor', 'a generátor', 'generátoron', '⚙️', true),
  hook: o('kampó', 'a kampó', 'kampón', '🎣', true),
  medkit: o('medkit-láda', 'a medkit-láda', 'medkit-ládán', '🩹'),
  pallet: o('paletta', 'a paletta', 'palettán', '🚧'),
  gate: o('kapu', 'a kapu', 'kapun', '⛩️', true),
  lamp: o('villanyoszlop', 'a villanyoszlop', 'villanyoszlopon', '💡', true),
  charger: o('elemlámpa-töltő', 'az elemlámpa-töltő', 'elemlámpa-töltőn', '🔦', true),
  coffeemaker: o('kávéfőző', 'a kávéfőző', 'kávéfőzőn', '☕', true),
  // Új Esemény-világok tárgyai
  arcade: o('arcade-gép', 'az arcade-gép', 'arcade-gépen', '🕹️', true),
  throne: o('vastrón', 'a vastrón', 'vastrónon', '👑', true),
  doorGreen: o('zöld portál', 'a zöld portál', 'zöld portálon', '🟩', true),
  doorBlue: o('kék portál', 'a kék portál', 'kék portálon', '🔵', true),
  doorOrange: o('narancs portál', 'a narancs portál', 'narancs portálon', '🟠', true),
  sword: o('kard', 'a kard', 'kardon', '🗡️', true, 'a kardtól'),
  bmo: o('BMO', 'a BMO', 'BMO-n', '🎮', true, 'BMO-tól'),
  broom: o('seprű', 'a seprű', 'seprűn', '🧹'),
}

for (const t of ['bench', 'sofa', 'stool', 'wheelchair', 'chair', 'desk', 'hairchair', 'haybale']) OBJECTS[t]!.sit = true

export const STANDABLE = Object.keys(OBJECTS).filter((k) => !OBJECTS[k]!.blocking)
export const BLOCKING = Object.keys(OBJECTS).filter((k) => OBJECTS[k]!.blocking)
/** A Random mód alap tárgykészlete (a témás pályák saját készletet adnak meg). */
export const DEFAULT_STAND = ['bench', 'coffin', 'carpet', 'bed', 'sofa']
export const DEFAULT_BLOCK = ['candle', 'grave', 'tree', 'bell', 'statue', 'fountain']

export interface CastMember {
  id: string
  name: string
  race: Race
  gender?: 'm' | 'f'
}
const c = (id: string, name: string, race: Race): CastMember => ({ id, name, race })
/** A Random mód és a Klasszikus gyanúsítotti listája (a `content.characters()` ezekből is épül). */
export const CORE_CAST: CastMember[] = [
  c('vlad', 'Vlad Drăgulescu', 'vampire'), c('morrigan', 'Morrigan Ashvale', 'witch'), c('silas', 'Silas Grey', 'ghost'),
  c('lilith', 'Lilith Vane', 'demon'), c('ezekiel', 'Ezekiel Thorne', 'werewolf'),
]
export const EXTRA_CAST: CastMember[] = [
  c('corvin', 'Corvin Hale', 'ghoul'), c('selene', 'Selene Roth', 'witch'), c('damian', 'Damian Frost', 'vampire'), c('isolde', 'Isolde Marsh', 'human'),
  c('nyx', 'Nyx Crane', 'demon'), c('rowan', 'Rowan Wren', 'werewolf'), c('cassian', 'Cassian Dusk', 'human'), c('elara', 'Elara Morrow', 'ghost'),
]
export const CAST: CastMember[] = [...CORE_CAST, ...EXTRA_CAST]

/** Helyiségnév → „-ban/-ben" alak a nyomszövegekhez. */
export const ROOM_IN: Record<string, string> = {
  Kripta: 'a Kriptában', Sekrestye: 'a Sekrestyében', Oltár: 'az Oltárnál', Harangláb: 'a Haranglábban', Temetőkert: 'a Temetőkertben',
  Könyvtár: 'a Könyvtárban', Pince: 'a Pincében', Konyha: 'a Konyhában', Padlás: 'a Padláson', Galéria: 'a Galérián',
  Bolt: 'a Boltban', Üvegház: 'az Üvegházban', Lepárló: 'a Lepárlóban', Lakás: 'a Lakásban', Kert: 'a Kertben',
  Bemutatóterem: 'a Bemutatóteremben', Raktár: 'a Raktárban', Iroda: 'az Irodában', Kirakat: 'a Kirakatban',
  Előcsarnok: 'az Előcsarnokban', Ebédlő: 'az Ebédlőben', Lépcsőház: 'a Lépcsőházban', Cselédszoba: 'a Cselédszobában', Télikert: 'a Télikertben',
  Nappali: 'a Nappaliban', Trófeaterem: 'a Trófeateremben', Kamra: 'a Kamrában', Veranda: 'a Verandán', Tisztás: 'a Tisztáson', Patak: 'a Pataknál', Fenyves: 'a Fenyvesben',
  Boncterem: 'a Boncteremben', Hűtőkamra: 'a Hűtőkamrában', Várószoba: 'a Várószobában', Rakodó: 'a Rakodón', Krematórium: 'a Krematóriumban',
  Benzinkút: 'a Benzinkúton', Motel: 'a Motelben', Kukoricás: 'a Kukoricásban', Kápolnaromok: 'a Kápolnaromoknál', Keresztút: 'a Keresztútnál',
  Porond: 'a Porondon', Tükörlabirintus: 'a Tükörlabirintusban', Öltözők: 'az Öltözőkben', Állatketrecek: 'az Állatketreceknél', Jóslósátor: 'a Jóslósátorban', Körhinta: 'a Körhintánál',
  Olvasóterem: 'az Olvasóteremben', 'Tiltott szekció': 'a Tiltott szekcióban', Térképterem: 'a Térképteremben', Óratorony: 'az Óratoronyban',
  Söntés: 'a Söntésnél', Bokszok: 'a Bokszokban', Mosdó: 'a Mosdóban', 'Hátsó sikátor': 'a Hátsó sikátorban',
  // Hétköznapi helyszínek (Klasszikus)
  Eladótér: 'az Eladótérben', Előkészítés: 'az Előkészítésben', Pénztár: 'a Pénztárnál',
  Homokozó: 'a Homokozóban', Csúszda: 'a Csúszdánál', Hinták: 'a Hintáknál', Piknikhely: 'a Piknikhelyen', Focipálya: 'a Focipályán',
  Hálószoba: 'a Hálószobában', Előszoba: 'az Előszobában', Erkély: 'az Erkélyen',
  Étkező: 'az Étkezőben', Pult: 'a Pultnál', Terasz: 'a Teraszon',
  Tanterem: 'a Tanteremben', Folyosó: 'a Folyosón', Tornaterem: 'a Tornateremben', Menza: 'a Menzán', Udvar: 'az Udvaron',
  Gyerekszoba: 'a Gyerekszobában', Kávézó: 'a Kávézóban', Információ: 'az Információnál',
  'Homokos part': 'a Homokos parton', Medence: 'a Medencében', Büfé: 'a Büfében', Öltöző: 'az Öltözőben', Móló: 'a Mólón', Pálmaliget: 'a Pálmaligetben',
  'Oroszlán élőhely': 'az Oroszlán élőhelyen', 'Pingvin élőhely': 'a Pingvin élőhelyen', 'Medve élőhely': 'a Medve élőhelyen', 'Krokodil élőhely': 'a Krokodil élőhelyen',
  'Elefánt élőhely': 'az Elefánt élőhelyen', Főterület: 'a Főterületen', Bejárat: 'a Bejáratnál',
  Szellemvasút: 'a Szellemvasútnál', Hullámvasút: 'a Hullámvasútnál', Céllövölde: 'a Céllövöldében', Főtér: 'a Főtéren', Jegypénztár: 'a Jegypénztárnál', Játékterem: 'a Játékteremben',
  Recepció: 'a Recepción', Étterem: 'az Étteremben', Szoba: 'a Szobában', Wellness: 'a Wellnessben', Bár: 'a Bárban',
  // további hétköznapi helyszínek
  Sütöde: 'a Sütödében', Váróterem: 'a Váróteremben', Rendelő: 'a Rendelőben', Műtő: 'a Műtőben', Labor: 'a Laborban',
  Kiállítóterem: 'a Kiállítóteremben', Ajándékbolt: 'az Ajándékboltban', Nézőtér: 'a Nézőtéren', Vetítő: 'a Vetítőben',
  Edzőterem: 'az Edzőteremben', Uszoda: 'az Uszodában', Istálló: 'az Istállóban', Szántó: 'a Szántón', Gazdaház: 'a Gazdaházban',
  Peron: 'a Peronon', Terminál: 'a Terminálban', Poggyászkezelő: 'a Poggyászkezelőben', Beszállókapu: 'a Beszállókapunál',
  Sátortábor: 'a Sátortáborban', Tó: 'a Tónál', Tűzrakóhely: 'a Tűzrakóhelyen', Erdő: 'az Erdőben', Fürdőház: 'a Fürdőházban',
  'Nyitott iroda': 'a Nyitott irodában', Tárgyaló: 'a Tárgyalóban', 'Főnöki iroda': 'a Főnöki irodában',
  Pálya: 'a Pályán', Lelátó: 'a Lelátón', Zöldséges: 'a Zöldségesnél', Halas: 'a Halasnál', Pékes: 'a Pékesnél', Virágos: 'a Virágosnál',
  Nagysátor: 'a Nagysátorban', Fedélzet: 'a Fedélzeten', Kabin: 'a Kabinban', Várakozó: 'a Várakozóban', Fodrászat: 'a Fodrászatban', Kozmetika: 'a Kozmetikában',
  Műhely: 'a Műhelyben', Stúdió: 'a Stúdióban', Maszk: 'a Maszkban', Vágószoba: 'a Vágószobában', Előtér: 'az Előtérben', Kennel: 'a Kennelben',
  'Titkos átjáró': 'a Titkos átjáróban', Kerengő: 'a Kerengőben', Kút: 'a Kútnál',
  // Esemény-világok helyiségei
  Színpad: 'a Színpadon', 'Pirate Cove': 'a Pirate Cove-ban', 'Nyugati folyosó': 'a Nyugati folyosón',
  Gyártósor: 'a Gyártósoron', Játékbolt: 'a Játékboltban', Játszószoba: 'a Játszószobában', Szellőzőrendszer: 'a Szellőzőrendszerben',
  Főcsarnok: 'a Főcsarnokban', 'Nyugati iroda': 'a Nyugati irodában', Sötétkamra: 'a Sötétkamrában', Mentőszoba: 'a Mentőszobában', 'Kapitányi iroda': 'a Kapitányi irodában', Lőtér: 'a Lőtéren',
  Híd: 'a Hídon', 'Orvosi szárny': 'az Orvosi szárnyban', Hangár: 'a Hangárban', Gépház: 'a Gépházban', Légzsilip: 'a Légzsilipnél',
  Fürdő: 'a Fürdőben', Hálók: 'a Hálókban', Felvonó: 'a Felvonóban',
  Gyárterem: 'a Gyárteremben', Hidroponika: 'a Hidroponikában', 'Külső szekció': 'a Külső szekcióban',
  Fogadócsarnok: 'a Fogadócsarnokban', 'Kórterem-szárny': 'a Kórterem-szárnyban', Pincebörtön: 'a Pincebörtönben', Kápolna: 'a Kápolnában', Csatorna: 'a Csatornában', Őrszoba: 'az Őrszobában', 'Villamos-terem': 'a Villamos-teremben',
  Kórterem: 'a Kórteremben', Apartman: 'az Apartmanban', Bowlingpálya: 'a Bowlingpályán', 'Tóparti szálló': 'a Tóparti szállóban', 'Másik világ': 'a Másik világban',
  Pajta: 'a Pajtában', Fészer: 'a Fészerben', 'Erdei tisztás': 'az Erdei tisztáson', 'Kapu-terület': 'a Kapu-területen', 'Kampó-pince': 'a Kampó-pincében', Ház: 'a Házban',
  Malomkerék: 'a Malomkeréknél', Őrlőterem: 'az Őrlőteremben', Gabonapadlás: 'a Gabonapadláson', Molnárház: 'a Molnárházban', Stég: 'a Stégen', Mocsár: 'a Mocsárban', Fűzfás: 'a Fűzfásban',
  Fűrésztelep: 'a Fűrésztelepen', Vendégház: 'a Vendégházban', Rádióállomás: 'a Rádióállomáson', Rendőrség: 'a Rendőrségen', 'Erdei ösvény': 'az Erdei ösvényen',
  'Tóparti stég': 'a Tóparti stégen', 'Zane kunyhója': 'Zane kunyhójában', 'Elme-kórház': 'az Elme-kórházban',
  // Új Esemény-világok helyiségei
  'Scoops Ahoy': 'a Scoops Ahoyban',
  'Food court': 'a Food courtban',
  'Mozi': 'a Moziban',
  'Szökőkút-tér': 'a Szökőkút-téren',
  'Szolgálati folyosó': 'a Szolgálati folyosón',
  'Titkos labor': 'a Titkos laborban',
  'Nagyterem': 'a Nagyteremben',
  'Isteni liget': 'az Isteni ligetben',
  'Fegyvertár': 'a Fegyvertárban',
  'Toronyszoba': 'a Toronyszobában',
  'A Falon túl': 'a Falon túl',
  'Fagyott tó': 'a Fagyott tavon',
  'Garázs': 'a Garázsban',
  'Morty szobája': 'Morty szobájában',
  'Űrhajó': 'az Űrhajón',
  'Citadella': 'a Citadellában',
  'Csőlakás-dimenzió': 'a Csőlakás-dimenzióban',
  'Mystic Grill': 'a Mystic Grillben',
  'Salvatore-kúria': 'a Salvatore-kúriában',
  'Gilbert-ház': 'a Gilbert-házban',
  'Wickery-híd': 'a Wickery-hídon',
  'Lockwood-kúria': 'a Lockwood-kúriában',
  'Temető': 'a Temetőben',
  'Gimnázium': 'a Gimnáziumban',
  'Régi templom': 'a Régi templomban',
  'Fa-erőd': 'a Fa-erődben',
  'Cukorka Királyság': 'a Cukorka Királyságban',
  'Jég Királyság': 'a Jég Királyságban',
  'Lich-sírbolt': 'a Lich-sírboltban',
  'Tűz Királyság': 'a Tűz Királyságban',
  'Sötét erdő': 'a Sötét erdőben',
  'Cullen-ház': 'a Cullen-házban',
  'Forks Gimnázium': 'a Forks Gimnáziumban',
  'La Push part': 'a La Push-parton',
  'Swan-ház': 'a Swan-házban',
  'Forks kórház': 'a Forks kórházban',
  'Volturi-torony': 'a Volturi-toronyban',
  'Börtön-cellablokk': 'a Börtön-cellablokkban',
  'Farm': 'a Farmon',
  'Alexandria főtér': 'az Alexandria főtéren',
  'Hilltop': 'a Hilltopon',
  'Templom': 'a Templomban',
  'Erdei út': 'az Erdei úton',
  'Karantén-zóna': 'a Karantén-zónában',
  'Pittsburgh': 'Pittsburghben',
  'Tommy gátja': 'Tommy gátjánál',
  'Jackson': 'Jacksonban',
  'Egyetem': 'az Egyetemen',
  'Kórház': 'a Kórházban',
  'Metró': 'a Metróban',
  'Hegyi kabin': 'a Hegyi kabinban',
  'Griffendél-torony': 'a Griffendél-toronyban',
  'Bájitaltan terem': 'a Bájitaltan teremben',
  'Tiltott Rengeteg': 'a Tiltott Rengetegben',
  'Roxfort kapuja': 'a Roxfort kapujánál',
  'Hagrid kunyhója': 'Hagrid kunyhójában',
  'Szükség Szobája': 'a Szükség Szobájában',
  'Kviddics-pálya': 'a Kviddics-pályán',
}

export interface RoomVocab {
  name: string
  in: string
}
/** A Random mód helyiség-készlete. */
export const ROOM_POOL: RoomVocab[] = ['Kripta', 'Sekrestye', 'Oltár', 'Harangláb', 'Temetőkert', 'Könyvtár', 'Pince', 'Konyha', 'Padlás', 'Galéria'].map((name) => ({ name, in: ROOM_IN[name]! }))

export const roomIn = (name: string): string => ROOM_IN[name] ?? `a(z) ${name} helyiségben`

/** A térkép padló-stílusa helyiségnév szerint (a UI `fl-<stílus>` osztályt ad; ismeretlen névre ciklikus kiosztás). */
export const ROOM_STYLE: Record<string, string> = {
  Eladótér: 'checker', Előkészítés: 'brick', Pénztár: 'brick2',
  Homokozó: 'sand', Csúszda: 'dirt', Hinták: 'grass', Piknikhely: 'checker', Focipálya: 'grass',
  Hálószoba: 'wood', Konyha: 'tile', Nappali: 'carpet', Fürdő: 'tile2', Előszoba: 'brick', Erkély: 'stone',
  Étkező: 'wood', Pult: 'checker', Raktár: 'stone', Terasz: 'stone', Mosdó: 'tile2',
  Tanterem: 'wood', Folyosó: 'tile', Tornaterem: 'checker', Menza: 'tile2', Udvar: 'grass', Könyvtár: 'carpet',
  Olvasóterem: 'carpet', Gyerekszoba: 'checker', Kávézó: 'wood', Információ: 'tile',
  'Homokos part': 'sand', Medence: 'water', Büfé: 'wood', Öltöző: 'tile2', Móló: 'wood', Pálmaliget: 'grass',
  'Oroszlán élőhely': 'sand', 'Pingvin élőhely': 'ice', 'Medve élőhely': 'stone', 'Krokodil élőhely': 'swamp', 'Elefánt élőhely': 'grass', Főterület: 'dirt', Bejárat: 'wood',
  Körhinta: 'carpet', Szellemvasút: 'stone', Hullámvasút: 'dirt', Céllövölde: 'wood', Főtér: 'checker', Jegypénztár: 'brick', Játékterem: 'carpet',
  Recepció: 'carpet', Étterem: 'wood', Szoba: 'carpet', Wellness: 'water', Bár: 'checker', Kert: 'grass', Lépcsőház: 'stone',
  Sütöde: 'brick', Váróterem: 'tile', Rendelő: 'tile2', Műtő: 'tile2', Labor: 'tile', Kiállítóterem: 'carpet', Ajándékbolt: 'wood', Nézőtér: 'carpet', Vetítő: 'stone',
  Edzőterem: 'tile', Uszoda: 'water', Istálló: 'dirt', Szántó: 'dirt', Gazdaház: 'wood', Peron: 'stone', Terminál: 'tile', Poggyászkezelő: 'stone', Beszállókapu: 'carpet',
  Sátortábor: 'grass', Tó: 'water', Tűzrakóhely: 'dirt', Erdő: 'grass', Fürdőház: 'tile2', 'Nyitott iroda': 'carpet', Tárgyaló: 'wood', 'Főnöki iroda': 'wood',
  Pálya: 'grass', Lelátó: 'stone', Zöldséges: 'dirt', Halas: 'tile2', Pékes: 'brick', Virágos: 'grass', Nagysátor: 'sand', Fedélzet: 'wood', Kabin: 'carpet', Várakozó: 'carpet',
  Fodrászat: 'checker', Kozmetika: 'tile2', Műhely: 'stone', Stúdió: 'carpet', Maszk: 'checker', Vágószoba: 'tile', Előtér: 'wood', Kennel: 'dirt',
  Üvegház: 'tile2', Ebédlő: 'wood', Padlás: 'dirt',
  Söntés: 'wood', Bokszok: 'carpet', 'Hátsó sikátor': 'stone', Malomkerék: 'water', Őrlőterem: 'wood', Gabonapadlás: 'dirt', Molnárház: 'brick', Stég: 'wood', Mocsár: 'swamp', Fűzfás: 'grass',
}

/** Tárgy-kategóriák a „Egy állat mellett volt" / „Nem volt állat mellett" nyomokhoz. */
export const CATEGORIES: Record<string, { hu: string; types: string[] }> = {
  animal: { hu: 'állat', types: ['lion', 'penguin', 'bear', 'croc', 'elephant', 'cow', 'horse'] },
  plant: { hu: 'növény', types: ['tree', 'bush', 'flowers', 'plant', 'bonsai', 'palm', 'herb'] },
  seat: { hu: 'ülőhely', types: ['chair', 'bench', 'sofa', 'stool', 'hairchair', 'wheelchair', 'haybale', 'desk'] },
  vehicle: { hu: 'jármű', types: ['car', 'boat', 'canoe', 'tractor', 'train', 'plane'] },
  furniture: { hu: 'bútor', types: ['table', 'shelf', 'bed', 'counter', 'officedesk', 'locker', 'reception'] },
}

/** Padló-osztályok (a térkép mintájáról ismerhetők fel): a nyomszöveg ragozott alakja és a jelmagyarázat neve. */
export const TERRAIN: Record<string, { in: string; name: string }> = {
  water: { in: 'vízben', name: 'víz' },
  swamp: { in: 'mocsárban', name: 'mocsár' },
  grass: { in: 'fűben', name: 'fű' },
  sand: { in: 'homokon', name: 'homok' },
  ice: { in: 'jégen', name: 'jég' },
  stone: { in: 'köves talajon', name: 'kő' },
  dirt: { in: 'földúton', name: 'föld' },
  wood: { in: 'fapadlón', name: 'fapadló' },
  carpet: { in: 'szőnyegpadlón', name: 'szőnyegpadló' },
  checker: { in: 'kockás padlón', name: 'kockás padló' },
  brick: { in: 'téglapadlón', name: 'téglapadló' },
  tile: { in: 'csempén', name: 'csempe' },
}
const TERRAIN_CLASS: Record<string, string> = { tile2: 'tile', brick2: 'brick' }
/** A helyiség padló-osztálya a nevéből (a `ROOM_STYLE`-ból); ismeretlen névre `undefined`. */
export const terrainOf = (roomName: string): string | undefined => {
  const st = ROOM_STYLE[roomName]
  return st ? (TERRAIN_CLASS[st] ?? st) : undefined
}
