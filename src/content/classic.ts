import type { GenOpts } from '../engine/generator'
import { LEVELS, PER_LEVEL } from '../game/levels'
import type { Difficulty } from '../shared/puzzle'

/**
 * A Klasszikus mód pályái — sima Murdoku, hétköznapi helyszínekkel és nevekkel (mint a murdoku.com).
 * 5 szint × 20 pálya = 100 pálya + 2 bónusz. A pályákat az `author.test.ts` generálja ebből (rögzített seedekkel)
 * a `puzzles/classic|bonus/*.json`-ba; minden pálya pontosan 1 megoldású (a `validate:puzzles` ellenőrzi).
 *
 * A 30 helyszín (téma) körbe-körbe fut a 100 pálya között; ugyanaz a helyszín más méretben, más szobákkal, más
 * nyomokkal és más történettel tér vissza. `objRooms`: melyik tárgy melyik helyiségbe való (tűzhely → Konyha).
 */
export interface ClassicDef {
  file: string
  dir: 'classic' | 'bonus'
  /** Szint (1–5) és sorszám (1–20); a bónusznál nincs. */
  level?: number
  no?: number
  seed: string
  d: Difficulty
  opts: GenOpts
}

interface Theme {
  slug: string
  title: string
  icon: string
  place: string // „a virágboltban"
  who: string // „az egyik alkalmazott"
  rooms: string[]
  stand: string[]
  block: string[]
  objRooms: Record<string, string[]>
}

const T = (slug: string, title: string, icon: string, place: string, who: string, rooms: string[], stand: string[], block: string[], objRooms: Record<string, string[]>): Theme => ({ slug, title, icon, place, who, rooms, stand, block, objRooms })

export const THEMES: Theme[] = [
  T('flower-store', 'A virágbolt', '🌸', 'a virágboltban', 'az egyik alkalmazott', ['Eladótér', 'Előkészítés', 'Pénztár', 'Raktár', 'Üvegház'], ['chair', 'rug', 'bench'], ['flowers', 'shelf', 'bonsai', 'register', 'plant'],
    { register: ['Pénztár'], chair: ['Pénztár', 'Eladótér'], rug: ['Eladótér', 'Üvegház'], bench: ['Eladótér', 'Üvegház'], shelf: ['Előkészítés', 'Eladótér', 'Raktár'], flowers: ['Eladótér', 'Előkészítés', 'Üvegház'], bonsai: ['Pénztár', 'Eladótér'], plant: ['Üvegház', 'Eladótér'] }),
  T('playground', 'A játszótér', '🎠', 'a játszótéren', 'egy felnőtt', ['Homokozó', 'Csúszda', 'Hinták', 'Piknikhely', 'Focipálya'], ['slide', 'seesaw', 'bench', 'ball'], ['tree', 'fountain', 'picnic'],
    { slide: ['Csúszda'], seesaw: ['Hinták'], bench: ['Piknikhely', 'Hinták'], ball: ['Focipálya', 'Homokozó'], tree: ['Piknikhely', 'Focipálya', 'Hinták'], fountain: ['Csúszda', 'Piknikhely'], picnic: ['Piknikhely'] }),
  T('apartment', 'A lakás', '🏠', 'a lakásban', 'a lakástulajdonos', ['Hálószoba', 'Konyha', 'Nappali', 'Fürdő', 'Előszoba', 'Erkély'], ['bed', 'sofa', 'chair', 'rug'], ['plant', 'tv', 'fridge', 'stove', 'bath', 'sink'],
    { bed: ['Hálószoba'], sofa: ['Nappali'], chair: ['Konyha', 'Nappali'], rug: ['Hálószoba', 'Nappali', 'Előszoba'], plant: ['Nappali', 'Erkély', 'Előszoba'], tv: ['Nappali'], fridge: ['Konyha'], stove: ['Konyha'], bath: ['Fürdő'], sink: ['Fürdő', 'Konyha'] }),
  T('restaurant', 'Az étterem', '🍽️', 'az étteremben', 'a főszakács', ['Étkező', 'Konyha', 'Pult', 'Raktár', 'Terasz'], ['chair', 'rug', 'stool'], ['table', 'stove', 'fridge', 'counter', 'barrel', 'plant'],
    { chair: ['Étkező', 'Terasz'], rug: ['Étkező'], stool: ['Pult'], table: ['Étkező', 'Terasz'], stove: ['Konyha'], fridge: ['Konyha', 'Raktár'], counter: ['Pult'], barrel: ['Raktár'], plant: ['Étkező', 'Terasz'] }),
  T('school', 'Az iskola', '🏫', 'az iskolában', 'az igazgató', ['Tanterem', 'Folyosó', 'Tornaterem', 'Menza', 'Udvar', 'Könyvtár'], ['desk', 'chair', 'bench', 'ball'], ['board', 'locker', 'shelf', 'tree', 'globe', 'table'],
    { desk: ['Tanterem'], board: ['Tanterem'], chair: ['Menza', 'Könyvtár', 'Tanterem'], bench: ['Folyosó', 'Udvar'], ball: ['Tornaterem', 'Udvar'], locker: ['Folyosó'], shelf: ['Könyvtár'], tree: ['Udvar'], globe: ['Könyvtár', 'Tanterem'], table: ['Menza', 'Könyvtár'] }),
  T('library', 'A könyvtár', '📚', 'a könyvtárban', 'a könyvtáros', ['Olvasóterem', 'Raktár', 'Gyerekszoba', 'Kávézó', 'Információ'], ['chair', 'sofa', 'rug', 'stool'], ['shelf', 'table', 'plant', 'computer', 'globe', 'counter'],
    { shelf: ['Olvasóterem', 'Raktár', 'Gyerekszoba'], sofa: ['Gyerekszoba', 'Olvasóterem'], rug: ['Gyerekszoba'], chair: ['Olvasóterem', 'Kávézó', 'Gyerekszoba'], stool: ['Kávézó'], counter: ['Kávézó', 'Információ'], computer: ['Információ'], table: ['Olvasóterem', 'Kávézó'], plant: ['Kávézó', 'Információ'], globe: ['Olvasóterem'] }),
  T('beach', 'A strand', '🏖️', 'a strandon', 'a mentőőr', ['Homokos part', 'Medence', 'Büfé', 'Öltöző', 'Móló', 'Pálmaliget'], ['lounger', 'bench', 'chair', 'ball'], ['parasol', 'palm', 'boat', 'counter', 'tree'],
    { lounger: ['Homokos part', 'Pálmaliget'], bench: ['Móló', 'Büfé', 'Pálmaliget'], chair: ['Büfé'], ball: ['Homokos part', 'Medence'], parasol: ['Homokos part'], palm: ['Pálmaliget', 'Homokos part'], boat: ['Medence', 'Móló'], counter: ['Büfé'], tree: ['Pálmaliget'] }),
  T('zoo', 'Az állatkert', '🦁', 'az állatkertben', 'az egyik gondozó', ['Oroszlán élőhely', 'Pingvin élőhely', 'Medve élőhely', 'Krokodil élőhely', 'Elefánt élőhely', 'Főterület', 'Büfé', 'Bejárat'], ['bench', 'chair'], ['lion', 'penguin', 'bear', 'croc', 'elephant', 'rock', 'bush', 'tree', 'counter'],
    { bench: ['Főterület', 'Büfé', 'Bejárat'], chair: ['Büfé'], lion: ['Oroszlán élőhely'], penguin: ['Pingvin élőhely'], bear: ['Medve élőhely'], croc: ['Krokodil élőhely'], elephant: ['Elefánt élőhely'], rock: ['Medve élőhely', 'Krokodil élőhely', 'Pingvin élőhely'], bush: ['Oroszlán élőhely', 'Elefánt élőhely', 'Főterület'], tree: ['Medve élőhely', 'Elefánt élőhely', 'Főterület'], counter: ['Büfé'] }),
  T('amusement-park', 'A vidámpark', '🎡', 'a vidámparkban', 'az üzemeltető', ['Körhinta', 'Szellemvasút', 'Hullámvasút', 'Céllövölde', 'Főtér', 'Büfé', 'Jegypénztár', 'Játékterem'], ['bench', 'chair', 'rug'], ['carousel', 'coaster', 'wheel', 'balloon', 'popcorn', 'target', 'ticket', 'statue'],
    { bench: ['Főtér', 'Büfé', 'Körhinta', 'Céllövölde', 'Hullámvasút', 'Jegypénztár'], chair: ['Büfé', 'Jegypénztár', 'Játékterem', 'Céllövölde', 'Szellemvasút'], rug: ['Játékterem', 'Szellemvasút', 'Körhinta', 'Hullámvasút'], carousel: ['Körhinta'], coaster: ['Hullámvasút'], wheel: ['Főtér'], balloon: ['Főtér', 'Céllövölde'], popcorn: ['Büfé', 'Főtér'], target: ['Céllövölde'], ticket: ['Jegypénztár'], statue: ['Szellemvasút', 'Főtér'] }),
  T('hotel', 'A hotel', '🏨', 'a hotelben', 'az igazgató', ['Recepció', 'Étterem', 'Konyha', 'Szoba', 'Fürdő', 'Wellness', 'Kert', 'Bár'], ['bed', 'sofa', 'chair', 'rug', 'stool'], ['reception', 'table', 'stove', 'fridge', 'bath', 'toilet', 'plant', 'tree', 'minibar'],
    { bed: ['Szoba'], sofa: ['Recepció', 'Szoba'], chair: ['Étterem', 'Bár'], rug: ['Szoba', 'Recepció'], stool: ['Bár'], reception: ['Recepció'], table: ['Étterem'], stove: ['Konyha'], fridge: ['Konyha'], bath: ['Fürdő'], toilet: ['Fürdő'], plant: ['Recepció', 'Kert', 'Étterem', 'Wellness'], tree: ['Kert'], minibar: ['Bár', 'Szoba'] }),
  T('bakery', 'A pékség', '🥖', 'a pékségben', 'a pék', ['Eladótér', 'Sütöde', 'Raktár', 'Iroda', 'Udvar'], ['chair', 'bench', 'rug'], ['bakeoven', 'counter', 'shelf', 'barrel', 'table', 'plant', 'register'],
    { bakeoven: ['Sütöde'], counter: ['Eladótér'], register: ['Eladótér'], shelf: ['Eladótér', 'Raktár'], barrel: ['Raktár', 'Udvar'], table: ['Sütöde'], plant: ['Eladótér', 'Iroda'], chair: ['Eladótér', 'Iroda'], bench: ['Udvar', 'Eladótér'], rug: ['Eladótér', 'Iroda'] }),
  T('hospital', 'A kórház', '🏥', 'a kórházban', 'az ügyeletes orvos', ['Váróterem', 'Rendelő', 'Műtő', 'Labor', 'Folyosó', 'Kávézó'], ['wheelchair', 'chair', 'bench'], ['hospbed', 'sink', 'computer', 'medcab', 'microscope', 'plant', 'counter'],
    { wheelchair: ['Folyosó', 'Váróterem'], chair: ['Váróterem', 'Kávézó'], bench: ['Folyosó', 'Váróterem'], hospbed: ['Rendelő', 'Műtő'], sink: ['Műtő', 'Labor', 'Rendelő'], computer: ['Rendelő', 'Labor'], medcab: ['Rendelő', 'Műtő'], microscope: ['Labor'], plant: ['Váróterem', 'Kávézó'], counter: ['Kávézó'] }),
  T('museum', 'A múzeum', '🏛️', 'a múzeumban', 'a teremőr', ['Kiállítóterem', 'Ajándékbolt', 'Raktár', 'Iroda', 'Előcsarnok', 'Udvar'], ['bench', 'rug', 'chair'], ['statue', 'painting', 'armor', 'exhibit', 'counter', 'plant', 'shelf'],
    { bench: ['Kiállítóterem', 'Előcsarnok'], rug: ['Kiállítóterem', 'Előcsarnok'], chair: ['Iroda', 'Előcsarnok'], statue: ['Kiállítóterem', 'Udvar'], painting: ['Kiállítóterem', 'Előcsarnok'], armor: ['Kiállítóterem'], exhibit: ['Kiállítóterem'], counter: ['Ajándékbolt'], plant: ['Előcsarnok', 'Ajándékbolt'], shelf: ['Ajándékbolt', 'Raktár'] }),
  T('cinema', 'A mozi', '🎬', 'a moziban', 'a jegyszedő', ['Előcsarnok', 'Nézőtér', 'Büfé', 'Vetítő', 'Pénztár', 'Raktár'], ['chair', 'rug', 'sofa'], ['popcorn', 'screen', 'ticket', 'counter', 'plant', 'shelf', 'tv'],
    { chair: ['Nézőtér', 'Előcsarnok'], rug: ['Nézőtér', 'Előcsarnok'], sofa: ['Előcsarnok'], popcorn: ['Büfé'], screen: ['Nézőtér'], ticket: ['Pénztár', 'Előcsarnok'], counter: ['Büfé', 'Pénztár'], plant: ['Előcsarnok'], shelf: ['Raktár', 'Vetítő'], tv: ['Előcsarnok', 'Vetítő'] }),
  T('gym', 'Az edzőterem', '🏋️', 'az edzőteremben', 'az edző', ['Edzőterem', 'Öltöző', 'Uszoda', 'Büfé', 'Recepció'], ['bench', 'ball', 'chair'], ['weights', 'treadmill', 'locker', 'sink', 'counter', 'plant', 'reception'],
    { bench: ['Edzőterem', 'Öltöző'], ball: ['Edzőterem', 'Uszoda'], chair: ['Büfé', 'Recepció'], weights: ['Edzőterem'], treadmill: ['Edzőterem'], locker: ['Öltöző'], sink: ['Öltöző'], counter: ['Büfé'], plant: ['Recepció', 'Büfé'], reception: ['Recepció'] }),
  T('farm', 'A farm', '🚜', 'a farmon', 'a gazda', ['Istálló', 'Szántó', 'Gazdaház', 'Pajta', 'Kert', 'Udvar'], ['haybale', 'bench', 'chair'], ['tractor', 'cow', 'horse', 'barrel', 'tree', 'bush'],
    { haybale: ['Pajta', 'Istálló', 'Szántó'], bench: ['Gazdaház', 'Kert'], chair: ['Gazdaház', 'Udvar'], tractor: ['Szántó', 'Udvar'], cow: ['Istálló'], horse: ['Istálló', 'Udvar'], barrel: ['Pajta', 'Udvar'], tree: ['Kert', 'Udvar'], bush: ['Kert', 'Szántó'] }),
  T('station', 'A vasútállomás', '🚆', 'a vasútállomáson', 'a forgalmista', ['Váróterem', 'Peron', 'Jegypénztár', 'Büfé', 'Raktár'], ['bench', 'chair', 'luggage'], ['train', 'clock', 'ticket', 'counter', 'barrel', 'plant'],
    { bench: ['Váróterem', 'Peron'], chair: ['Váróterem', 'Büfé'], luggage: ['Peron', 'Váróterem'], train: ['Peron'], clock: ['Váróterem', 'Peron'], ticket: ['Jegypénztár'], counter: ['Büfé', 'Jegypénztár'], barrel: ['Raktár'], plant: ['Váróterem'] }),
  T('airport', 'A reptér', '✈️', 'a repülőtéren', 'az egyik utas', ['Terminál', 'Poggyászkezelő', 'Beszállókapu', 'Büfé', 'Iroda'], ['chair', 'luggage', 'bench'], ['plane', 'counter', 'conveyor', 'ticket', 'clock', 'plant', 'computer'],
    { chair: ['Beszállókapu', 'Büfé'], luggage: ['Terminál', 'Poggyászkezelő'], bench: ['Terminál', 'Beszállókapu'], plane: ['Beszállókapu'], counter: ['Büfé', 'Terminál'], conveyor: ['Poggyászkezelő'], ticket: ['Terminál'], clock: ['Terminál'], plant: ['Terminál', 'Büfé'], computer: ['Iroda', 'Terminál'] }),
  T('camping', 'A kemping', '⛺', 'a kempingben', 'az egyik túrázó', ['Sátortábor', 'Tó', 'Tűzrakóhely', 'Erdő', 'Fürdőház'], ['bench', 'chair', 'lounger'], ['tent', 'campfire', 'canoe', 'tree', 'rock', 'bush', 'sink'],
    { bench: ['Tűzrakóhely', 'Sátortábor'], chair: ['Tűzrakóhely', 'Sátortábor'], lounger: ['Tó', 'Sátortábor'], tent: ['Sátortábor'], campfire: ['Tűzrakóhely'], canoe: ['Tó'], tree: ['Erdő', 'Sátortábor'], rock: ['Erdő', 'Tó'], bush: ['Erdő'], sink: ['Fürdőház'] }),
  T('office', 'Az iroda', '💼', 'az irodában', 'az osztályvezető', ['Nyitott iroda', 'Tárgyaló', 'Konyha', 'Raktár', 'Főnöki iroda'], ['chair', 'sofa', 'rug'], ['officedesk', 'computer', 'printer', 'plant', 'shelf', 'coffeemaker', 'fridge'],
    { chair: ['Tárgyaló', 'Nyitott iroda'], sofa: ['Főnöki iroda'], rug: ['Főnöki iroda', 'Tárgyaló'], officedesk: ['Nyitott iroda', 'Főnöki iroda'], computer: ['Nyitott iroda', 'Főnöki iroda'], printer: ['Nyitott iroda'], plant: ['Tárgyaló', 'Főnöki iroda'], shelf: ['Raktár', 'Főnöki iroda'], coffeemaker: ['Konyha'], fridge: ['Konyha'] }),
  T('stadium', 'A stadion', '⚽', 'a stadionban', 'a pályamester', ['Pálya', 'Lelátó', 'Öltöző', 'Büfé', 'Edzőterem'], ['bench', 'ball', 'chair'], ['goal', 'locker', 'counter', 'sink', 'weights', 'plant'],
    { bench: ['Lelátó', 'Öltöző', 'Pálya'], ball: ['Pálya'], chair: ['Büfé', 'Lelátó'], goal: ['Pálya'], locker: ['Öltöző'], counter: ['Büfé'], sink: ['Öltöző'], weights: ['Edzőterem'], plant: ['Büfé'] }),
  T('market', 'A piac', '🧺', 'a piacon', 'az egyik árus', ['Zöldséges', 'Halas', 'Pékes', 'Virágos', 'Főtér'], ['bench', 'crate', 'chair'], ['apples', 'fish', 'counter', 'flowers', 'fountain', 'tree', 'barrel', 'bakeoven'],
    { bench: ['Főtér'], crate: ['Zöldséges', 'Halas', 'Pékes'], chair: ['Pékes', 'Főtér'], apples: ['Zöldséges'], fish: ['Halas'], counter: ['Pékes', 'Halas', 'Zöldséges'], flowers: ['Virágos'], fountain: ['Főtér'], tree: ['Főtér', 'Virágos'], barrel: ['Halas', 'Zöldséges'], bakeoven: ['Pékes'] }),
  T('circus', 'A cirkusz', '🎪', 'a cirkuszban', 'a zsonglőr', ['Porond', 'Nagysátor', 'Állatketrecek', 'Öltözők', 'Büfé'], ['bench', 'chair', 'rug'], ['tent', 'lion', 'balloon', 'popcorn', 'barrel', 'mirror', 'counter'],
    { bench: ['Nagysátor', 'Büfé'], chair: ['Öltözők', 'Büfé'], rug: ['Porond', 'Öltözők'], tent: ['Nagysátor'], lion: ['Állatketrecek'], balloon: ['Porond', 'Büfé'], popcorn: ['Büfé'], barrel: ['Állatketrecek', 'Nagysátor'], mirror: ['Öltözők'], counter: ['Büfé'] }),
  T('ship', 'A hajó', '🚢', 'a hajón', 'a kapitány', ['Fedélzet', 'Étkező', 'Kabin', 'Gépház', 'Medence'], ['lounger', 'chair', 'bed'], ['anchor', 'boat', 'barrel', 'table', 'plant', 'sink', 'counter'],
    { lounger: ['Fedélzet', 'Medence'], chair: ['Étkező', 'Fedélzet'], bed: ['Kabin'], anchor: ['Fedélzet'], boat: ['Fedélzet'], barrel: ['Gépház'], table: ['Étkező'], plant: ['Étkező', 'Kabin'], sink: ['Kabin'], counter: ['Étkező'] }),
  T('salon', 'A szépségszalon', '💈', 'a szépségszalonban', 'a fodrász', ['Várakozó', 'Fodrászat', 'Kozmetika', 'Raktár', 'Mosdó'], ['hairchair', 'chair', 'sofa'], ['mirror', 'sink', 'shelf', 'plant', 'counter', 'toilet'],
    { hairchair: ['Fodrászat', 'Kozmetika'], chair: ['Várakozó'], sofa: ['Várakozó'], mirror: ['Fodrászat'], sink: ['Fodrászat', 'Mosdó'], shelf: ['Raktár', 'Kozmetika'], plant: ['Várakozó'], counter: ['Várakozó'], toilet: ['Mosdó'] }),
  T('garage', 'Az autószerelő', '🚗', 'az autószerelőnél', 'a műhelyvezető', ['Műhely', 'Iroda', 'Várószoba', 'Raktár', 'Udvar'], ['chair', 'bench', 'rug'], ['car', 'toolbox', 'shelf', 'barrel', 'locker', 'computer', 'counter'],
    { chair: ['Várószoba', 'Iroda'], bench: ['Várószoba', 'Udvar'], rug: ['Iroda', 'Várószoba'], car: ['Műhely', 'Udvar'], toolbox: ['Műhely'], shelf: ['Raktár', 'Műhely'], barrel: ['Raktár', 'Udvar'], locker: ['Műhely', 'Raktár'], computer: ['Iroda'], counter: ['Iroda'] }),
  T('studio', 'A tévéstúdió', '📺', 'a tévéstúdióban', 'a műsorvezető', ['Stúdió', 'Maszk', 'Vágószoba', 'Büfé', 'Előtér'], ['sofa', 'chair', 'rug'], ['camera', 'mic', 'tv', 'mirror', 'computer', 'counter', 'plant', 'lamp'],
    { sofa: ['Stúdió', 'Előtér'], chair: ['Maszk', 'Vágószoba', 'Büfé'], rug: ['Stúdió', 'Előtér'], camera: ['Stúdió'], mic: ['Stúdió'], tv: ['Vágószoba', 'Előtér'], mirror: ['Maszk'], computer: ['Vágószoba'], counter: ['Büfé'], plant: ['Előtér', 'Büfé'], lamp: ['Stúdió'] }),
  T('manor', 'A kúria', '🏰', 'a kúriában', 'a háziúr', ['Előcsarnok', 'Könyvtár', 'Ebédlő', 'Konyha', 'Kert', 'Padlás'], ['sofa', 'chair', 'rug'], ['statue', 'painting', 'armor', 'table', 'plant', 'shelf', 'fireplace', 'tree'],
    { sofa: ['Könyvtár', 'Előcsarnok'], chair: ['Ebédlő', 'Könyvtár'], rug: ['Előcsarnok', 'Könyvtár', 'Ebédlő'], statue: ['Előcsarnok', 'Kert'], painting: ['Előcsarnok', 'Ebédlő'], armor: ['Előcsarnok'], table: ['Ebédlő', 'Konyha'], plant: ['Előcsarnok', 'Kert'], shelf: ['Könyvtár'], fireplace: ['Könyvtár', 'Ebédlő'], tree: ['Kert'] }),
  T('vet', 'Az állatorvos', '🐕', 'az állatorvosnál', 'az asszisztens', ['Rendelő', 'Várószoba', 'Kennel', 'Iroda', 'Udvar'], ['chair', 'bench', 'rug'], ['dogcage', 'sink', 'computer', 'table', 'plant', 'medcab', 'counter'],
    { chair: ['Várószoba', 'Iroda'], bench: ['Várószoba', 'Udvar'], rug: ['Várószoba'], dogcage: ['Kennel'], sink: ['Rendelő'], computer: ['Iroda', 'Rendelő'], table: ['Rendelő'], plant: ['Várószoba'], medcab: ['Rendelő'], counter: ['Várószoba'] }),
  T('factory', 'A gyár', '🏭', 'a gyárban', 'a műszakvezető', ['Gyártósor', 'Raktár', 'Iroda', 'Büfé', 'Udvar', 'Öltöző'], ['bench', 'chair', 'crate'], ['machine', 'conveyor', 'locker', 'barrel', 'computer', 'shelf', 'counter'],
    { bench: ['Öltöző', 'Udvar', 'Büfé'], chair: ['Iroda', 'Büfé'], crate: ['Raktár', 'Gyártósor'], machine: ['Gyártósor'], conveyor: ['Gyártósor'], locker: ['Öltöző'], barrel: ['Raktár', 'Udvar'], computer: ['Iroda'], shelf: ['Raktár'], counter: ['Büfé'] }),
]

/** A téma ikonja a lista kártyáján (slug → emoji). */
export const THEME_ICONS: Record<string, string> = Object.fromEntries([...THEMES.map((t) => [t.slug, t.icon]), ['last-call', '🍺'], ['sunken-mill', '⚙️']])

/** A `who` tárgyesete a „…holtan találták" mondathoz. */
const ACC: Record<string, string> = {
  'flower-store': 'az egyik alkalmazottat', playground: 'egy felnőttet', apartment: 'a lakástulajdonost', restaurant: 'a főszakácsot', school: 'az igazgatót', library: 'a könyvtárost',
  beach: 'a mentőőrt', zoo: 'az egyik gondozót', 'amusement-park': 'az üzemeltetőt', hotel: 'az igazgatót', bakery: 'a péket', hospital: 'az ügyeletes orvost', museum: 'a teremőrt',
  cinema: 'a jegyszedőt', gym: 'az edzőt', farm: 'a gazdát', station: 'a forgalmistát', airport: 'az egyik utast', camping: 'az egyik túrázót', office: 'az osztályvezetőt',
  stadium: 'a pályamestert', market: 'az egyik árust', circus: 'a zsonglőrt', ship: 'a kapitányt', salon: 'a fodrászt', garage: 'a műhelyvezetőt', studio: 'a műsorvezetőt',
  manor: 'a háziurat', vet: 'az asszisztenst', factory: 'a műszakvezetőt',
}

const SIZES: Record<number, [number, number]> = { 1: [5, 6], 2: [6, 7], 3: [7, 8], 4: [8, 9], 5: [9, 10] }
const WHEN = ['', ' – reggel', ' – este', ' – hétvégén', ' – ünnepnap', ' – zárás után', ' – nyitás előtt', ' – esős napon']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const story = (t: Theme, variant: number): string =>
  [
    `Zárás után ${t.place} ${t.who} holtan feküdt. Csak páran voltak ma bent.`,
    `${cap(t.place)} reggel ${ACC[t.slug]} holtan találták. Mindenki úgy tesz, mintha semmit sem látott volna.`,
    `Szombat este ${t.place} ${t.who} nem tért haza. Valaki egyedül maradt vele.`,
    `Ünnepnap volt ${t.place}, és ${t.who} többé nem szólalt meg. Nyom alig maradt, de a jelenlévők emlékeznek.`,
  ][variant % 4]!

/** Az 5 × 20 klasszikus pálya definíciói (a szint = a nehézség; a helyszín körbe-körbe). */
export function classicDefs(): ClassicDef[] {
  const out: ClassicDef[] = []
  for (const lv of LEVELS)
    for (let nn = 1; nn <= PER_LEVEL; nn++) {
      const g = (lv.d - 1) * PER_LEVEL + (nn - 1)
      const t = THEMES[g % THEMES.length]!
      const use = Math.floor(g / THEMES.length)
      const size = SIZES[lv.d]![nn % 2]!
      const k = Math.min(t.rooms.length, Math.max(3, Math.round(size * 0.7)))
      const r0 = (use * 2) % t.rooms.length
      const rooms = [...t.rooms.slice(r0), ...t.rooms.slice(0, r0)].slice(0, k)
      const id = `classic-${lv.d}-${String(nn).padStart(2, '0')}-${t.slug}`
      out.push({
        file: id, dir: 'classic', level: lv.d, no: nn, seed: `L${lv.d}N${nn}`, d: lv.d as Difficulty,
        opts: { id, mode: 'classic', title: `${t.title}${WHEN[(use + (g % THEMES.length)) % WHEN.length]}`, story: story(t, use + nn), size, rooms, stand: t.stand, block: t.block, objRooms: t.objRooms, murdoku: true, world: 'everyday' },
      })
    }
  return out
}

const bonus = (no: number, slug: string, d: Difficulty, size: number, title: string, story2: string, rooms: string[], stand: string[], block: string[], objRooms: Record<string, string[]>): ClassicDef => {
  const id = `bonus-${String(no).padStart(2, '0')}-${slug}`
  return { file: id, dir: 'bonus', seed: `B${no}`, d, opts: { id, mode: 'bonus', title, story: story2, size, rooms, stand, block, objRooms, murdoku: true, world: 'everyday' } }
}

export const BONUS: ClassicDef[] = [
  bonus(1, 'last-call', 1, 6, 'Utolsó Pohár', 'A Crossroads bár bezárt, a csapos azonban sosem ért haza. A bárpult mögött csak egy tele pohár maradt.',
    ['Söntés', 'Bokszok', 'Raktár', 'Mosdó', 'Hátsó sikátor'], ['stool', 'sofa', 'rug'], ['barrel', 'pool', 'sink', 'toilet'],
    { stool: ['Söntés'], sofa: ['Bokszok'], rug: ['Bokszok'], barrel: ['Raktár', 'Hátsó sikátor'], pool: ['Bokszok'], sink: ['Mosdó'], toilet: ['Mosdó'] }),
  bonus(2, 'sunken-mill', 4, 9, 'Az Elsüllyedt Malom', 'A mocsár visszaadta a malom régi őrét. A malomkerék azóta is forog, pedig a víz régen elapadt.',
    ['Malomkerék', 'Őrlőterem', 'Gabonapadlás', 'Molnárház', 'Stég', 'Mocsár', 'Fűzfás'], ['crate', 'bench', 'chair'], ['barrel', 'tree', 'table', 'fountain'],
    { crate: ['Őrlőterem', 'Gabonapadlás'], bench: ['Stég', 'Molnárház'], chair: ['Molnárház'], barrel: ['Őrlőterem', 'Gabonapadlás'], tree: ['Fűzfás', 'Mocsár'], table: ['Molnárház'], fountain: ['Malomkerék'] }),
]

/** Minden Klasszikus + bónusz definíció (a `author.test.ts` ebből dolgozik). */
export const CLASSICS: ClassicDef[] = [...classicDefs(), ...BONUS]
