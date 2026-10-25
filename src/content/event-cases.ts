import type { CastMember } from '../engine/generator'
import type { Difficulty } from '../shared/puzzle'
import type { EventDef } from './events'

/**
 * Az Esemény-világok ügyei: minden világnak 5 egymás utáni ügye van (növekvő méret és nehézség), mindegyiknek saját
 * áldozata, címe és története. Az áldozat a világ szereplő-készletéből (az eredeti áldozat + a gyanúsítottak) kerül ki:
 * az eredeti áldozat ilyenkor gyanúsítottként „beáll” a helyére, így nem kell új szereplő. A történetek helyszín-függetlenek
 * (a pályán csak a kiválasztott helyiségek szerepelnek), a világ szabályát a játék külön kiírja.
 */
export interface EventCase {
  /** Az áldozat neve a világ készletéből; elhagyva az eredeti áldozat. */
  v?: string
  title: string
  story: string
}

const SIZE_STEP = [-1, 0, 0, 1, 1]
const DIFF_STEP = [-1, 0, 1, 1, 2]
export const CASES_PER_WORLD = 5

/** Világonként (az `ev()` rövid neve szerint) az ügyek — az 1. ügy története a világ bevezetője (lásd `events.ts`). */
export const CASES: Record<string, EventCase[]> = {
  fnaf: [
    { title: 'Az éjjeliőr műszakja', story: '' },
    { v: 'Mike Schmidt', title: 'Hajnali hat óra', story: 'Mike Schmidt nem lépett ki a pizzéria ajtaján, amikor hajnalban kisütött a nap. A kamerák az egész éjszakát felvették — de egyszerre csak egy szobát mutatnak.' },
    { v: 'A Marionett', title: 'Elnémult zenedoboz', story: 'A zenedoboz elhallgatott, A Marionett pedig mozdulatlanul hever a padlón. Valaki nem húzta fel időben — vagy éppen azért nem.' },
    { v: 'Golden Freddy', title: 'Az aranyszínű árnyék', story: 'Golden Freddy a sötétből bukkant elő, és nem kelt fel többé. Senki sem tudja, ki volt vele utoljára.' },
    { v: 'Foxy', title: 'Mögötte a függöny', story: 'Amikor a kamerák újra visszajöttek, Foxy már nem mozdult. A fények közben többször is villogtak — valaki a sötétben futott.' },
  ],
  'poppy-playtime': [
    { title: 'A zöld kéz', story: '' },
    { v: 'Bunzo Bunny', title: 'Üres dobszó', story: 'Bunzo Bunny dobja elnémult, ő maga pedig a játékgyár folyosóján fekszik. A szalagok még mindig mennek, mintha mi sem történt volna.' },
    { v: 'Mommy Long Legs', title: 'Hosszú karok', story: 'Mommy Long Legs a karjaival sem érte el, aki végzett vele. A zöld kéz mégis tudott valamit — a gyanúsítottak viszont nem mind.' },
    { v: 'CatNap', title: 'Nappali álom', story: 'CatNap elaludt, de nem ébredt fel többé. A gáz szaga még a szellőzőben lebeg, a játékok pedig hallgatnak.' },
    { v: 'Poppy', title: 'A baba utolsó szava', story: 'Poppy a vitrin mellett fekszik, a gyár pedig egész éjjel zúgott. Valaki elvette a hangját.' },
  ],
  'resident-evil-2': [
    { title: 'Mr. X kalapja', story: '' },
    { v: 'Brian Irons', title: 'A kapitány irodája', story: 'Brian Irons a saját irodájában maradt, a titkos ajtó pedig nyitva áll. A kulcsok mindkét irányba nyitnak — és mindkét irányba figyelnek.' },
    { v: 'Marvin Branagh', title: 'Az utolsó rádióüzenet', story: 'Marvin Branagh az utolsó üzenetét rádión adta le, aztán csend lett. A rendőrség folyosói éjszaka másként néznek ki.' },
    { v: 'Annette Birkin', title: 'A labor titkai', story: 'Annette Birkin kutatási jegyzetei szétszóródtak a földön. Aki a laborból kijutott, nem mondta el, mit látott.' },
    { v: 'Ada Wong', title: 'A kampós kötél', story: 'Ada Wong kampós kötele a korláton lóg, ő maga viszont a földön fekszik. Senki sem tudja, kinek dolgozott valójában.' },
  ],
  'alien-isolation': [
    { title: 'A szellőző csúszása', story: '' },
    { v: 'Marlow', title: 'Zárt ajtó mögött', story: 'Marlow a rendszerek közt dolgozott, amikor az áram megint kimaradt. A mozgásérzékelő pittyeg, de nevet nem mond.' },
    { v: 'Waits', title: 'Riasztás után', story: 'Waits ott maradt, ahol a riasztás megszólalt. A szállítókocsi még mindig az ajtó előtt áll.' },
    { v: 'Ricardo', title: 'Késő jelentés', story: 'Ricardo nem jelentkezett be a műszak végén. A mozgásérzékelő jelzett — csak éppen nem neki.' },
    { v: 'Nina Taylor', title: 'A hívás megszakadt', story: 'Nina Taylor hangja félbeszakadt a rádióban, aztán sisteregni kezdett. A Sevastopol állomás újra hallgat.' },
  ],
  'until-dawn': [
    { title: 'A Wendigo éjszakája', story: '' },
    { v: 'Emily', title: 'Az első sikoly', story: 'Emily kiabált, de a hegy visszhangot sem küldött. A totemek a kabin körül ugyanúgy állnak, mint reggel.' },
    { v: 'Jessica', title: 'Zárt kabinajtó', story: 'Jessica bezárkózott, amikor a fények kialudtak. Reggelre az ajtó nyitva volt — belülről.' },
    { v: 'Matt', title: 'Elmosódott nyomok', story: 'Matt nyomai a hóban a kabinig vezetnek, onnan már nem. A totemek mellett állók többet látnak.' },
    { v: 'Josh', title: 'A rejtett hang', story: 'Josh a kabinban maradt, amikor kialudt a villany. A hajnal közeledik — és vele az igazság.' },
  ],
  'dead-space': [
    { title: 'A Hunter maradt', story: '' },
    { v: 'Terrence Kyne', title: 'A néma folyosó', story: 'Terrence Kyne a gépház melletti folyosón maradt, ahol a lámpák villognak. A nyomásmentes szekciók ajtaja nyitva áll.' },
    { v: 'Hans Tiedemann', title: 'A főmérnök naplója', story: 'Hans Tiedemann naplója félbeszakadt, ő maga a padlón fekszik. Csak a páncélosok mehettek utána.' },
    { v: 'Challus Mercer', title: 'A biztonsági főnök', story: 'Challus Mercer sosem bízott a hajó vezetőiben. Most nem bízhat többé senkiben — a lámpák kialudtak.' },
    { v: 'Benjamin Mathius', title: 'A kapitány utolsó parancsa', story: 'Benjamin Mathius kiadta az utolsó parancsot, aztán csend lett. Az Ishimura szekciói közül néhányba csak páncélosok léphetnek.' },
  ],
  outlast: [
    { title: 'Elemhiány', story: '' },
    { v: 'Jeremy Blaire', title: 'A lépcső alján', story: 'Jeremy Blaire a lépcső alján fekszik, a zseblámpa kezében még világít. A menedékház falai mindent láttak.' },
    { v: 'Father Martin', title: 'Elnémult harang', story: 'Father Martin imája félbeszakadt, a padok üresek. A sötétben csak a kurzorod fénye mutat utat.' },
    { v: 'Dr. Wernicke', title: 'Az orvos jegyzetei', story: 'Dr. Wernicke jegyzetei szétszórva hevernek a kórterem padlóján. Ki hordta ki a fiókokat?' },
    { v: 'Eddie Gluskin', title: 'Nyitott ajtók', story: 'Eddie Gluskin dolgozószobája mindig zárva volt, most tárva áll. Az elem fogy, a folyosók pedig hosszúak.' },
  ],
  'silent-hill-2': [
    { title: 'Pyramid Head', story: '' },
    { v: 'Eddie Dombrowski', title: 'A hűtőkamra', story: 'Eddie Dombrowski a hűtőkamra előtt maradt, a köd pedig bekúszott mögötte. A rádió recseg, a szavak elhalványulnak.' },
    { v: 'A Hazug Alak', title: 'Tükörszoba', story: 'A Hazug Alak sosem mutatta az arcát — most sem látjuk, ki vele végzett. A rádió egyes szavakat kitakar.' },
    { v: 'A Buborékfejű Ápolónő', title: 'Az éjszakai műszak', story: 'A Buborékfejű Ápolónő a folyosón állt, amikor a lámpák kialudtak. A köd mindent eltakar, a rádió pedig eltorzítja a nyomokat.' },
    { v: 'Angela Orosco', title: 'A lépcsőház alja', story: 'Angela Orosco a lépcsőházban várt valakire, aki sosem jött el. A rádió egy-egy szót kitakar.' },
  ],
  'dead-by-daylight': [
    { title: 'A Trapper kampói', story: '' },
    { v: 'Dwight Fairfield', title: 'Az első generátor', story: 'Dwight Fairfield utoljára a generátornál látták, ahonnan zaj hallatszott. A gyilkos viszont sosem hibázik így.' },
    { v: 'Claudette Morel', title: 'Gyógyító kéz', story: 'Claudette Morel elsősegély-csomagja üresen hever mellette. A kukoricás zizeg, a generátorok zúgnak.' },
    { v: 'David King', title: 'A harcos', story: 'David King utoljára még nevetett, aztán elnémult. A kukoricásban csak a nyomok maradtak.' },
    { v: 'Quentin Smith', title: 'Álmok szövete', story: 'Quentin Smith nem ébredt fel. Az Entitás birodalmában a generátorok zaja a legrosszabb tanú.' },
  ],
  'alan-wake': [
    { title: 'Az elme-kórház', story: '' },
    { v: 'Odin Anderson', title: 'A tó partján', story: 'Odin Anderson a Cauldron-tó partján maradt. A fény és a sötétség mezői közt a Birtokoltak csak sötétben állhatnak.' },
    { v: 'Barry Wheeler', title: 'Barry utolsó vicce', story: 'Barry Wheeler nem nevetett, amikor a lámpák kialudtak. A Birtokoltak csak sötét mezőn állhatnak.' },
    { v: 'Tor Anderson', title: 'A testvér árnyéka', story: 'Tor Anderson a villanyoszlop alatt fekszik, a fény már nem éri el. A Birtokoltak sötétben mozognak.' },
    { v: 'Pat Maine', title: 'A rádiós hangja', story: 'Pat Maine hangja elhallgatott a Rádióállomáson. A fény és a sötétség mezői kijelölik, hol állhatott a Birtokolt.' },
  ],
  'stranger-things': [
    { title: 'Starcourt, július 4.', story: '' },
    { v: 'Jim Hopper', title: 'A rendőrfőnök', story: 'Jim Hopper a bevásárlóközpont hátsó folyosóján maradt, mielőtt kialudtak a fények. A Fejjel lefelé világ csak a zseblámpád körül látszik.' },
    { v: 'Steve Harrington', title: 'Scoops Ahoy', story: 'Steve Harrington fagylaltos sapkája a pulton maradt, ő maga eltűnt. Az áramszünetben csak a kurzorod fénye világít.' },
    { v: 'Erica Sinclair', title: 'A játékterem', story: 'Erica Sinclair a játékteremből sosem ment el nyerés nélkül. Ma este mégis elnémultak a gépek.' },
    { v: 'Dustin Henderson', title: 'A rádióhívás', story: 'Dustin Henderson utolsó hívása a labor felől érkezett, aztán csend lett. A Fejjel lefelé világ sötétjében csak a zseblámpád fénye marad.' },
  ],
  'game-of-thrones': [
    { title: 'Az Éjkirály', story: '' },
    { v: 'Cersei Lannister', title: 'A bor és a méreg', story: 'Cersei Lannister a pohár mellett maradt, amikor a kandallók kialudtak. A Falon túlra csak páncélos mer menni.' },
    { v: 'Jaime Lannister', title: 'Az aranykéz', story: 'Jaime Lannister az aranykezével sem tudta megvédeni magát. Az éjszaka hidege mindenre ráfagyott.' },
    { v: 'Tyrion Lannister', title: 'Tyrion pohara', story: 'Tyrion Lannister utoljára még a borára koccintott, aztán a pohár kihullott a kezéből. A Fal túloldalára csak páncélos merészkedik.' },
    { v: 'Samwell Tarly', title: 'A könyvmoly', story: 'Samwell Tarly könyvei szétszórva hevernek a földön. Aki a Falon túlra ment, páncélt viselt.' },
  ],
  'rick-and-morty': [
    { title: 'Mr. Meeseeks', story: '' },
    { v: 'Jerry Smith', title: 'Jerry kimaradt', story: 'Jerry Smith a nappali kanapéján maradt, amikor megnyílt a portál. A zöld, kék és narancs portál mindkét irányba lát.' },
    { v: 'Birdperson', title: 'A madárember esküvője', story: 'Birdperson a Citadellából jött, és nem is jutott haza. A portálok mellett állók a szomszéd helyiséget is látják.' },
    { v: 'Squanchy', title: 'Squanch!', story: 'Squanchy a garázsban squanchelt, aztán csend lett. A portálok mindkét oldalra átlátnak.' },
    { v: 'Evil Morty', title: 'A szemtelen Morty', story: 'Evil Morty a Citadella tetején állt, most mégis a padlón fekszik. Egy dimenzióval odébb valaki nagyon nem ezt akarta.' },
  ],
  'vampire-diaries': [
    { title: 'A szüreti fesztivál', story: '' },
    { v: 'Alaric Saltzman', title: 'A tanár pohara', story: 'Alaric Saltzman pohara félig tele maradt a Grillben. A lámpák körül napfény van — a vámpírok csak árnyékban állhatnak.' },
    { v: 'Tyler Lockwood', title: 'Teliholdkor', story: 'Tyler Lockwood a lépcsőn feküdt, amikor kisütött a hold. A napfényes mezőket a vámpírok elkerülik.' },
    { v: 'Jeremy Gilbert', title: 'A szellem látogatása', story: 'Jeremy Gilbert utoljára a régi házban látták. A lámpák fénykörén kívül minden árnyék.' },
    { v: 'Matt Donovan', title: 'Az utolsó műszak', story: 'Matt Donovan a Grill pultja mögött maradt, amikor a lámpák elaludtak. A vámpírok csak árnyékban állhatnak.' },
  ],
  'kalandra-fel': [
    { title: 'A Lich sírboltja', story: '' },
    { v: 'Jégkirály', title: 'A korona nyoma', story: 'A Jégkirály koronája a jégen maradt, ő maga eltűnt. A térkép nem mutat mindent — néhány szereplőről csak távolság van.' },
    { v: 'Lumpy hercegnő', title: 'Lumpy, Lumpy!', story: 'Lumpy hercegnő a Cukorka Királyság szélén feküdt. A kard és BMO távolsága árulkodó nyom.' },
    { v: 'Rágógumi hercegnő', title: 'A laboratórium', story: 'Rágógumi hercegnő laboratóriumában feldőltek a lombikok. A térkép távolságokat mutat — iránytól függetlenül.' },
    { v: 'Marceline', title: 'A basszusgitár', story: 'Marceline basszusgitárja a fűben hever. A kard és BMO távolsága segít kideríteni, ki járt arra.' },
  ],
  twilight: [
    { title: 'A vámpír-követő', story: '' },
    { v: 'Jasper Hale', title: 'Az érzelmek mestere', story: 'Jasper Hale a kertben feküdt, amikor leszállt az eső. A totemek mellett Alice látomásai feltárulnak.' },
    { v: 'Rosalie Hale', title: 'Az autók szerelmese', story: 'Rosalie Hale a kedvenc autója mellett fekszik. A totemek közelében plusz nyom tárul fel.' },
    { v: 'Charlie Swan', title: 'A rendőrfőnök', story: 'Charlie Swan a halászbotjával a tópartra indult. Alice látomása szerint nem egyedül ment.' },
    { v: 'Carlisle Cullen', title: 'Az orvos', story: 'Carlisle Cullen sosem hagyta cserben a betegeit — most nem tudott magán segíteni. A totemek mellett látomások tárulnak fel.' },
  ],
  'the-walking-dead': [
    { title: 'A Kormányzó', story: '' },
    { v: 'Negan', title: 'Lucille', story: 'Negan baseballütője a földön hever, a szöges drót véres. A generátorok zaja odacsalja a sétálókat — a gyilkos nem állhat mellettük.' },
    { v: 'Carl Grimes', title: 'A kalap', story: 'Carl Grimes kalapja a verandán maradt. A generátor zaja mindent elárul.' },
    { v: 'Glenn Rhee', title: 'A futár', story: 'Glenn Rhee a kapuig sosem jutott. A generátorok zaja odavonzza a sétálókat — a gyilkos nem állhat mellettük.' },
    { v: 'Carol Peletier', title: 'Csendes konyha', story: 'Carol Peletier a konyhában fekszik, a tűz még ég. A generátor mellett álló zajt csap.' },
  ],
  'the-last-of-us': [
    { title: 'A Clicker', story: '' },
    { v: 'Bill', title: 'A csapdák mestere', story: 'Bill a saját csapdájába sétált. A spórák köde elhomályosítja a rádiót — egy-egy szó kiesik a nyomokból.' },
    { v: 'Henry', title: 'Két testvér', story: 'Henry a kisöccse mellett maradt a szálláson, ahol a rádió még sistergett. A spórák köde kitakarja a nyomok néhány szavát.' },
    { v: 'Marlene', title: 'A Szentjánosbogarak', story: 'Marlene a kórház felé indult, de nem ért oda. A rádió recseg, a szavak elmosódnak.' },
    { v: 'Abby Anderson', title: 'Hosszú út', story: 'Abby Anderson hosszú útra indult, és nem tért vissza. A spórák köde elnyeli a nyomok néhány szavát.' },
  ],
  'harry-potter': [
    { title: 'A Nagyterem', story: '' },
    { v: 'Draco Malfoy', title: 'A tiltott bájital', story: 'Draco Malfoy a sötét folyosón maradt, amikor kialudtak a fáklyák. A Tekergők Térképe egyszerre egy helyiséget mutat élesen.' },
    { v: 'Perselus Piton', title: 'A félvér herceg', story: 'Perselus Piton a sötétben fekszik, a térkép pedig hallgat. Válts helyiséget, a többi nyom elhalványul.' },
    { v: 'Hagrid', title: 'Nyitott ajtó', story: 'Hagrid az ajtó előtt feküdt, a kulcsai mellette. A Tekergők Térképe csak egy helyiséget mutat élesen.' },
    { v: 'Albus Dumbledore', title: 'A legmagasabb pont', story: 'Albus Dumbledore a legmagasabb pontról hagyta el a kastélyt. A Tekergők Térképe egyszerre csak egy helyiséget mutat.' },
  ],
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Egy világ-definícióból (`ev()` kimenete) a világ 5 egymás utáni ügye: növekvő méret és nehézség, saját áldozat, cím, történet. */
export function expandWorld(base: EventDef): EventDef[] {
  const slug = base.file.replace(/^event-\d+-/, '')
  const cases = CASES[slug]
  if (!cases) throw new Error(`nincsenek ügyek: ${slug}`)
  if (cases.length !== CASES_PER_WORLD) throw new Error(`${slug}: ${CASES_PER_WORLD} ügy kell`)
  const o = base.opts
  const pool: CastMember[] = [o.victim!, ...o.cast!]
  const baseSize = o.size!
  const allRooms = o.rooms!
  return cases.map((c, i) => {
    const victim = c.v ? pool.find((p) => p.name === c.v) : pool[0]
    if (!victim) throw new Error(`${slug}: nincs ilyen szereplő: ${c.v}`)
    // az eredeti áldozat gyanúsítottként a kiválasztott áldozat helyére áll
    const cast = c.v ? o.cast!.map((p) => (p === victim ? pool[0]! : p)) : o.cast!
    const size = clamp(baseSize + SIZE_STEP[i]!, 5, Math.min(10, cast.length + 1))
    const vac = new Set(o.vacuum ?? [])
    const keep = Math.min(allRooms.length, clamp(Math.round((allRooms.length * size) / baseSize), 3, allRooms.length))
    // a kevesebb helyiségből a nyomásmentes termek sosem esnek ki; a többit ügyenként más-más sorrendben hagyjuk el
    const droppable = allRooms.filter((r) => !vac.has(r))
    const rot = droppable.map((_, j) => droppable[(j + i * 2) % droppable.length]!)
    const gone = new Set(rot.slice(0, allRooms.length - keep))
    const rooms = allRooms.filter((r) => !gone.has(r))
    const d = clamp(base.d + DIFF_STEP[i]!, 1, 5) as Difficulty
    const id = `${base.file}-${i + 1}`
    return {
      file: id,
      seed: `${base.seed}K${i + 1}`,
      d,
      game: base.game,
      opts: { ...o, id, title: c.title, story: c.story || o.story, size, rooms, cast, victim, ...(o.rich !== undefined ? { rich: richShare(d) } : {}) },
    }
  })
}

/** Nehézségenként az összetett nyomú szereplők célaránya (lásd `events.ts`). */
const richShare = (d: Difficulty): number => ({ 1: 0.4, 2: 0.55, 3: 0.65, 4: 0.75, 5: 0.8 })[d]
